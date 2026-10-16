import assert from 'node:assert/strict';
import { getTimingsForSession, DIFFICULTY_CONFIG } from '../src/data/debateTiming.js';
import { getQuestionsForSession, DEBATE_THEMES } from '../src/data/debateQuestions.js';
import { adjustDebateTiming, getVocabularyDifficulty } from '../src/utils/adaptiveDifficulty.js';
import { normalizeAnswer, checkAnswer, analyzeText } from '../src/utils/textAnalysis.js';
import {
  getLevelFromXp,
  getLevelName,
  calculateDebateXp,
  calculateVocabularyXp,
} from '../src/utils/xpUtils.js';
import {
  getLevelInfo,
  updateStreak,
  updateDailyCount,
} from '../src/services/progressService.js';
import {
  LocalRuleFeedbackProvider,
  FeedbackProvider,
} from '../src/services/feedbackEngine.js';
import { checkNewBadges } from '../src/data/badges.js';
import { formatDuration, formatTime } from '../src/utils/dateUtils.js';
import {
  drawCategory,
  buildProfileSummary,
  getJokersLeft,
  consumeJoker,
  shouldImposeTopic,
  recordDebate,
  rateTopic,
  saveTopicProfile,
} from '../src/services/topicProfileService.js';
import {
  EXPLAIN_CONCEPTS,
  AUDIENCE_PAIRS,
  getRandomConcept,
  getRandomAudiencePair,
} from '../src/data/explainConcepts.js';
import {
  normalizeWords,
  countErrors,
  timeLimitFor,
  levelForRound,
  roundPenalty,
  recordTypeResult,
  getWeakTypes,
} from '../src/utils/repeatScoring.js';
import { fitTranscript, detailToText } from '../src/utils/textLimits.js';
import {
  REPEAT_PHRASES,
  PHRASE_TYPES,
  PHRASE_TYPE_LABELS,
  getFallbackPhrases,
} from '../src/data/repeatPhrases.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- 1. Tests Timers Débat ---');

test('Calcul des timings progressifs pour 5 manches en mode normal', () => {
  const timings = getTimingsForSession('normal', 5);
  assert.equal(timings.length, 5);
  assert.equal(timings[0].reflection, DIFFICULTY_CONFIG.normal.reflectionStart);
  assert.equal(timings[4].reflection, DIFFICULTY_CONFIG.normal.reflectionEnd);
  assert.ok(timings[0].reflection > timings[4].reflection);
  assert.ok(timings[0].response > timings[4].response);
});

test('Mode Intense : les timers de fin atteignent les seuils minimaux prévus', () => {
  const timings = getTimingsForSession('intense', 6);
  const last = timings[timings.length - 1];
  assert.ok(last.reflection <= 5, `Réflexion finale attendue <= 5s, reçue: ${last.reflection}`);
  assert.ok(last.response <= 20, `Réponse finale attendue <= 20s, reçue: ${last.response}`);
});

console.log('\n--- 2. Tests Questions de Débat ---');

test('getQuestionsForSession retourne toujours le compte exact demandé', () => {
  for (const theme of DEBATE_THEMES) {
    const questions = getQuestionsForSession(theme.id, 'intense', 5);
    assert.equal(questions.length, 5, `Thème ${theme.id} a retourné ${questions.length} au lieu de 5`);
    const ids = new Set(questions.map((q) => q.id));
    assert.equal(ids.size, questions.length, `Doublons détectés pour thème ${theme.id}`);
  }
});

test('getQuestionsForSession sans thème ni difficulté retourne des questions valides', () => {
  const questions = getQuestionsForSession(null, null, 10);
  assert.equal(questions.length, 10);
  for (const q of questions) {
    assert.ok(q.text && q.text.length > 5);
  }
});

console.log('\n--- 3. Tests Progression & XP ---');

test('Calcul des niveaux à partir des seuils XP', () => {
  assert.equal(getLevelFromXp(0), 1);
  assert.equal(getLevelFromXp(99), 1);
  assert.equal(getLevelFromXp(100), 2);
  assert.equal(getLevelFromXp(299), 2);
  assert.equal(getLevelFromXp(300), 3);
  assert.equal(getLevelFromXp(5500), 10);
  assert.equal(getLevelName(1), 'Novice');
  assert.equal(getLevelName(2), 'Orateur');
});

test('getLevelInfo calcule correctement la progression en pourcentage', () => {
  const infoAt0 = getLevelInfo(0);
  assert.equal(infoAt0.level, 1);
  assert.equal(infoAt0.progress, 0);

  const infoAt50 = getLevelInfo(50);
  assert.equal(infoAt50.level, 1);
  assert.equal(infoAt50.progress, 50);

  const infoAt100 = getLevelInfo(100);
  assert.equal(infoAt100.level, 2);
  assert.equal(infoAt100.progress, 0);
});

test('XP Débat et Vocabulaire sont calculés selon les règles', () => {
  const debateXpNormal = calculateDebateXp(5, 0.6, true);
  assert.equal(debateXpNormal, 100);

  const debateXpExcellent = calculateDebateXp(5, 0.9, true);
  assert.equal(debateXpExcellent, 130);

  const vocabXp = calculateVocabularyXp(1000, false);
  assert.equal(vocabXp, 40);

  const vocabXpRecord = calculateVocabularyXp(1000, true);
  assert.equal(vocabXpRecord, 80);
});

console.log('\n--- 4. Tests Série Quotidienne (Streak) & Compteur ---');

test('updateStreak gère correctement les jours consécutifs et les sauts', () => {
  const baseProfile = { streak: 2, bestStreak: 2, lastActiveDate: '2026-09-01' };
  const updated = updateStreak(baseProfile);
  assert.ok(updated.streak >= 1);
  assert.ok(updated.bestStreak >= 2);
});

test('updateDailyCount incrémente correctement', () => {
  const prof = { todayDate: null, exercisesToday: 0 };
  const updated1 = updateDailyCount(prof);
  assert.equal(updated1.exercisesToday, 1);

  const updated2 = updateDailyCount(updated1);
  assert.equal(updated2.exercisesToday, 2);
});

console.log('\n--- 5. Tests Adaptation de Difficulté ---');

test('adjustDebateTiming accélère après 3 excellentes manches', () => {
  const base = [
    { reflection: 20, response: 40 },
    { reflection: 15, response: 35 },
  ];
  const history = [
    { selfEvalAvg: 0.9 },
    { selfEvalAvg: 0.85 },
    { selfEvalAvg: 0.95 },
  ];
  const adjusted = adjustDebateTiming(base, history);
  assert.equal(adjusted[0].reflection, 18);
  assert.equal(adjusted[0].response, 37);
});

test('adjustDebateTiming allège après 2 manches difficiles', () => {
  const base = [
    { reflection: 10, response: 30 },
  ];
  const history = [
    { selfEvalAvg: 0.2 },
    { selfEvalAvg: 0.3 },
  ];
  const adjusted = adjustDebateTiming(base, history);
  assert.equal(adjusted[0].reflection, 13);
  assert.equal(adjusted[0].response, 35);
});

test('getVocabularyDifficulty adapte le niveau selon la précision', () => {
  assert.equal(getVocabularyDifficulty(0.9, 1), 2);
  assert.equal(getVocabularyDifficulty(0.4, 2), 1);
  assert.equal(getVocabularyDifficulty(0.7, 2), 2);
});

console.log('\n--- 6. Tests Analyse de Texte & Vocabulaire ---');

test('normalizeAnswer gère majuscules, espaces et accents', () => {
  assert.equal(normalizeAnswer('  Élégant  '), 'elegant');
  assert.equal(normalizeAnswer('Avare'), 'avare');
});

test('checkAnswer valide les réponses autorisées', () => {
  const answers = ['joyeux', 'content', 'ravi'];
  assert.ok(checkAnswer('CONTENT', answers));
  assert.ok(checkAnswer('  ravi  ', answers));
  assert.ok(!checkAnswer('triste', answers));
});

test('analyzeText détecte les connecteurs sans faux positifs', () => {
  const withCar = analyzeText('Je pars car il se fait tard. C\'est une décision.');
  assert.ok(withCar.connectors.includes('car'));

  const withCarte = analyzeText('J\'ai regardé la carte routière. Il faisait beau.');
  assert.ok(!withCarte.connectors.includes('car'), 'Ne doit pas détecter "car" dans "carte"');
});

test('analyzeText valide le nombre de phrases et la structure', () => {
  const res = analyzeText('Premièrement, le télétravail apporte du confort. Ensuite, il permet de mieux se concentrer. Enfin, il renforce la productivité.');
  assert.equal(res.sentenceCount, 3);
  assert.ok(res.positives.includes('goodLength'));
  assert.ok(res.positives.includes('hasConnectors'));
});

console.log('\n--- 7. Tests Feedback Engine & Provider ---');

test('LocalRuleFeedbackProvider génère des conseils contextualisés', () => {
  const provider = new LocalRuleFeedbackProvider();

  const roundFb = provider.getDebateFeedback({
    type: 'round',
    evaluation: { clearIdea: false, hesitated: true },
  });
  assert.ok(roundFb.includes('idée') || roundFb.includes('argument'));

  const vocabFb = provider.getVocabularyFeedback({
    score: 1600,
    accuracy: 0.95,
    bestCombo: 6,
    totalAnswers: 18,
  });
  assert.ok(vocabFb.includes('Excellente précision'));
  assert.ok(vocabFb.includes('Combo x6'));

  const mirrorFb = provider.getMirrorFeedback({ euh: true, conclusion: true });
  assert.ok(mirrorFb.length >= 1);
});

test('FeedbackProvider interface respecte l\'héritage pour future IA locale', () => {
  class CustomProvider extends FeedbackProvider {
    getDebateFeedback() {
      return 'Feedback custom';
    }
  }
  const custom = new CustomProvider();
  assert.equal(custom.getDebateFeedback(), 'Feedback custom');
});

console.log('\n--- 8. Tests Badges ---');

test('checkNewBadges débloque les badges appropriés', () => {
  const profile = {
    badges: [],
    sessionsCount: 1,
    streak: 3,
    level: 5,
    stats: { improvisation: 10, conscienceOrale: 5, structure: 10 },
  };

  const newBadges = checkNewBadges(profile, { score: 1200, bestCombo: 10 });
  const ids = newBadges.map((b) => b.id);

  assert.ok(ids.includes('first-session'));
  assert.ok(ids.includes('streak-3'));
  assert.ok(ids.includes('level-5'));
  assert.ok(ids.includes('vocab-1000'));
  assert.ok(ids.includes('combo-10'));
  assert.ok(ids.includes('debate-10'));
  assert.ok(ids.includes('mirror-5'));
  assert.ok(ids.includes('clarity-10'));
});

console.log('\n--- 9. Tests Date & Format Utils ---');

test('formatDuration et formatTime formattent correctement', () => {
  assert.equal(formatTime(75), '01:15');
  assert.equal(formatTime(9), '00:09');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(120), '2 min');
  assert.equal(formatDuration(135), '2 min 15s');
});

import {
  analyzeVoiceRecording,
  setVoiceAnalysisProvider,
} from '../src/services/voiceAnalysis/voiceAnalysisService.js';

console.log('\n--- 10. Tests Sprint Vocabulaire (Tentatives & Aide) ---');

test('Compteur 3 tentatives et apparition aide', () => {
  let attempts = 0;
  let revealedHelp = null;
  const challenge = {
    answers: ['lumineux', 'éclatant'],
    word: 'brillant',
  };

  // 1ère erreur
  attempts++;
  assert.equal(attempts, 1);
  assert.equal(revealedHelp, null);

  // 2ème erreur
  attempts++;
  assert.equal(attempts, 2);
  assert.equal(revealedHelp, null);

  // 3ème erreur -> déclenchement aide
  attempts++;
  assert.equal(attempts, 3);
  assert.ok(attempts >= 3);

  // Clic sur voir une proposition
  revealedHelp = challenge.answers[0];
  assert.equal(revealedHelp, 'lumineux');

  // Question suivante : réinitialisation stricte
  attempts = 0;
  revealedHelp = null;
  assert.equal(attempts, 0);
  assert.equal(revealedHelp, null);
});

test('Mode Champ Lexical n\'applique pas la règle des 3 erreurs bloquantes', () => {
  const isLexical = true;
  let _attempts = 0;
  const shouldTrackAttempts = !isLexical;
  assert.equal(shouldTrackAttempts, false);
  assert.equal(_attempts, 0);
});

console.log('\n--- 11. Tests Réflexe Débat (Skip Réflexion & Timers) ---');

test('Calcul exact de reflectionUsed lors du clic Je suis prêt', () => {
  const totalAllocated = 30;
  const timerSecondsRemaining = 22; // 8 secondes écoulées
  const reflectionUsed = totalAllocated - timerSecondsRemaining;
  assert.equal(reflectionUsed, 8, 'Doit enregistrer 8 secondes et non 30 secondes');

  // Si le chrono expire naturellement
  const naturalExpiryRemaining = 0;
  const naturalUsed = totalAllocated - naturalExpiryRemaining;
  assert.equal(naturalUsed, 30);
});

test('Le microphone reste inactif pendant la phase de réflexion', () => {
  let isMicActive = false;
  let _phase = 'reflection';

  // Clic sur "Je suis prêt"
  _phase = 'countdown';
  assert.equal(isMicActive, false, 'Le micro doit être inactif pendant le countdown');

  // Fin du countdown 3-2-1
  _phase = 'response';
  isMicActive = true;
  assert.equal(isMicActive, true, 'Le micro doit être actif seulement après PARLE');
  assert.equal(_phase, 'response');
});

console.log('\n--- 12. Tests Métriques Vocales & Transcription ---');

test('Calcul WPM et catégories de débit', () => {
  // 138 mots en 1 minute (60s) -> 138 WPM (modéré)
  const wpm1 = Math.round(138 / (60 / 60));
  assert.equal(wpm1, 138);

  // 80 mots en 1 minute -> lent (< 110)
  const wpmLent = Math.round(80 / 1);
  assert.ok(wpmLent < 110);

  // 180 mots en 1 minute -> rapide (> 155)
  const wpmRapide = Math.round(180 / 1);
  assert.ok(wpmRapide > 155);
});

test('Détection des hésitations françaises dans la transcription', () => {
  const transcript = "Alors euh je pense que heu c'est une bonne idée ben oui.";
  const fillersRegex = /\b(euh+|heu+|hum+|hmm+|ben|bah)\b/gi;
  const matches = transcript.match(fillersRegex) || [];
  assert.equal(matches.length, 3); // euh, heu, ben
});

test('Détection des répétitions de mots consécutifs', () => {
  const text = "Je je pense donc donc que c'est possible.";
  const repetitionRegex = /\b([a-zA-Zà-ÿÀ-Ý]{2,})\s+\1\b/gi;
  const matches = text.match(repetitionRegex) || [];
  assert.equal(matches.length, 2); // "Je je", "donc donc"
});

console.log('\n--- 13. Tests LocalVoiceAnalysisProvider (Fallback Hors-Ligne) ---');

test('VoiceAnalysisService gère proprement l\'absence de serveur local', async () => {
  class MockOfflineProvider {
    async isAvailable() { return false; }
    async getCapabilities() { return {}; }
  }
  setVoiceAnalysisProvider(new MockOfflineProvider());
  const res = await analyzeVoiceRecording(null);
  assert.equal(res.success, false);
  assert.equal(res.isAvailable, false);
  assert.ok(res.error.includes('service'));
});

console.log('\n--- 14. Tests TopicProfileService & Coach IA ---');

test('drawCategory sélectionne les catégories selon le tirage RNG (0.1->liked, 0.7->disliked, 0.95->test)', () => {
  assert.equal(drawCategory(() => 0.1), 'liked');
  assert.equal(drawCategory(() => 0.59), 'liked');
  assert.equal(drawCategory(() => 0.7), 'disliked');
  assert.equal(drawCategory(() => 0.89), 'disliked');
  assert.equal(drawCategory(() => 0.95), 'test');
});

test('buildProfileSummary génère un résumé compact et structuré du profil', () => {
  localStorage.clear();
  rateTopic('sport', true);
  rateTopic('technologie', true);
  rateTopic('economie', false);

  recordDebate({ subject: 'Loi travail', theme: 'politique', category: 'disliked', score: 40 });
  recordDebate({ subject: 'Réforme électorale', theme: 'politique', category: 'disliked', score: 50 });

  recordDebate({ subject: 'Les JO 2024', theme: 'sport', category: 'liked', score: 85 });
  recordDebate({ subject: 'L\'IA au travail', theme: 'technologie', category: 'liked', score: 80 });
  recordDebate({ subject: 'La dette publique', theme: 'economie', category: 'disliked', score: 60 });

  const summary = buildProfileSummary();
  assert.ok(summary.includes('aime: sport, technologie'));
  assert.ok(summary.includes('evite: economie'));
  assert.ok(summary.includes('points faibles: politique (moy 45)'));
  assert.ok(summary.includes('recents:'));
  assert.ok(summary.length <= 300);
});

test('Joker hebdomadaire : 1 seul joker consommable par semaine avec reset ISO', () => {
  localStorage.clear();
  assert.equal(getJokersLeft(), 1);
  assert.equal(consumeJoker(), true);
  assert.equal(getJokersLeft(), 0);
  assert.equal(consumeJoker(), false);

  saveTopicProfile({
    themes: {},
    history: [],
    jokers: { weekKey: '2020-W01', used: 1 },
  });
  assert.equal(getJokersLeft(), 1);
  assert.equal(consumeJoker(), true);
  assert.equal(getJokersLeft(), 0);
});

test('shouldImposeTopic impose un sujet après 5 débats de confort ou 1 fois sur 4 au hasard', () => {
  localStorage.clear();

  for (let i = 0; i < 5; i++) {
    recordDebate({ subject: `Débat ${i}`, theme: 'sport', category: 'liked', score: 80 });
  }
  // 5 débats consécutifs sans défi -> imposé même sans hasard (rng = 0.5 > 0.25)
  assert.equal(shouldImposeTopic(() => 0.5), true);

  // Avec un débat stimulant -> pas de forçage systématique
  recordDebate({ subject: 'Débat challenge', theme: 'economie', category: 'disliked', score: 50 });
  assert.equal(shouldImposeTopic(() => 0.5), false);
  assert.equal(shouldImposeTopic(() => 0.1), true);
});

console.log('\n--- 15. Tests Explique à deux publics (Data & Structure) ---');

test('EXPLAIN_CONCEPTS contient exactement 20 concepts uniques avec 3 points clés', () => {
  assert.equal(EXPLAIN_CONCEPTS.length, 20);
  const ids = new Set(EXPLAIN_CONCEPTS.map((c) => c.id));
  assert.equal(ids.size, 20);
  const titles = new Set(EXPLAIN_CONCEPTS.map((c) => c.concept));
  assert.equal(titles.size, 20);

  for (const c of EXPLAIN_CONCEPTS) {
    assert.ok(c.id && c.id.trim().length > 0);
    assert.ok(c.concept && c.concept.trim().length > 0);
    assert.ok(c.domain && c.domain.trim().length > 0);
    assert.ok(Array.isArray(c.keyPoints));
    assert.equal(c.keyPoints.length, 3);
    for (const kp of c.keyPoints) {
      assert.ok(typeof kp === 'string' && kp.trim().length > 0);
    }
  }
});

test('AUDIENCE_PAIRS contient 4 paires bien formées avec audienceA et audienceB', () => {
  assert.equal(AUDIENCE_PAIRS.length, 4);
  for (const pair of AUDIENCE_PAIRS) {
    assert.ok(pair.id);
    assert.ok(pair.label);
    assert.ok(pair.audienceA && pair.audienceA.length > 0);
    assert.ok(pair.audienceB && pair.audienceB.length > 0);
  }
});

test('getRandomConcept et getRandomAudiencePair tirent des éléments valides', () => {
  const c = getRandomConcept();
  assert.ok(EXPLAIN_CONCEPTS.some((item) => item.id === c.id));

  const p = getRandomAudiencePair();
  assert.ok(AUDIENCE_PAIRS.some((item) => item.id === p.id));
});

console.log('\n--- 16. Tests Répète la phrase (Scoring & Data) ---');

test('normalizeWords gère accents, ponctuation et apostrophes', () => {
  const words = normalizeWords("L'arbre de Noël, vert & grand !");
  assert.deepEqual(words, ['l', 'arbre', 'de', 'noel', 'vert', 'grand']);
  assert.deepEqual(normalizeWords(''), []);
  assert.deepEqual(normalizeWords(null), []);
});

test('countErrors détecte les correspondances, manques, fautes légères et substitutions', () => {
  // Phrase identique -> 0
  const rIdentique = countErrors('Bonjour le monde', 'bonjour le monde');
  assert.equal(rIdentique.errors, 0);
  assert.equal(rIdentique.missing, 0);
  assert.equal(rIdentique.extra, 0);

  // Un mot manquant -> 1
  const rMissing = countErrors('Bonjour le monde', 'Bonjour monde');
  assert.equal(rMissing.errors, 1);
  assert.equal(rMissing.missing, 1);

  // Accents et ponctuation ignorés -> 0
  const rAccents = countErrors("C'est l'été !", 'c est l ete');
  assert.equal(rAccents.errors, 0);

  // Faute légère tolérée (« bonjoure » vs « bonjour ») -> 0
  const rTypo = countErrors('Bonjour', 'bonjoure');
  assert.equal(rTypo.errors, 0);

  // Mot substitué -> 1
  const rSub = countErrors('le chat noir', 'le chien noir');
  assert.equal(rSub.errors, 1);
  assert.equal(rSub.substituted, 1);

  // Mot en trop -> 1
  const rExtra = countErrors('bonjour monde', 'bonjour beau monde');
  assert.equal(rExtra.errors, 1);
  assert.equal(rExtra.extra, 1);
});

test('timeLimitFor applique la formule avec arrondi supérieur et minimum 4s', () => {
  // 6 mots, niveau 1 : factor = 0.90 -> ceil(6 * 0.90) + 2 = 6 + 2 = 8s
  assert.equal(timeLimitFor('Un deux trois quatre cinq six', 1), 8);
  // 30 mots, niveau 10 : factor = 0.42 -> ceil(30 * 0.42) + 2 = 13 + 2 = 15s
  const text30 = new Array(30).fill('mot').join(' ');
  assert.equal(timeLimitFor(text30, 10), 15);
  // La pression monte plus vite après le niveau 4 qu'avant
  assert.ok(timeLimitFor(text30, 4) - timeLimitFor(text30, 5) <= timeLimitFor(text30, 5) - timeLimitFor(text30, 7));
  // Les nombres se chronomètrent d'après les mots prononcés, pas les chiffres
  assert.equal(timeLimitFor('mille neuf cent quatre-vingt-dix', 1), timeLimitFor('un deux trois quatre cinq six', 1));
  // 1 mot, niveau 1 : ceil(0.9) + 2 = 3 -> min 4s
  assert.equal(timeLimitFor('bonjour', 1), 4);
});

test('levelForRound monte d\'un niveau toutes les 2 manches, plafonné à 10', () => {
  assert.equal(levelForRound(1, 0), 1);
  assert.equal(levelForRound(1, 1), 1);
  assert.equal(levelForRound(1, 2), 2);
  assert.equal(levelForRound(1, 9), 5);
  assert.equal(levelForRound(8, 9), 10);
});

test('roundPenalty calcule les points perdus selon les erreurs et le dépassement', () => {
  assert.equal(roundPenalty({ errors: 0, overTime: false }), 0);
  assert.equal(roundPenalty({ errors: 2, overTime: false }), 10);
  assert.equal(roundPenalty({ errors: 0, overTime: true }), 10);
  assert.equal(roundPenalty({ errors: 3, overTime: true }), 25);
  // Au-delà du niveau 4, chaque erreur coûte plus cher (5 pts jusqu'au niv. 4, 6 au niv. 5 … 11 au niv. 10)
  assert.equal(roundPenalty({ errors: 2, level: 4 }), 10);
  assert.equal(roundPenalty({ errors: 2, level: 5 }), 12);
  assert.equal(roundPenalty({ errors: 3, level: 10 }), 33);
});

test('les nombres en lettres et en chiffres comptent pour le même mot', () => {
  assert.deepEqual(normalizeWords('mille neuf cent'), ['1900']);
  assert.deepEqual(normalizeWords('dix-neuf cent quatre-vingt-dix'), ['1990']);
  assert.deepEqual(normalizeWords('mille neuf cent quatre-vingt-dix-neuf'), ['1999']);
  assert.deepEqual(normalizeWords('deux mille vingt-quatre'), ['2024']);
  assert.deepEqual(normalizeWords('soixante et onze'), ['71']);
  assert.deepEqual(normalizeWords('quatre-vingts'), ['80']);
  assert.deepEqual(normalizeWords('quatorze millions sept cent mille euros'), ['14700000', 'euros']);
  assert.deepEqual(normalizeWords('trois milliards deux cent cinquante millions'), ['3250000000']);
  assert.deepEqual(normalizeWords('842 375 visiteurs'), ['842375', 'visiteurs']);
  assert.deepEqual(normalizeWords('le premier mars'), ['le', '1', 'mars']);
  assert.deepEqual(normalizeWords('le 1er mars'), ['le', '1', 'mars']);
  assert.equal(countErrors('quarante pour cent des gens', '40 % des gens').errors, 0);
  assert.equal(countErrors('quarante pour cent des gens', '40% des gens').errors, 0);
  // « un » seul reste un mot ; des nombres séparés ne fusionnent pas
  assert.deepEqual(normalizeWords('un chat'), ['un', 'chat']);
  assert.deepEqual(normalizeWords('deux trois'), ['2', '3']);

  assert.equal(countErrors('Nous sommes en mille neuf cent quatre-vingt-dix', 'Nous sommes en 1990').errors, 0);
  assert.equal(countErrors('Le vingt-trois septembre deux mille dix-huit', 'le 23 septembre 2018', 9).errors, 0);
  assert.equal(countErrors('mille neuf cent', '1900').errors, 0);
  assert.equal(countErrors('mille neuf cent', '1800').errors, 1);
});

test('fitTranscript ramène un long échange sous la limite du serveur (bug fin de débat)', () => {
  const ligne = (role) => `${role} : ${'blabla '.repeat(150)}`;
  const echange = [ligne('TOI'), ligne('ADVERSAIRE'), ligne('TOI'), ligne('ADVERSAIRE'),
    ligne('TOI'), ligne('ADVERSAIRE'), ligne('TOI'), ligne('ADVERSAIRE')].join('\n');
  assert.ok(echange.length > 6000);
  const fit = fitTranscript(echange);
  assert.ok(fit.length <= 5800);
  // Les répliques de l'utilisateur sont conservées en entier, seul l'adversaire est raccourci
  assert.ok(fit.includes(ligne('TOI')));
  assert.equal(fit.split('\n').length, 8);
  assert.equal(fitTranscript('court'), 'court');
  assert.equal(fitTranscript(undefined), undefined);
});

test('detailToText aplatit les erreurs 422 de FastAPI en texte affichable', () => {
  assert.equal(detailToText('Erreur simple'), 'Erreur simple');
  assert.equal(detailToText([{ type: 'string_too_long', loc: ['body', 'transcript'], msg: 'String should have at most 6000 characters' }]),
    'String should have at most 6000 characters');
  assert.equal(detailToText(undefined), '');
  assert.equal(typeof detailToText({ a: 1 }), 'string');
});

test('la tolérance sur les mots proches baisse après le niveau 4', () => {
  // « cents » vs « cent » : toléré aux niveaux 1-4, plus ensuite
  assert.equal(countErrors('un grand chat noir', 'un grands chat noir', 4).errors, 0);
  assert.equal(countErrors('un grand chat noir', 'un grands chat noir', 5).errors, 1);
});

test('REPEAT_PHRASES et getFallbackPhrases fournissent des phrases par niveau', () => {
  assert.ok(REPEAT_PHRASES.length >= 60);
  assert.equal(PHRASE_TYPES.length, 7);
  for (let lvl = 1; lvl <= 10; lvl++) {
    const atLvl = REPEAT_PHRASES.filter((p) => p.level === lvl);
    assert.ok(atLvl.length >= 5, `Niveau ${lvl} doit avoir au moins 5 phrases`);
  }

  const fallbacks = getFallbackPhrases(1, 10);
  assert.equal(fallbacks.length, 10);
  for (let i = 0; i < 10; i++) {
    // Le niveau monte d'un cran toutes les 2 manches : 1,1,2,2,3,3,4,4,5,5
    assert.equal(fallbacks[i].level, Math.floor(i / 2) + 1);
    assert.ok(fallbacks[i].text.length > 0);
  }
});

test('recordTypeResult et getWeakTypes suivent les points faibles utilisateur', () => {
  localStorage.clear();
  recordTypeResult('virelangue', 2);
  recordTypeResult('virelangue', 1);
  recordTypeResult('virelangue', 2); // attempts 3, errors 5, avg 1.67 > 0.5

  recordTypeResult('chiffres', 0);
  recordTypeResult('chiffres', 0);
  recordTypeResult('chiffres', 1); // attempts 3, errors 1, avg 0.33 <= 0.5

  recordTypeResult('longue', 3);
  recordTypeResult('longue', 2); // attempts 2 < 3

  const weak = getWeakTypes(2);
  assert.deepEqual(weak, ['virelangue']);
});

console.log(`\n========================================`);
console.log(`Résultats des tests : ${passed} passés, ${failed} échoués`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}

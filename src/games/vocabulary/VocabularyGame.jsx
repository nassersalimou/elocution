import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VOCABULARY_SYNONYMS } from '../../data/vocabularySynonyms';
import { VOCABULARY_ANTONYMS } from '../../data/vocabularyAntonyms';
import { LEXICAL_FIELDS } from '../../data/lexicalFields';
import { REFORMULATION_CHALLENGES } from '../../data/reformulationChallenges';
import { PRECISION_WORDS } from '../../data/precisionWords';
import { CONNECTEUR_CHALLENGES } from '../../data/connecteurChallenges';
import { checkAnswer, normalizeAnswer } from '../../utils/textAnalysis';
import { shuffleArray } from '../../utils/adaptiveDifficulty';
import { getVocabularyFeedback } from '../../services/feedbackEngine';
import { awardXp } from '../../services/progressService';
import { getProfile } from '../../services/storageService';
import { calculateVocabularyXp } from '../../utils/xpUtils';
import { getCoachMode } from '../../services/aiCoachService';
import useTimer from '../../hooks/useTimer';
import Icon from '../../components/ui/Icon';
import CoachModeToggle from '../../components/ui/CoachModeToggle';
import AiFeedbackPanel from '../../components/ui/AiFeedbackPanel';
import CoachBanner from '../../components/ui/CoachBanner';
import FeedbackBox from '../../components/ui/FeedbackBox';

const MODES = [
  { id: 'synonym', label: 'Synonymes', data: VOCABULARY_SYNONYMS },
  { id: 'antonym', label: 'Antonymes', data: VOCABULARY_ANTONYMS },
  { id: 'lexical', label: 'Champ lexical', data: LEXICAL_FIELDS },
  { id: 'precision', label: 'Mot précis', data: PRECISION_WORDS },
  { id: 'connecteur', label: 'Connecteur', data: CONNECTEUR_CHALLENGES },
  { id: 'reformulation', label: 'Reformulation', data: REFORMULATION_CHALLENGES },
];

const DURATIONS = [
  { value: 30, label: '30 sec' },
  { value: 60, label: '60 sec' },
  { value: 90, label: '90 sec' },
  { value: 0, label: 'Infini' },
];

function buildChallengeQueue() {
  const queue = [];
  for (const mode of MODES) {
    const items = shuffleArray(mode.data).slice(0, 8);
    for (const item of items) {
      queue.push({ mode: mode.id, item });
    }
  }
  return shuffleArray(queue);
}

function describeChallenge(current) {
  if (!current) return '';
  const { mode, item } = current;
  if (!item) return '';
  switch (mode) {
    case 'synonym':
      return `Synonyme de « ${item.word} »`;
    case 'antonym':
      return `Antonyme de « ${item.word} »`;
    case 'lexical':
      return `Champ lexical : ${item.theme}`;
    case 'precision':
      return `Mot plus précis : ${item.sentence}`;
    case 'connecteur':
      return `Connecteur : ${item.prompt}`;
    case 'reformulation':
      return `Reformuler « ${item.original} » sans ${(item.forbidden || []).join(', ')}`;
    default:
      return '';
  }
}

export function VocabularyGame({ quickMode = false, onComplete }) {
  const navigate = useNavigate();
  const [coachMode, setCoachMode] = useState(() => getCoachMode('vocabulary'));
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState(quickMode ? 'playing' : 'config');
  const [duration, setDuration] = useState(quickMode ? 60 : 60);
  const [queue] = useState(() => buildChallengeQueue());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState('');
  const [earnedXp, setEarnedXp] = useState(0);
  const [lexicalFound, setLexicalFound] = useState([]);
  const [flash, setFlash] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [revealedHelp, setRevealedHelp] = useState(null);
  const questionStart = useRef(0);
  const inputRef = useRef(null);
  const hasFinishedRef = useRef(false);

  const finishGameRef = useRef(null);

  const timer = useTimer(duration || 9999, {
    autoStart: phase === 'playing' && duration > 0,
    onComplete: () => {
      if (finishGameRef.current) finishGameRef.current();
    },
  });

  const current = queue[index % queue.length];
  const challenge = current?.item;

  const addLogEntry = useCallback((consigne, reponse, resultat) => {
    setLog((prev) => [...prev, { consigne, reponse, resultat }].slice(-40));
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      questionStart.current = Date.now();
      inputRef.current?.focus();
    }
  }, [phase, index]);

  const handleCorrect = useCallback((bonus = 0) => {
    const elapsed = (Date.now() - questionStart.current) / 1000;
    let speedBonus = 0;
    if (elapsed < 2) speedBonus = 50;
    else if (elapsed < 4) speedBonus = 25;

    const newCombo = combo + 1;
    const multiplier = Math.min(newCombo, 5);
    const points = (100 + speedBonus + bonus) * multiplier;

    setScore((s) => s + points);
    setCombo(newCombo);
    setBestCombo((b) => Math.max(b, newCombo));
    setCorrect((c) => c + 1);
    setTotal((t) => t + 1);
    setFlash('correct');
    setTimeout(() => setFlash(null), 400);
    setAttempts(0);
    setRevealedHelp(null);
    setIndex((i) => i + 1);
    setInput('');
    questionStart.current = Date.now();
  }, [combo]);

  const handleWrong = useCallback(() => {
    setCombo(0);
    setTotal((t) => t + 1);
    setFlash('error');
    setTimeout(() => setFlash(null), 400);
    if (current?.mode !== 'lexical') {
      setAttempts((a) => a + 1);
    }
  }, [current]);

  const handleRevealHelp = () => {
    if (!challenge) return;
    if (current) {
      addLogEntry(describeChallenge(current), input.trim(), 'aide demandée');
    }
    const { mode } = current;
    let helpText = '';
    if (mode === 'reformulation') {
      helpText = challenge.examples?.[0] || 'Reformule en exprimant l\'idée avec d\'autres mots.';
    } else if (challenge.answers && challenge.answers.length > 0) {
      helpText = challenge.answers[0];
    } else if (challenge.words && challenge.words.length > 0) {
      helpText = challenge.words[0];
    }
    setCombo(0);
    setRevealedHelp(helpText);
  };

  const handleNextFromHelp = () => {
    setCombo(0);
    setAttempts(0);
    setRevealedHelp(null);
    setIndex((i) => i + 1);
    setInput('');
    if (current?.mode === 'lexical') setLexicalFound([]);
    questionStart.current = Date.now();
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !challenge) return;

    const { mode } = current;
    const consigne = describeChallenge(current);

    if (mode === 'synonym' || mode === 'antonym') {
      if (checkAnswer(input, challenge.answers)) {
        addLogEntry(consigne, trimmed, 'juste');
        handleCorrect();
      } else {
        addLogEntry(consigne, trimmed, 'faux');
        handleWrong();
      }
    } else if (mode === 'lexical') {
      const norm = normalizeAnswer(input);
      if (lexicalFound.some((w) => normalizeAnswer(w) === norm)) return;
      if (challenge.words.some((w) => normalizeAnswer(w) === norm)) {
        setLexicalFound((f) => [...f, trimmed]);
        addLogEntry(consigne, trimmed, 'juste');
        handleCorrect(20);
      } else {
        addLogEntry(consigne, trimmed, 'faux');
        handleWrong();
      }
    } else if (mode === 'precision') {
      if (checkAnswer(input, challenge.answers)) {
        addLogEntry(consigne, trimmed, 'juste');
        handleCorrect();
      } else {
        addLogEntry(consigne, trimmed, 'faux');
        handleWrong();
      }
    } else if (mode === 'connecteur') {
      if (checkAnswer(input, challenge.answers)) {
        addLogEntry(consigne, trimmed, 'juste');
        handleCorrect();
      } else {
        addLogEntry(consigne, trimmed, 'faux');
        handleWrong();
      }
    } else if (mode === 'reformulation') {
      const norm = normalizeAnswer(input);
      const hasForbidden = challenge.forbidden?.some((f) => norm.includes(normalizeAnswer(f)));
      if (!hasForbidden && norm.length > 10) {
        addLogEntry(consigne, trimmed, 'juste');
        handleCorrect();
      } else {
        addLogEntry(consigne, trimmed, 'faux');
        handleWrong();
      }
    }
  };

  const handleSkip = () => {
    if (current) {
      addLogEntry(describeChallenge(current), '', 'passé');
    }
    setCombo(0);
    setAttempts(0);
    setRevealedHelp(null);
    setScore((s) => Math.max(0, s - 25));
    setIndex((i) => i + 1);
    setInput('');
    if (current?.mode === 'lexical') setLexicalFound([]);
  };

  const finishGame = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    const accuracy = total > 0 ? correct / total : 0;
    const profile = getProfile();
    const previousBest = profile.records?.vocabulary?.bestScore || 0;
    const isRecord = score > previousBest;
    const xp = calculateVocabularyXp(score, isRecord);
    setEarnedXp(xp);

    if (!onComplete) {
      awardXp(xp, {
        stat: 'vocabulaire',
        score,
        newRecord: isRecord,
        bestCombo,
        trainingSeconds: duration || 60,
        historyEntry: {
          game: 'vocabulary',
          details: `Score ${score} · Précision ${Math.round(accuracy * 100)}%`,
          duration: duration || 60,
        },
      });
    }
    setPhase('end');
  }, [total, correct, score, bestCombo, duration, onComplete]);

  useEffect(() => {
    finishGameRef.current = finishGame;
  }, [finishGame]);

  if (phase === 'config') {
    return (
      <div className="page game-container">
        <div className="game-header">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}><Icon name="back" size={20} /></button>
          <h1>Sprint Vocabulaire</h1>
        </div>
        <CoachBanner mode={coachMode} />
        <div style={{ marginBottom: '1.25rem' }}>
          <CoachModeToggle gameId="vocabulary" value={coachMode} onChange={setCoachMode} />
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Trouve le mot le plus vite possible. Combo et bonus de vitesse.</p>
        <label className="label">Durée</label>
        <div className="option-grid" style={{ marginBottom: '2rem' }}>
          {DURATIONS.map((d) => (
            <button key={d.value} type="button" className={`option-btn ${duration === d.value ? 'selected' : ''}`} onClick={() => setDuration(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setPhase('playing')}>C'est parti !</button>
      </div>
    );
  }

  if (phase === 'end') {
    const accuracy = total > 0 ? correct / total : 0;
    const feedbackText = getVocabularyFeedback({ score, accuracy, bestCombo, totalAnswers: total });
    const displayedXp = earnedXp || calculateVocabularyXp(score, false);

    return (
      <div className="page game-container animate-fade-in">
        <CoachBanner mode={coachMode} />
        <h1 style={{ textAlign: 'center' }}>Temps écoulé !</h1>
        <div className="score-display" style={{ textAlign: 'center', margin: '1.5rem 0' }}>{score}</div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{Math.round(accuracy * 100)}%</div><div className="stat-label">Précision</div></div>
          <div className="stat-card"><div className="stat-value">x{bestCombo}</div><div className="stat-label">Meilleur combo</div></div>
          <div className="stat-card"><div className="stat-value">+{displayedXp}</div><div className="stat-label">XP</div></div>
        </div>
        {coachMode !== 'ai' && <FeedbackBox>{feedbackText}</FeedbackBox>}
        {coachMode === 'ai' && log.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <AiFeedbackPanel
              game="vocabulary"
              subject="Sprint vocabulaire : synonymes, antonymes, champ lexical, mot précis, connecteurs, reformulation"
              transcript={log.map((e, i) => `${i + 1}. ${e.consigne} → « ${e.reponse} » (${e.resultat})`).join('\n')}
              metrics={{ score, precision: Math.round(accuracy * 100), meilleurCombo: bestCombo }}
            />
          </div>
        )}
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={() => onComplete ? onComplete() : navigate('/')}>
          {onComplete ? 'Continuer' : 'Retour'}
        </button>
      </div>
    );
  }

  const renderChallenge = () => {
    const { mode } = current;
    if (mode === 'synonym') return (<><span className="badge badge-violet">Synonyme</span><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0' }}>{challenge.word}</p></>);
    if (mode === 'antonym') return (<><span className="badge badge-blue">Antonyme</span><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0' }}>{challenge.word}</p></>);
    if (mode === 'lexical') return (<><span className="badge badge-green">Champ lexical</span><p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>THÈME : <strong>{challenge.theme}</strong></p><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lexicalFound.length} mot{lexicalFound.length !== 1 ? 's' : ''} trouvé{lexicalFound.length !== 1 ? 's' : ''}</p></>);
    if (mode === 'precision') return (<><span className="badge badge-orange">Mot plus précis</span><p style={{ fontSize: '1.1rem', margin: '1rem 0' }}>{challenge.sentence}</p></>);
    if (mode === 'connecteur') return (<><span className="badge badge-violet">Connecteur</span><p style={{ fontSize: '1rem', margin: '1rem 0' }}>{challenge.prompt}</p></>);
    if (mode === 'reformulation') return (<><span className="badge badge-blue">Reformulation</span><p style={{ fontSize: '1.1rem', margin: '1rem 0' }}>« {challenge.original} »</p><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reformule sans : {challenge.forbidden?.join(', ')}</p></>);
    return null;
  };

  return (
    <div className={`page game-container ${flash === 'correct' ? 'animate-correct' : ''} ${flash === 'error' ? 'animate-error' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <div className="score-display" style={{ fontSize: '1.5rem' }}>{score}</div>
          {combo > 1 && <div className="combo-display">COMBO x{combo}</div>}
        </div>
        {duration > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{timer.seconds}s</div>
            <div className="progress-bar" style={{ width: 80, marginTop: 4 }}>
              <div className="progress-bar-fill" style={{ width: `${timer.progress}%` }} />
            </div>
          </div>
        )}
        {duration === 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={finishGame}>Terminer</button>
        )}
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        {renderChallenge()}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="vocab-input-row">
          <input
            ref={inputRef}
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ta réponse..."
            autoComplete="off"
            autoFocus
            disabled={!!revealedHelp}
          />
        </div>
      </form>

      {!revealedHelp && attempts === 1 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Tentative 1 incorrecte — réessaie !
        </p>
      )}

      {!revealedHelp && attempts === 2 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Tentative 2 incorrecte — cherche un autre mot...
        </p>
      )}

      {!revealedHelp && attempts >= 3 && current?.mode !== 'lexical' && (
        <div className="card animate-fade-in" style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'var(--violet)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Besoin d'un coup de pouce ?</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRevealHelp}
            >
              {current.mode === 'reformulation' ? 'Voir un exemple' : 'Voir une proposition'}
            </button>
          </div>
        </div>
      )}

      {revealedHelp && (
        <div className="card animate-fade-in" style={{ marginTop: '0.75rem', padding: '1rem', borderColor: 'var(--violet)', background: 'rgba(139, 92, 246, 0.15)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            {current.mode === 'reformulation' ? 'Exemple possible :' : 'Réponse possible :'}
          </p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--violet-light)', marginBottom: '0.5rem' }}>
            {revealedHelp}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Challenge marqué comme aidé (combo réinitialisé, aucun point bonus).
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleNextFromHelp}
          >
            Question suivante
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleSkip}>Passer (-25)</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { timer.pause(); finishGame(); }}>Arrêter</button>
      </div>
    </div>
  );
}

export default VocabularyGame;

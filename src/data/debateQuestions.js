import { DEBATE_QUESTIONS_EXTRA } from './debateQuestionsExtra.js';
export const DEBATE_THEMES = [
  { id: 'debat', label: 'Débat' },
  { id: 'entretien', label: 'Entretien' },
  { id: 'quotidien', label: 'Quotidien' },
  { id: 'convaincre', label: 'Convaincre' },
  { id: 'defendre', label: 'Défendre une opinion' },
  { id: 'improvisation', label: 'Improvisation' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'culture', label: 'Culture générale' },
  { id: 'professionnel', label: 'Professionnel' },
  { id: 'pitch', label: 'Pitch & présentation' },
];

export const DEBATE_DIFFICULTIES = [
  { id: 'debutant', label: 'Débutant' },
  { id: 'normal', label: 'Normal' },
  { id: 'difficile', label: 'Difficile' },
  { id: 'intense', label: 'Intense' },
];

const BASE_DEBATE_QUESTIONS = [
  // Débat
  { id: 'q001', text: "Faut-il réduire la vitesse maximale sur les autoroutes à 110 km/h ?", theme: 'debat', difficulty: 'normal' },
  { id: 'q002', text: "Le télétravail doit-il rester la norme après la crise sanitaire ?", theme: 'debat', difficulty: 'normal' },
  { id: 'q003', text: "Faut-il interdire les réseaux sociaux aux moins de 16 ans ?", theme: 'debat', difficulty: 'difficile' },
  { id: 'q004', text: "L'école devrait-elle enseigner le codage dès le primaire ?", theme: 'debat', difficulty: 'debutant' },
  { id: 'q005', text: "Les élections devraient-elles être obligatoires ?", theme: 'debat', difficulty: 'difficile' },
  { id: 'q006', text: "Faut-il légaliser le cannabis en France ?", theme: 'debat', difficulty: 'intense' },
  { id: 'q007', text: "Le revenu universel est-il une bonne idée pour la société ?", theme: 'debat', difficulty: 'intense' },
  { id: 'q008', text: "La publicité devrait-elle être interdite à la télévision ?", theme: 'debat', difficulty: 'normal' },
  { id: 'q009', text: "Faut-il abaisser l'âge du vote à 16 ans ?", theme: 'debat', difficulty: 'normal' },
  { id: 'q010', text: "Les voitures électriques vont-elles sauver la planète ?", theme: 'debat', difficulty: 'debutant' },
  { id: 'q011', text: "Faut-il réintroduire le service militaire en France ?", theme: 'debat', difficulty: 'difficile' },
  { id: 'q012', text: "L'immigration est-elle une chance pour la France ?", theme: 'debat', difficulty: 'intense' },
  { id: 'q013', text: "Les notes à l'école devraient-elles être supprimées ?", theme: 'debat', difficulty: 'normal' },
  { id: 'q014', text: "L'industrie de la fast fashion devrait-elle être fortement réglementée ?", theme: 'debat', difficulty: 'intense' },

  // Entretien
  { id: 'q015', text: "Parlez-moi de vous en deux minutes.", theme: 'entretien', difficulty: 'debutant' },
  { id: 'q016', text: "Quelle est votre plus grande qualité professionnelle ?", theme: 'entretien', difficulty: 'debutant' },
  { id: 'q017', text: "Où vous voyez-vous dans cinq ans ?", theme: 'entretien', difficulty: 'debutant' },
  { id: 'q018', text: "Racontez-moi un échec et ce que vous en avez appris.", theme: 'entretien', difficulty: 'normal' },
  { id: 'q019', text: "Pourquoi voulez-vous rejoindre notre entreprise ?", theme: 'entretien', difficulty: 'normal' },
  { id: 'q020', text: "Comment gérez-vous le stress et les deadlines serrées ?", theme: 'entretien', difficulty: 'normal' },
  { id: 'q021', text: "Décrivez une situation où vous avez dû trancher sous la pression.", theme: 'entretien', difficulty: 'difficile' },
  { id: 'q022', text: "Quel est votre salaire attendu et comment l'avez-vous estimé ?", theme: 'entretien', difficulty: 'difficile' },
  { id: 'q023', text: "Avez-vous des questions pour nous ?", theme: 'entretien', difficulty: 'debutant' },
  { id: 'q024', text: "Qu'avez-vous fait de votre dernier week-end ?", theme: 'entretien', difficulty: 'debutant' },
  { id: 'q025', text: "Expliquez un projet dont vous êtes particulièrement fier.", theme: 'entretien', difficulty: 'normal' },
  { id: 'q026', text: "Comment réagiriez-vous si un collègue prenait le crédit de votre travail ?", theme: 'entretien', difficulty: 'intense' },
  { id: 'q027', text: "Pourquoi devrions-nous vous choisir plutôt qu'un autre candidat ?", theme: 'entretien', difficulty: 'intense' },
  { id: 'q028', text: "Comment décririez-vous votre style de management ?", theme: 'entretien', difficulty: 'normal' },

  // Quotidien
  { id: 'q029', text: "Que feriez-vous si vous aviez une journée entièrement libre ?", theme: 'quotidien', difficulty: 'debutant' },
  { id: 'q030', text: "Comment organisez-vous votre matinée idéale ?", theme: 'quotidien', difficulty: 'debutant' },
  { id: 'q031', text: "Préférez-vous cuisiner ou commander ? Justifiez votre choix.", theme: 'quotidien', difficulty: 'debutant' },
  { id: 'q032', text: "Quel superpouvoir choisiriez-vous pour améliorer votre quotidien ?", theme: 'quotidien', difficulty: 'debutant' },
  { id: 'q033', text: "Comment réagissez-vous quand quelqu'un vous coupe la parole ?", theme: 'quotidien', difficulty: 'normal' },
  { id: 'q034', text: "Décrivez votre quartier comme si vous le vendiez à un ami.", theme: 'quotidien', difficulty: 'normal' },
  { id: 'q035', text: "Que pensez-vous des applications de livraison de repas ?", theme: 'quotidien', difficulty: 'normal' },
  { id: 'q036', text: "Comment convaincriez-vous un ami réticent à essayer un nouveau restaurant ?", theme: 'quotidien', difficulty: 'normal' },
  { id: 'q037', text: "Racontez une mésaventure de transport du quotidien.", theme: 'quotidien', difficulty: 'normal' },
  { id: 'q038', text: "Comment gérez-vous une dispute avec un voisin bruyant ?", theme: 'quotidien', difficulty: 'difficile' },
  { id: 'q039', text: "Seriez-vous prêt à vivre sans smartphone pendant un mois ?", theme: 'quotidien', difficulty: 'difficile' },
  { id: 'q040', text: "Imaginez que vous perdiez vos clés en pleine nuit : que faites-vous ?", theme: 'quotidien', difficulty: 'difficile' },
  { id: 'q041', text: "Comment réorganiseriez-vous votre budget si vos factures augmentaient de 20 % ?", theme: 'quotidien', difficulty: 'intense' },
  { id: 'q042', text: "Vous héritez d'un appartement encombré : comment décidez-vous quoi garder ?", theme: 'quotidien', difficulty: 'intense' },

  // Convaincre
  { id: 'q043', text: "Convainquez votre entourage d'adopter le tri sélectif à la maison.", theme: 'convaincre', difficulty: 'debutant' },
  { id: 'q044', text: "Persuadez un ami de faire du sport avec vous régulièrement.", theme: 'convaincre', difficulty: 'debutant' },
  { id: 'q045', text: "Vendez-moi ce stylo sans le montrer.", theme: 'convaincre', difficulty: 'normal' },
  { id: 'q046', text: "Convainquez un voisin de signer une pétition pour plus d'arbres dans la rue.", theme: 'convaincre', difficulty: 'normal' },
  { id: 'q047', text: "Comment feriez-vous adhérer une équipe sceptique à un nouveau processus ?", theme: 'convaincre', difficulty: 'normal' },
  { id: 'q048', text: "Persuadez des parents de limiter le temps d'écran de leurs enfants.", theme: 'convaincre', difficulty: 'normal' },
  { id: 'q049', text: "Vendez un abonnement à un service que vous utilisez vous-même.", theme: 'convaincre', difficulty: 'debutant' },
  { id: 'q050', text: "Persuadez un public que lire vingt minutes par jour change la vie.", theme: 'convaincre', difficulty: 'normal' },
  { id: 'q051', text: "Comment convaincriez-vous un client mécontent de vous donner une seconde chance ?", theme: 'convaincre', difficulty: 'difficile' },
  { id: 'q052', text: "Persuadez un investisseur de financer une idée écologique peu rentable à court terme.", theme: 'convaincre', difficulty: 'difficile' },
  { id: 'q053', text: "Argumentez pour qu'un proche renonce à un achat impulsif inutile.", theme: 'convaincre', difficulty: 'difficile' },
  { id: 'q054', text: "Convainquez une municipalité d'installer des pistes cyclables dans votre ville.", theme: 'convaincre', difficulty: 'intense' },

  // Défendre une opinion
  { id: 'q055', text: "Défendez l'idée que les vacances scolaires devraient durer six semaines minimum.", theme: 'defendre', difficulty: 'debutant' },
  { id: 'q056', text: "Défendez le fait de dire non sans vous excuser.", theme: 'defendre', difficulty: 'debutant' },
  { id: 'q057', text: "Défendez le choix d'un métier passion plutôt que sécuritaire.", theme: 'defendre', difficulty: 'normal' },
  { id: 'q058', text: "Justifiez pourquoi l'humour a sa place au travail.", theme: 'defendre', difficulty: 'normal' },
  { id: 'q059', text: "Argumentez en faveur d'une semaine de quatre jours travaillés.", theme: 'defendre', difficulty: 'normal' },
  { id: 'q060', text: "Justifiez pourquoi l'échec est une étape nécessaire à la réussite.", theme: 'defendre', difficulty: 'normal' },
  { id: 'q061', text: "Défendez l'opinion que les réseaux sociaux font plus de bien que de mal.", theme: 'defendre', difficulty: 'difficile' },
  { id: 'q062', text: "Défendez l'idée que l'art devrait être accessible gratuitement à tous.", theme: 'defendre', difficulty: 'difficile' },
  { id: 'q063', text: "Argumentez contre la popularité comme critère de qualité.", theme: 'defendre', difficulty: 'difficile' },
  { id: 'q064', text: "Justifiez pourquoi l'argent ne fait pas le bonheur.", theme: 'defendre', difficulty: 'difficile' },
  { id: 'q065', text: "Défendez le droit à l'erreur dans un environnement professionnel exigeant.", theme: 'defendre', difficulty: 'intense' },
  { id: 'q066', text: "Défendez une opinion impopulaire que vous tenez sincèrement.", theme: 'defendre', difficulty: 'intense' },

  // Improvisation
  { id: 'q067', text: "Vous êtes bloqué dans un ascenseur avec un inconnu : engagez la conversation.", theme: 'improvisation', difficulty: 'debutant' },
  { id: 'q068', text: "Expliquez à un enfant de huit ans ce qu'est Internet.", theme: 'improvisation', difficulty: 'debutant' },
  { id: 'q069', text: "Inventez sur-le-champ une légende sur l'origine d'un objet dans la pièce.", theme: 'improvisation', difficulty: 'debutant' },
  { id: 'q070', text: "Décrivez votre ville à quelqu'un qui ne peut pas la voir.", theme: 'improvisation', difficulty: 'debutant' },
  { id: 'q071', text: "Vous découvrez que vous êtes maire pour une journée : que faites-vous ?", theme: 'improvisation', difficulty: 'normal' },
  { id: 'q072', text: "Vous avez deux minutes pour convaincre un Martien de visiter la Terre.", theme: 'improvisation', difficulty: 'normal' },
  { id: 'q073', text: "Donnez un discours de remerciement après avoir gagné un prix inattendu.", theme: 'improvisation', difficulty: 'normal' },
  { id: 'q074', text: "Annoncez à une assemblée que le prochain événement est annulé sans frustrer personne.", theme: 'improvisation', difficulty: 'normal' },
  { id: 'q075', text: "Vous découvrez une porte secrète : que se passe-t-il ensuite ?", theme: 'improvisation', difficulty: 'normal' },
  { id: 'q076', text: "Votre micro est resté ouvert en réunion : comment vous en sortez avec humour ?", theme: 'improvisation', difficulty: 'difficile' },
  { id: 'q077', text: "Vous êtes journaliste et interviewez votre double : menez l'échange.", theme: 'improvisation', difficulty: 'difficile' },
  { id: 'q078', text: "Vous remplacez un collègue malade pour une présentation dans dix minutes.", theme: 'improvisation', difficulty: 'intense' },

  // Personnel
  { id: 'q079', text: "Quel livre ou film vous a marqué et pourquoi ?", theme: 'personnel', difficulty: 'debutant' },
  { id: 'q080', text: "Quelle petite victoire récente vous rend fier ?", theme: 'personnel', difficulty: 'debutant' },
  { id: 'q081', text: "Quel talent caché aimeriez-vous développer ?", theme: 'personnel', difficulty: 'debutant' },
  { id: 'q082', text: "Comment décririez-vous votre personnalité à un inconnu en trois adjectifs ?", theme: 'personnel', difficulty: 'debutant' },
  { id: 'q083', text: "Quelle habitude voulez-vous abandonner cette année ?", theme: 'personnel', difficulty: 'normal' },
  { id: 'q084', text: "Qui vous inspire au quotidien et comment ?", theme: 'personnel', difficulty: 'normal' },
  { id: 'q085', text: "Racontez un moment où vous avez surmonté votre timidité.", theme: 'personnel', difficulty: 'normal' },
  { id: 'q086', text: "Si vous pouviez dîner avec n'importe qui, vivant ou mort, qui choisiriez-vous ?", theme: 'personnel', difficulty: 'normal' },
  { id: 'q087', text: "Quelle leçon de vos parents gardez-vous précieusement ?", theme: 'personnel', difficulty: 'normal' },
  { id: 'q088', text: "Qu'est-ce qui vous met en colère et comment le gérez-vous ?", theme: 'personnel', difficulty: 'difficile' },
  { id: 'q089', text: "Quel voyage vous a le plus transformé ?", theme: 'personnel', difficulty: 'difficile' },
  { id: 'q090', text: "Quel regret accepteriez-vous de partager en public ?", theme: 'personnel', difficulty: 'intense' },
  { id: 'q091', text: "Quelle croyance avez-vous changée ces dernières années ?", theme: 'personnel', difficulty: 'intense' },

  // Culture générale
  { id: 'q092', text: "Quel monument français recommanderiez-vous à un touriste étranger ?", theme: 'culture', difficulty: 'debutant' },
  { id: 'q093', text: "Quel paysage français représente le mieux notre identité ?", theme: 'culture', difficulty: 'debutant' },
  { id: 'q094', text: "La France est-elle encore une grande puissance culturelle ?", theme: 'culture', difficulty: 'normal' },
  { id: 'q095', text: "Pourquoi lire encore des classiques du XIXe siècle aujourd'hui ?", theme: 'culture', difficulty: 'normal' },
  { id: 'q096', text: "Quel événement historique français mérite d'être mieux enseigné ?", theme: 'culture', difficulty: 'normal' },
  { id: 'q097', text: "Qu'est-ce qu'un héros national à l'ère des réseaux sociaux ?", theme: 'culture', difficulty: 'normal' },
  { id: 'q098', text: "La gastronomie française est-elle en danger ?", theme: 'culture', difficulty: 'normal' },
  { id: 'q099', text: "Faut-il sauver les langues régionales en France ?", theme: 'culture', difficulty: 'difficile' },
  { id: 'q100', text: "L'intelligence artificielle peut-elle créer de l'art ?", theme: 'culture', difficulty: 'difficile' },
  { id: 'q101', text: "La science-fiction prédit-elle l'avenir ou le construit-elle ?", theme: 'culture', difficulty: 'difficile' },
  { id: 'q102', text: "Les fake news menacent-elles la démocratie ?", theme: 'culture', difficulty: 'difficile' },
  { id: 'q103', text: "Le patrimoine doit-il primer sur le développement urbain ?", theme: 'culture', difficulty: 'intense' },
  { id: 'q104', text: "Peut-on séparer l'artiste de l'œuvre ?", theme: 'culture', difficulty: 'intense' },

  // Professionnel
  { id: 'q105', text: "Que diriez-vous à un nouveau collaborateur lors de son premier jour ?", theme: 'professionnel', difficulty: 'debutant' },
  { id: 'q106', text: "Décrivez votre méthode pour prioriser une liste de tâches urgente.", theme: 'professionnel', difficulty: 'normal' },
  { id: 'q107', text: "Comment demanderiez-vous une augmentation avec tact ?", theme: 'professionnel', difficulty: 'normal' },
  { id: 'q108', text: "Quelle est votre définition du leadership ?", theme: 'professionnel', difficulty: 'normal' },
  { id: 'q109', text: "Décrivez comment vous déléguez sans micro-manager.", theme: 'professionnel', difficulty: 'normal' },
  { id: 'q110', text: "Comment réagissez-vous face à un feedback négatif que vous jugez injuste ?", theme: 'professionnel', difficulty: 'difficile' },
  { id: 'q111', text: "Expliquez un conflit professionnel que vous avez résolu.", theme: 'professionnel', difficulty: 'difficile' },
  { id: 'q112', text: "Comment annonceriez-vous une mauvaise nouvelle à votre équipe ?", theme: 'professionnel', difficulty: 'difficile' },
  { id: 'q113', text: "Comment gérez-vous une réunion qui part en vrille ?", theme: 'professionnel', difficulty: 'difficile' },
  { id: 'q114', text: "Comment introduisez-vous une idée innovante à des supérieurs conservateurs ?", theme: 'professionnel', difficulty: 'difficile' },
  { id: 'q115', text: "Comment motiveriez-vous une équipe en perte de vitesse ?", theme: 'professionnel', difficulty: 'intense' },
  { id: 'q116', text: "Que faire quand un client exige l'impossible dans un délai irréaliste ?", theme: 'professionnel', difficulty: 'intense' },

  // Pitch & présentation
  { id: 'q117', text: "Vendez votre expertise en trente secondes chrono.", theme: 'pitch', difficulty: 'debutant' },
  { id: 'q118', text: "Présentez une association locale qui mérite des dons.", theme: 'pitch', difficulty: 'debutant' },
  { id: 'q119', text: "Pitch : une formation en ligne sur l'éloquence pour tous.", theme: 'pitch', difficulty: 'debutant' },
  { id: 'q120', text: "Présentez un livre que tout le monde devrait lire.", theme: 'pitch', difficulty: 'debutant' },
  { id: 'q121', text: "Présentez votre projet professionnel en soixante secondes.", theme: 'pitch', difficulty: 'normal' },
  { id: 'q122', text: "Pitch : convainquez-nous d'investir dans une application de méditation.", theme: 'pitch', difficulty: 'normal' },
  { id: 'q123', text: "Pitch d'une idée de startup résolvant un problème du quotidien.", theme: 'pitch', difficulty: 'normal' },
  { id: 'q124', text: "Présentez brièvement pourquoi vous êtes la bonne personne pour ce poste.", theme: 'pitch', difficulty: 'normal' },
  { id: 'q125', text: "Convainquez un jury que votre événement mérite d'être financé.", theme: 'pitch', difficulty: 'difficile' },
  { id: 'q126', text: "Vendez un concept de restaurant en moins d'une minute.", theme: 'pitch', difficulty: 'difficile' },
  { id: 'q127', text: "Structurez un pitch investisseur pour une solution éco-responsable.", theme: 'pitch', difficulty: 'intense' },
  { id: 'q128', text: "Convainquez une audience sceptique d'adopter votre innovation.", theme: 'pitch', difficulty: 'intense' },

  // Questions supplémentaires pour renforcer la variété
  { id: 'q129', text: "Faut-il interdire les publicités ciblées sur Internet ?", theme: 'debat', difficulty: 'difficile' },
  { id: 'q130', text: "Comment expliqueriez-vous une rupture de contrat à un partenaire de confiance ?", theme: 'professionnel', difficulty: 'intense' },
  { id: 'q131', text: "Racontez une anecdote drôle sur un malentendu au quotidien.", theme: 'quotidien', difficulty: 'debutant' },
  { id: 'q132', text: "Convainquez un adolescent de s'intéresser à l'actualité.", theme: 'convaincre', difficulty: 'normal' },
];

// 132 sujets d'origine + 320 générés : environ 11 par thème et difficulté (au lieu de ~3).
export const DEBATE_QUESTIONS = [...BASE_DEBATE_QUESTIONS, ...DEBATE_QUESTIONS_EXTRA];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Sujets joués récemment (localStorage) : ils ne reviennent qu'une fois les autres épuisés.
const RECENT_QUESTIONS_KEY = 'elocution-recent-questions';
const RECENT_QUESTIONS_MAX = 120;

function getRecentQuestionIds() {
  try {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem(RECENT_QUESTIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function rememberQuestions(ids) {
  try {
    if (typeof localStorage === 'undefined') return;
    const merged = [...getRecentQuestionIds().filter((id) => !ids.includes(id)), ...ids];
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(merged.slice(-RECENT_QUESTIONS_MAX)));
  } catch {
    // Mémoire indisponible : simple tirage aléatoire.
  }
}

export function getQuestionsForSession(theme, difficulty, count = 5) {
  const chosen = [];
  const chosenIds = new Set();
  const recent = new Set(getRecentQuestionIds());

  const addQuestions = (pool, allowRecent) => {
    for (const q of shuffleArray(pool)) {
      if (chosen.length >= count) return;
      if (chosenIds.has(q.id) || (!allowRecent && recent.has(q.id))) continue;
      chosenIds.add(q.id);
      chosen.push(q);
    }
  };

  // Réserves par ordre de priorité : thème + difficulté exacts, même thème, même difficulté, tout.
  let exactMatches = DEBATE_QUESTIONS;
  if (theme) exactMatches = exactMatches.filter((q) => q.theme === theme);
  if (difficulty) exactMatches = exactMatches.filter((q) => q.difficulty === difficulty);
  const pools = [exactMatches];
  if (theme) pools.push(DEBATE_QUESTIONS.filter((q) => q.theme === theme));
  if (difficulty) pools.push(DEBATE_QUESTIONS.filter((q) => q.difficulty === difficulty));
  pools.push(DEBATE_QUESTIONS);

  // 1re passe : uniquement des sujets pas joués récemment ; 2e passe : on accepte les récents.
  for (const allowRecent of [false, true]) {
    for (const pool of pools) addQuestions(pool, allowRecent);
  }

  const result = chosen.slice(0, count);
  rememberQuestions(result.map((q) => q.id));
  return result;
}

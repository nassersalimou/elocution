export const CLARITY_EXERCISES = [
  {
    id: 1,
    ideas: ['télétravail', 'moins de transport', 'parfois isolement', 'meilleure concentration', 'dépend des personnes'],
    mission: 'Le télétravail est-il une bonne chose ?',
  },
  {
    id: 2,
    ideas: ['réseaux sociaux', 'connexion', 'comparaison', 'addiction', 'information rapide'],
    mission: 'Les réseaux sociaux nous rapprochent-ils vraiment ?',
  },
  {
    id: 3,
    ideas: ['sport', 'santé physique', 'discipline', 'temps', 'plaisir', 'compétition'],
    mission: 'Pourquoi faire du sport régulièrement ?',
  },
  {
    id: 4,
    ideas: ['lecture', 'imagination', 'concentration', 'temps passif', 'culture', 'évasion'],
    mission: 'La lecture est-elle encore utile aujourd\'hui ?',
  },
  {
    id: 5,
    ideas: ['voyage', 'découverte', 'coût', 'ouverture d\'esprit', 'empreinte carbone', 'souvenirs'],
    mission: 'Voyager est-il essentiel pour grandir ?',
  },
  {
    id: 6,
    ideas: ['apprentissage', 'erreurs', 'progression', 'patience', 'pratique', 'théorie'],
    mission: 'Comment apprend-on vraiment une nouvelle compétence ?',
  },
  {
    id: 7,
    ideas: ['argent', 'sécurité', 'bonheur limité', 'liberté', 'stress', 'valeurs'],
    mission: 'L\'argent fait-il le bonheur ?',
  },
  {
    id: 8,
    ideas: ['école', 'diplôme', 'compétences pratiques', 'réseau', 'coût', 'autodidacte'],
    mission: 'Le diplôme est-il indispensable pour réussir ?',
  },
  {
    id: 9,
    ideas: ['nature', 'bien-être', 'ville', 'pollution', 'calme', 'activités'],
    mission: 'Vaut-il mieux vivre en ville ou à la campagne ?',
  },
  {
    id: 10,
    ideas: ['technologie', 'productivité', 'distraction', 'automatisation', 'dépendance', 'innovation'],
    mission: 'La technologie nous rend-elle plus productifs ?',
  },
  {
    id: 11,
    ideas: ['échec', 'apprentissage', 'honte', 'résilience', 'motivation', 'chance'],
    mission: 'L\'échec est-il nécessaire pour réussir ?',
  },
  {
    id: 12,
    ideas: ['amitié', 'confiance', 'temps', 'loyauté', 'distance', 'soutien'],
    mission: 'Qu\'est-ce qui fait une vraie amitié ?',
  },
  {
    id: 13,
    ideas: ['médias', 'information', 'biais', 'rapidité', 'vérification', 'opinion'],
    mission: 'Peut-on faire confiance aux médias ?',
  },
  {
    id: 14,
    ideas: ['leadership', 'exemple', 'écoute', 'autorité', 'vision', 'équipe'],
    mission: 'Qu\'est-ce qu\'un bon leader ?',
  },
  {
    id: 15,
    ideas: ['créativité', 'règles', 'liberté', 'inspiration', 'travail', 'originalité'],
    mission: 'La créativité peut-elle s\'apprendre ?',
  },
  {
    id: 16,
    ideas: ['sommeil', 'performance', 'santé', 'temps perdu', 'récupération', 'rythme'],
    mission: 'Dormir suffisamment est-il un luxe ou une nécessité ?',
  },
  {
    id: 17,
    ideas: ['alimentation', 'santé', 'plaisir', 'régime', 'habitudes', 'coût'],
    mission: 'Manger sainement est-il accessible à tous ?',
  },
  {
    id: 18,
    ideas: ['langues', 'voyage', 'mémoire', 'effort', 'opportunités', 'culture'],
    mission: 'Faut-il apprendre plusieurs langues ?',
  },
  {
    id: 19,
    ideas: ['bénévolat', 'solidarité', 'temps', 'impact', 'expérience', 'engagement'],
    mission: 'Le bénévolat est-il une perte de temps ?',
  },
  {
    id: 20,
    ideas: ['intelligence', 'travail', 'talent', 'environnement', 'persévérance', 'chance'],
    mission: 'Le succès dépend-il plus du talent ou du travail ?',
  },
];

export function getRandomClarityExercise() {
  return CLARITY_EXERCISES[Math.floor(Math.random() * CLARITY_EXERCISES.length)];
}

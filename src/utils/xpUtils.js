export const XP_REWARDS = {
  EXERCISE_COMPLETE: 20,
  SESSION_COMPLETE: 50,
  NEW_RECORD: 40,
  EXCELLENT: 30,
  ROUND_COMPLETE: 10,
};

export const LEVELS = [
  { level: 1, name: 'Novice', xpRequired: 0 },
  { level: 2, name: 'Orateur', xpRequired: 100 },
  { level: 3, name: 'Réactif', xpRequired: 300 },
  { level: 4, name: 'Argumentateur', xpRequired: 600 },
  { level: 5, name: 'Persuasif', xpRequired: 1000 },
  { level: 6, name: 'Éloquent', xpRequired: 1500 },
  { level: 7, name: 'Maître des mots', xpRequired: 2200 },
  { level: 8, name: 'Orateur confirmé', xpRequired: 3000 },
  { level: 9, name: 'Expert', xpRequired: 4000 },
  { level: 10, name: 'Légende', xpRequired: 5500 },
];

export function getLevelFromXp(xp) {
  let level = 1;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) level = l.level;
  }
  return level;
}

export function getLevelName(level) {
  return LEVELS.find((l) => l.level === level)?.name || 'Novice';
}

export function calculateDebateXp(rounds, avgSelfEval, isComplete) {
  let xp = rounds * XP_REWARDS.ROUND_COMPLETE;
  if (isComplete) xp += XP_REWARDS.SESSION_COMPLETE;
  if (avgSelfEval >= 0.8) xp += XP_REWARDS.EXCELLENT;
  return xp;
}

export function calculateVocabularyXp(score, isRecord) {
  let xp = XP_REWARDS.EXERCISE_COMPLETE + Math.floor(score / 50);
  if (isRecord) xp += XP_REWARDS.NEW_RECORD;
  return xp;
}

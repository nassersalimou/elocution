export const BADGES = [
  { id: 'first-session', name: 'Premier pas', description: 'Terminer ta première session', icon: '🎯' },
  { id: 'streak-3', name: 'Régularité', description: '3 jours consécutifs', icon: '🔥' },
  { id: 'streak-7', name: 'Discipline', description: '7 jours consécutifs', icon: '⚡' },
  { id: 'debate-10', name: 'Débatteur', description: '10 sessions de débat', icon: '🎤' },
  { id: 'vocab-1000', name: 'Lexique actif', description: 'Score vocabulaire > 1000', icon: '📚' },
  { id: 'mirror-5', name: 'Miroir', description: '5 sessions miroir vocal', icon: '🪞' },
  { id: 'clarity-10', name: 'Architecte', description: '10 exercices de clarté', icon: '🏗️' },
  { id: 'level-5', name: 'Persuasif', description: 'Atteindre le niveau 5', icon: '⭐' },
  { id: 'combo-10', name: 'Enchaînement', description: 'Combo x10 au vocabulaire', icon: '💫' },
  { id: 'quick-session', name: 'Express', description: 'Terminer une session rapide', icon: '⏱️' },
];

export function checkNewBadges(profile, options = {}) {
  const earned = [];
  const has = (id) => profile.badges.includes(id);

  if (!has('first-session') && profile.sessionsCount >= 1) {
    earned.push(BADGES.find((b) => b.id === 'first-session'));
  }
  if (!has('streak-3') && profile.streak >= 3) {
    earned.push(BADGES.find((b) => b.id === 'streak-3'));
  }
  if (!has('streak-7') && profile.streak >= 7) {
    earned.push(BADGES.find((b) => b.id === 'streak-7'));
  }
  if (!has('level-5') && profile.level >= 5) {
    earned.push(BADGES.find((b) => b.id === 'level-5'));
  }
  if (!has('vocab-1000') && options.score >= 1000) {
    earned.push(BADGES.find((b) => b.id === 'vocab-1000'));
  }
  if (!has('combo-10') && options.bestCombo >= 10) {
    earned.push(BADGES.find((b) => b.id === 'combo-10'));
  }
  if (!has('debate-10') && ((profile.stats?.improvisation >= 10) || (profile.history || []).filter((h) => h.game === 'debate').length >= 10)) {
    earned.push(BADGES.find((b) => b.id === 'debate-10'));
  }
  if (!has('mirror-5') && ((profile.stats?.conscienceOrale >= 5) || (profile.history || []).filter((h) => h.game === 'mirror').length >= 5)) {
    earned.push(BADGES.find((b) => b.id === 'mirror-5'));
  }
  if (!has('clarity-10') && ((profile.stats?.structure >= 10) || (profile.history || []).filter((h) => h.game === 'clarity').length >= 10)) {
    earned.push(BADGES.find((b) => b.id === 'clarity-10'));
  }
  if (!has('quick-session') && options.isQuickSession) {
    earned.push(BADGES.find((b) => b.id === 'quick-session'));
  }

  return earned.filter(Boolean);
}

export function getBadgeById(id) {
  return BADGES.find((b) => b.id === id);
}

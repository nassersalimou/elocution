import { LEVELS, XP_REWARDS, getLevelFromXp } from '../utils/xpUtils.js';
import { getTodayKey, isYesterday } from '../utils/dateUtils.js';
import { getProfile, updateProfile, addHistoryEntry } from './storageService.js';
import { checkNewBadges } from '../data/badges.js';

export function getLevelInfo(xp) {
  const level = getLevelFromXp(xp);
  const currentLevel = LEVELS.find((l) => l.level === level) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === level + 1);
  const xpForCurrent = currentLevel.xpRequired;
  const xpForNext = nextLevel ? nextLevel.xpRequired : xpForCurrent;
  const progress = nextLevel ? ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100 : 100;
  return { level, name: currentLevel.name, progress: Math.min(100, Math.max(0, progress)), xpForNext, xpForCurrent };
}

export function updateStreak(profile) {
  const today = getTodayKey();
  if (profile.lastActiveDate === today) return profile;
  if (profile.lastActiveDate && isYesterday(profile.lastActiveDate)) {
    const streak = profile.streak + 1;
    return { ...profile, streak, bestStreak: Math.max(profile.bestStreak, streak), lastActiveDate: today };
  }
  return { ...profile, streak: 1, bestStreak: Math.max(profile.bestStreak || 0, 1), lastActiveDate: today };
}

export function updateDailyCount(profile) {
  const today = getTodayKey();
  if (profile.todayDate === today) {
    return { ...profile, exercisesToday: profile.exercisesToday + 1 };
  }
  return { ...profile, todayDate: today, exercisesToday: 1 };
}

export function awardXp(amount, options = {}) {
  const { stat, historyEntry, trainingSeconds = 0 } = options;
  let newBadges = [];

  const profile = updateProfile((p) => {
    let updated = updateStreak(p);
    updated = updateDailyCount(updated);
    updated = {
      ...updated,
      xp: updated.xp + amount,
      level: getLevelFromXp(updated.xp + amount),
      totalTrainingSeconds: updated.totalTrainingSeconds + trainingSeconds,
      sessionsCount: historyEntry ? updated.sessionsCount + 1 : updated.sessionsCount,
    };

    if (stat && updated.stats[stat] !== undefined) {
      updated.stats = { ...updated.stats, [stat]: updated.stats[stat] + 1 };
    }

    if (options.newRecord && amount >= XP_REWARDS.NEW_RECORD) {
      updated.bestScore = Math.max(updated.bestScore, options.score || 0);
    }

    const badges = checkNewBadges(updated, options);
    newBadges = badges.filter((b) => !updated.badges.includes(b.id));
    if (newBadges.length) {
      updated.badges = [...updated.badges, ...newBadges.map((b) => b.id)];
    }

    return updated;
  });

  if (historyEntry) {
    addHistoryEntry({ ...historyEntry, xp: amount });
  }

  return { profile, newBadges, xpGained: amount };
}

export function getDashboardStats() {
  const profile = getProfile();
  const levelInfo = getLevelInfo(profile.xp);
  return { profile, levelInfo };
}

export { getProfile, updateProfile };

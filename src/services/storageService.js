const STORAGE_KEY = 'eloquence-coach-data';

const DEFAULT_PROFILE = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: null,
  totalTrainingSeconds: 0,
  bestScore: 0,
  exercisesToday: 0,
  todayDate: null,
  sessionsCount: 0,
  bestStreak: 0,
  onboardingComplete: false,
  preferences: {
    soundEnabled: true,
    defaultDifficulty: 'normal',
  },
  stats: {
    reflexion: 0,
    structure: 0,
    vocabulaire: 0,
    improvisation: 0,
    conscienceOrale: 0,
  },
  records: {
    debate: { bestSelfEval: 0, fastestReflection: Infinity },
    vocabulary: { bestScore: 0, bestCombo: 0 },
    clarity: { bestScore: 0 },
    mirror: { sessionsCompleted: 0 },
  },
  badges: [],
  history: [],
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const data = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...data, stats: { ...DEFAULT_PROFILE.stats, ...data.stats }, records: { ...DEFAULT_PROFILE.records, ...data.records }, preferences: { ...DEFAULT_PROFILE.preferences, ...data.preferences } };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Impossible de sauvegarder le profil:', e);
  }
}

export function updateProfile(updater) {
  const profile = getProfile();
  const updated = typeof updater === 'function' ? updater(profile) : { ...profile, ...updater };
  saveProfile(updated);
  return updated;
}

export function resetProfile() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PROFILE };
}

export function addHistoryEntry(entry) {
  return updateProfile((profile) => {
    const history = [{ ...entry, id: Date.now(), date: new Date().toISOString() }, ...profile.history].slice(0, 100);
    return { ...profile, history };
  });
}

export { DEFAULT_PROFILE, STORAGE_KEY };

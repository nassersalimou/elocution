const STORAGE_KEY = 'elocution-topic-profile';
export const JOKERS_PER_WEEK = 1;

export function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const weekStr = String(weekNo).padStart(2, '0');
  return `${d.getUTCFullYear()}-W${weekStr}`;
}

const DEFAULT_TOPIC_PROFILE = {
  themes: {},
  history: [],
  jokers: {
    weekKey: '',
    used: 0,
  },
};

export function getTopicProfile() {
  try {
    if (typeof localStorage === 'undefined') {
      return JSON.parse(JSON.stringify(DEFAULT_TOPIC_PROFILE));
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_TOPIC_PROFILE));
    const data = JSON.parse(raw);
    const currentWeek = getIsoWeekKey();
    const jokers = data.jokers?.weekKey === currentWeek
      ? { weekKey: currentWeek, used: data.jokers.used || 0 }
      : { weekKey: currentWeek, used: 0 };

    return {
      themes: data.themes || {},
      history: Array.isArray(data.history) ? data.history : [],
      jokers,
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_TOPIC_PROFILE));
  }
}

export function saveTopicProfile(profile) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn('Impossible de sauvegarder le profil de sujets:', e);
  }
}

export function recordDebate({
  subject,
  theme,
  category,
  imposed = false,
  score = 0,
}) {
  const profile = getTopicProfile();
  const themeName = theme ? String(theme).trim() : 'Général';
  if (!profile.themes[themeName]) {
    profile.themes[themeName] = {
      likes: 0,
      dislikes: 0,
      debates: 0,
      scoreSum: 0,
    };
  }

  profile.themes[themeName].debates += 1;
  profile.themes[themeName].scoreSum += Number(score) || 0;

  const entry = {
    subject: subject || '',
    theme: themeName,
    category: category || 'liked',
    date: new Date().toISOString(),
    imposed: Boolean(imposed),
    liked: null,
    score: Number(score) || 0,
  };

  profile.history.push(entry);
  if (profile.history.length > 100) {
    profile.history = profile.history.slice(-100);
  }

  saveTopicProfile(profile);
  return entry;
}

export function rateTopic(theme, liked) {
  const profile = getTopicProfile();
  const themeName = theme ? String(theme).trim() : 'Général';
  if (!profile.themes[themeName]) {
    profile.themes[themeName] = {
      likes: 0,
      dislikes: 0,
      debates: 0,
      scoreSum: 0,
    };
  }

  if (liked) {
    profile.themes[themeName].likes += 1;
  } else {
    profile.themes[themeName].dislikes += 1;
  }

  for (let i = profile.history.length - 1; i >= 0; i--) {
    if (profile.history[i].theme === themeName) {
      profile.history[i].liked = Boolean(liked);
      break;
    }
  }

  saveTopicProfile(profile);
}

export function getLikedThemes() {
  const profile = getTopicProfile();
  return Object.entries(profile.themes)
    .filter(([, stats]) => stats.likes > stats.dislikes)
    .sort(([, a], [, b]) => (b.likes - b.dislikes) - (a.likes - a.dislikes))
    .map(([themeName]) => themeName);
}

export function getDislikedThemes() {
  const profile = getTopicProfile();
  return Object.entries(profile.themes)
    .filter(([, stats]) => stats.dislikes > stats.likes)
    .sort(([, a], [, b]) => (b.dislikes - b.likes) - (a.dislikes - a.likes))
    .map(([themeName]) => themeName);
}

export function getWeakThemes() {
  const profile = getTopicProfile();
  return Object.entries(profile.themes)
    .filter(([, stats]) => stats.debates >= 2 && stats.scoreSum / stats.debates < 60)
    .map(([themeName, stats]) => ({
      theme: themeName,
      avgScore: Math.round(stats.scoreSum / stats.debates),
      toString() {
        return this.theme;
      },
    }))
    .sort((a, b) => a.avgScore - b.avgScore);
}

export function drawCategory(rng = Math.random) {
  const r = typeof rng === 'function' ? rng() : Number(rng);
  if (r < 0.6) return 'liked';
  if (r < 0.9) return 'disliked';
  return 'test';
}

export function buildProfileSummary() {
  const profile = getTopicProfile();
  const liked = getLikedThemes();
  const disliked = getDislikedThemes();
  const weak = getWeakThemes();
  const recents = profile.history
    .slice(-3)
    .map((h) => h.subject)
    .filter(Boolean);

  const parts = [];
  if (liked.length > 0) {
    parts.push(`aime: ${liked.join(', ')}`);
  }
  if (disliked.length > 0) {
    parts.push(`evite: ${disliked.join(', ')}`);
  }
  if (weak.length > 0) {
    parts.push(`points faibles: ${weak.map((w) => `${w.theme} (moy ${w.avgScore})`).join(', ')}`);
  }
  if (recents.length > 0) {
    parts.push(`recents: ${recents.join(', ')}`);
  }

  const summary = parts.length > 0 ? parts.join(' ; ') : 'profil: nouveau debateur';
  return summary.length > 300 ? summary.slice(0, 300) : summary;
}

export function getRecentSubjects(n = 10) {
  const profile = getTopicProfile();
  return profile.history
    .slice(-n)
    .map((h) => h.subject)
    .filter(Boolean)
    .reverse();
}

export function shouldImposeTopic(rng = Math.random) {
  const profile = getTopicProfile();
  const lastDebates = profile.history.slice(-5);
  if (lastDebates.length >= 5) {
    const hasChallenging = lastDebates.some(
      (d) => d.category === 'disliked' || d.category === 'test'
    );
    if (!hasChallenging) {
      return true;
    }
  }
  const r = typeof rng === 'function' ? rng() : Number(rng);
  return r < 0.25;
}

export function getJokersLeft() {
  const profile = getTopicProfile();
  const currentWeek = getIsoWeekKey();
  if (profile.jokers?.weekKey !== currentWeek) {
    profile.jokers = { weekKey: currentWeek, used: 0 };
    saveTopicProfile(profile);
  }
  return Math.max(0, JOKERS_PER_WEEK - (profile.jokers?.used || 0));
}

export function consumeJoker() {
  const profile = getTopicProfile();
  const currentWeek = getIsoWeekKey();
  if (profile.jokers?.weekKey !== currentWeek) {
    profile.jokers = { weekKey: currentWeek, used: 0 };
  }
  if (profile.jokers.used < JOKERS_PER_WEEK) {
    profile.jokers.used += 1;
    saveTopicProfile(profile);
    return true;
  }
  return false;
}

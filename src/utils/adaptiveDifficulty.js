export function adjustDebateTiming(baseTimings, performanceHistory) {
  if (!performanceHistory.length) return baseTimings;

  const recent = performanceHistory.slice(-3);
  const avgEval = recent.reduce((s, r) => s + r.selfEvalAvg, 0) / recent.length;

  if (avgEval >= 0.8 && recent.length >= 3) {
    return baseTimings.map((t) => ({
      reflection: Math.max(3, t.reflection - 2),
      response: Math.max(15, t.response - 3),
    }));
  }

  if (avgEval < 0.4 && recent.length >= 2) {
    return baseTimings.map((t) => ({
      reflection: t.reflection + 3,
      response: t.response + 5,
    }));
  }

  return baseTimings;
}

export function getVocabularyDifficulty(successRate, currentLevel) {
  if (successRate > 0.85) return Math.min(3, currentLevel + 1);
  if (successRate < 0.5) return Math.max(1, currentLevel - 1);
  return currentLevel;
}

export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom(arr, count = 1) {
  const shuffled = shuffleArray(arr);
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
}

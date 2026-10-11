export const DIFFICULTY_CONFIG = {
  debutant: { reflectionStart: 40, reflectionEnd: 15, responseStart: 70, responseEnd: 40 },
  normal: { reflectionStart: 30, reflectionEnd: 10, responseStart: 60, responseEnd: 30 },
  difficile: { reflectionStart: 25, reflectionEnd: 5, responseStart: 50, responseEnd: 25 },
  intense: { reflectionStart: 20, reflectionEnd: 3, responseStart: 40, responseEnd: 15 },
};

export function getTimingsForSession(difficulty, roundCount) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const timings = [];

  for (let i = 0; i < roundCount; i++) {
    const progress = roundCount > 1 ? i / (roundCount - 1) : 0;
    const reflection = Math.round(config.reflectionStart + (config.reflectionEnd - config.reflectionStart) * progress);
    const response = Math.round(config.responseStart + (config.responseEnd - config.responseStart) * progress);
    timings.push({ round: i + 1, reflection, response });
  }

  return timings;
}

export const REFLECTION_TIPS = [
  'Trouve ton idée principale',
  'Cherche un exemple',
  'Prépare ta conclusion',
];

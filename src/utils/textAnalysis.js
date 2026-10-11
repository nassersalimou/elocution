const CONNECTORS = [
  'car', 'donc', 'cependant', 'néanmoins', 'pourtant', 'ainsi',
  'par exemple', 'en revanche', "d'abord", 'ensuite', 'enfin',
  'par conséquent', 'en réalité', 'toutefois', 'de plus', 'en outre',
  'par ailleurs', 'en effet', 'c\'est pourquoi', 'de ce fait',
];

export function analyzeText(text) {
  const trimmed = text.trim();
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);
  const lowerText = trimmed.toLowerCase();

  const foundConnectors = CONNECTORS.filter((c) => {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9à-ÿÀ-Ý])${escaped}([^a-zA-Z0-9à-ÿÀ-Ý]|$)`, 'i');
    return regex.test(lowerText);
  });
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 25);
  const hasPunctuation = /[.!?,;:]/.test(trimmed);
  const repeatedWords = words.filter((w, i) => words.indexOf(w) !== i && w.length > 3);
  const uniqueRatio = words.length > 0 ? uniqueWords.size / words.length : 0;

  const issues = [];
  const positives = [];

  if (trimmed.length < 30) issues.push('tooShort');
  if (trimmed.length > 800) issues.push('tooLong');
  if (!hasPunctuation) issues.push('noPunctuation');
  if (sentences.length < 2) issues.push('fewSentences');
  if (sentences.length >= 2 && sentences.length <= 4) positives.push('goodLength');
  if (foundConnectors.length > 0) positives.push('hasConnectors');
  if (longSentences.length > 0) issues.push('longSentences');
  if (uniqueRatio > 0.7 && words.length > 10) positives.push('variedVocab');
  if (repeatedWords.length > 2) issues.push('repetitions');

  return {
    sentenceCount: sentences.length,
    wordCount: words.length,
    connectors: foundConnectors,
    issues,
    positives,
    uniqueRatio,
    longSentences: longSentences.length,
  };
}

export function normalizeAnswer(str) {
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function checkAnswer(userAnswer, acceptedAnswers) {
  const normalized = normalizeAnswer(userAnswer);
  return acceptedAnswers.some((a) => normalizeAnswer(a) === normalized);
}

export function checkAnswerIncludes(userAnswer, acceptedAnswers) {
  const normalized = normalizeAnswer(userAnswer);
  return acceptedAnswers.some((a) => normalized.includes(normalizeAnswer(a)) || normalizeAnswer(a).includes(normalized));
}

/**
 * Utilitaires de notation et de mesure pour le jeu « Répète la phrase ».
 * Module pur (indépendant de React).
 */

const STATS_KEY = 'repeatTypeStats';

/**
 * Normalise un texte en liste de mots :
 * minuscules, sans accents, sans ponctuation, apostrophes en espace, mots non vides.
 * @param {string} text
 * @returns {string[]}
 */
export function normalizeWords(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Distance de Levenshtein au niveau des caractères.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function charLevenshtein(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const row = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) row[j] = j;

  for (let i = 1; i <= la; i++) {
    let prev = row[0];
    row[0] = i;
    const ca = a[i - 1];
    for (let j = 1; j <= lb; j++) {
      const temp = row[j];
      if (ca === b[j - 1]) {
        row[j] = prev;
      } else {
        row[j] = Math.min(prev, row[j], row[j - 1]) + 1;
      }
      prev = temp;
    }
  }
  return row[lb];
}

/**
 * Deux mots sont considérés égaux si strictement identiques
 * ou si leur similarité de caractères >= 0.8 (1 - levenshtein / longueur max).
 * @param {string} w1
 * @param {string} w2
 * @returns {boolean}
 */
export function areWordsSimilar(w1, w2) {
  if (w1 === w2) return true;
  const maxLen = Math.max(w1.length, w2.length);
  if (maxLen === 0) return true;
  const dist = charLevenshtein(w1, w2);
  const similarity = 1 - dist / maxLen;
  return similarity >= 0.8;
}

/**
 * Calcule la distance d'édition au niveau des mots entre la cible et la phrase répétée.
 * @param {string|string[]} target
 * @param {string|string[]} spoken
 * @returns {{ errors: number, missing: number, extra: number, substituted: number }}
 */
export function countErrors(target, spoken) {
  const targetWords = Array.isArray(target) ? target : normalizeWords(target);
  const spokenWords = Array.isArray(spoken) ? spoken : normalizeWords(spoken);

  const n = targetWords.length;
  const m = spokenWords.length;

  if (n === 0 && m === 0) {
    return { errors: 0, missing: 0, extra: 0, substituted: 0 };
  }
  if (n === 0) {
    return { errors: m, missing: 0, extra: m, substituted: 0 };
  }
  if (m === 0) {
    return { errors: n, missing: n, extra: 0, substituted: 0 };
  }

  // Matrice de programmation dynamique
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const isMatch = areWordsSimilar(targetWords[i - 1], spokenWords[j - 1]);
      const matchCost = isMatch ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost, // correspondance ou substitution
        dp[i - 1][j] + 1,             // mot manquant (suppression de target)
        dp[i][j - 1] + 1              // mot en trop (insertion dans spoken)
      );
    }
  }

  // Rétro-traçage pour catégoriser les erreurs
  let i = n;
  let j = m;
  let missing = 0;
  let extra = 0;
  let substituted = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && areWordsSimilar(targetWords[i - 1], spokenWords[j - 1])) {
      if (dp[i][j] === dp[i - 1][j - 1]) {
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substituted++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      missing++;
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      extra++;
      j--;
    } else {
      if (i > 0) {
        missing++;
        i--;
      } else if (j > 0) {
        extra++;
        j--;
      }
    }
  }

  const errors = missing + extra + substituted;
  return { errors, missing, extra, substituted };
}

/**
 * Calcule le temps limite en secondes pour répéter une phrase.
 * Formule : nombre de mots × (0.75 - 0.05 × (level - 1)) secondes, arrondi au supérieur, + 1, minimum 3.
 * @param {string} text
 * @param {number} level
 * @returns {number}
 */
// Le niveau monte toutes les 2 manches (et non à chaque manche : trop dur trop vite).
export function levelForRound(startLevel = 1, roundIndex = 0) {
  const safeStart = Math.max(1, Math.min(10, Number(startLevel) || 1));
  return Math.min(10, safeStart + Math.floor(Math.max(0, roundIndex) / 2));
}

// Temps pour répéter : 0,90 s par mot au niveau 1 → 0,54 s au niveau 10 (≈ 1,9 mot/s,
// rapide mais tenable ; l'ancienne formule exigeait 3,3 mots/s), + 2 s pour démarrer.
export function timeLimitFor(text, level = 1) {
  const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
  const words = normalizeWords(text);
  const wordCount = words.length;
  const factor = 0.9 - 0.04 * (safeLevel - 1);
  const rawSeconds = wordCount * factor;
  return Math.max(4, Math.ceil(rawSeconds) + 2);
}

/**
 * Calcule la pénalité de points perdus lors d'une manche.
 * Formule : errors × 5 + (overTime ? 10 : 0).
 * @param {{ errors?: number, overTime?: boolean }} param0
 * @returns {number}
 */
export function roundPenalty({ errors = 0, overTime = false } = {}) {
  return (Number(errors) || 0) * 5 + (overTime ? 10 : 0);
}

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Enregistre le résultat d'une manche pour un type de phrase dans le localStorage.
 * @param {string} type
 * @param {number} errors
 */
export function recordTypeResult(type, errors = 0) {
  if (!type) return;
  try {
    const storage = getStorage();
    if (!storage) return;
    const raw = storage.getItem(STATS_KEY);
    const stats = raw ? JSON.parse(raw) : {};
    if (!stats[type]) {
      stats[type] = { attempts: 0, errors: 0 };
    }
    stats[type].attempts = (stats[type].attempts || 0) + 1;
    stats[type].errors = (stats[type].errors || 0) + (Number(errors) || 0);
    storage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore les erreurs de stockage
  }
}

/**
 * Retourne les types de phrases constituant des points faibles :
 * au moins 3 essais, triés par moyenne d'erreurs décroissante, avec une moyenne > 0.5.
 * @param {number} max
 * @returns {string[]}
 */
export function getWeakTypes(max = 2) {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(STATS_KEY);
    if (!raw) return [];
    const stats = JSON.parse(raw);
    const candidates = Object.entries(stats)
      .filter(([_, data]) => data && (data.attempts || 0) >= 3)
      .map(([t, data]) => {
        const attempts = data.attempts || 0;
        const errs = data.errors || 0;
        const avg = attempts > 0 ? errs / attempts : 0;
        return { type: t, avg };
      })
      .filter((item) => item.avg > 0.5)
      .sort((a, b) => b.avg - a.avg);

    return candidates.slice(0, max).map((c) => c.type);
  } catch {
    return [];
  }
}

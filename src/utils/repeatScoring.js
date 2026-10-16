/**
 * Utilitaires de notation et de mesure pour le jeu « Répète la phrase ».
 * Module pur (indépendant de React).
 */

const STATS_KEY = 'repeatTypeStats';

// --- Nombres : « mille neuf cent » et « 1900 » doivent compter pour le même mot ---
// La transcription (Gemini ou Whisper) écrit souvent les nombres en chiffres alors que
// la phrase cible les écrit en lettres : on convertit les deux côtés en chiffres.

const UNITS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
};
const TEENS = {
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS = { vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
const SCALES = { mille: 1000, million: 1e6, millions: 1e6, milliard: 1e9, milliards: 1e9 };
const isCent = (w) => w === 'cent' || w === 'cents';
const NUMBER_WORDS = new Set([
  ...Object.keys(UNITS), ...Object.keys(TEENS), ...Object.keys(TENS), ...Object.keys(SCALES),
  'cent', 'cents',
]);

// Lit un nombre < 100 à partir de l'indice i : { v, n } (n = indice suivant) ou null.
function parseBelow100(t, i) {
  const w = t[i];
  if (w === undefined) return null;
  const unit = (k) => (t[k] in UNITS && UNITS[t[k]] > 0 ? UNITS[t[k]] : 0);
  const teenTail = (k, base) => { // « dix sept », « dix huit », « dix neuf »
    if (base === 10 && unit(k) >= 7) return { v: 10 + unit(k), n: k + 1 };
    return { v: base, n: k };
  };
  if (w === 'quatre' && (t[i + 1] === 'vingt' || t[i + 1] === 'vingts')) {
    const k = i + 2;
    if (t[k] in TEENS) {
      const r = teenTail(k + 1, TEENS[t[k]]);
      return { v: 80 + r.v, n: r.n };
    }
    if (unit(k)) return { v: 80 + unit(k), n: k + 1 };
    return { v: 80, n: k };
  }
  if (w in TENS) {
    const k = i + 1;
    if (t[k] === 'et' && (t[k + 1] === 'un' || t[k + 1] === 'une' || (w === 'soixante' && t[k + 1] === 'onze'))) {
      return { v: TENS[w] + (t[k + 1] === 'onze' ? 11 : 1), n: k + 2 };
    }
    if (w === 'soixante' && t[k] in TEENS) {
      const r = teenTail(k + 1, TEENS[t[k]]);
      return { v: 60 + r.v, n: r.n };
    }
    if (unit(k)) return { v: TENS[w] + unit(k), n: k + 1 };
    return { v: TENS[w], n: k };
  }
  if (w in TEENS) return teenTail(i + 1, TEENS[w]);
  if (w in UNITS) return { v: UNITS[w], n: i + 1 };
  return null;
}

// Lit un nombre < 1000 (formes « deux cent cinq » et « dix neuf cent »).
function parseBelow1000(t, i) {
  const p = parseBelow100(t, i);
  if (p && p.v >= 2 && isCent(t[p.n])) {
    const rest = parseBelow100(t, p.n + 1);
    return rest ? { v: p.v * 100 + rest.v, n: rest.n } : { v: p.v * 100, n: p.n + 1 };
  }
  if (isCent(t[i])) {
    const rest = parseBelow100(t, i + 1);
    return rest ? { v: 100 + rest.v, n: rest.n } : { v: 100, n: i + 1 };
  }
  return p;
}

// Lit un nombre complet à partir de l'indice i, ou null.
function parseNumber(t, i) {
  let total = 0;
  let k = i;
  let found = false;
  while (k < t.length) {
    const g = parseBelow1000(t, k);
    if (g && t[g.n] in SCALES) {
      total += g.v * SCALES[t[g.n]];
      k = g.n + 1;
      found = true;
      continue;
    }
    if (!g && t[k] === 'mille') { // « mille » seul = 1000
      total += 1000;
      k += 1;
      found = true;
      continue;
    }
    if (g) {
      total += g.v;
      k = g.n;
      found = true;
    }
    break;
  }
  return found ? { v: total, n: k } : null;
}

/**
 * Remplace les nombres écrits en lettres par leur forme en chiffres
 * (« mille neuf cent quatre vingt dix » → « 1990 »). « un » et « une » seuls restent des mots.
 * @param {string[]} words mots déjà normalisés
 * @returns {string[]}
 */
export function numbersToDigits(words) {
  const out = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    // « pour cent » reste tel quel : « 40 % » transcrit devient « 40 pour cent »
    if (NUMBER_WORDS.has(w) && !(isCent(w) && words[i - 1] === 'pour')) {
      const r = parseNumber(words, i);
      if (r && r.n > i) {
        const lone = r.n === i + 1 && (w === 'un' || w === 'une');
        if (!lone) {
          out.push(String(r.v));
          i = r.n;
          continue;
        }
      }
    }
    out.push(w);
    i++;
  }
  return out;
}

/**
 * Normalise un texte en liste de mots :
 * minuscules, sans accents, sans ponctuation, apostrophes en espace, mots non vides,
 * nombres en lettres convertis en chiffres, « 1er » → « 1 ».
 * @param {string} text
 * @returns {string[]}
 */
export function normalizeWords(text) {
  if (!text || typeof text !== 'string') return [];
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/(\d)[\s  .](?=\d{3}(?!\d))/g, '$1') // « 14 700 000 », « 1.900 » → collés
    .replace(/%/g, ' pour cent ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^1(er|ere)$/.test(w) || w === 'premier' ? '1' : w));
  return numbersToDigits(words);
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

// Tolérance sur les mots proches : large aux niveaux 1-4, stricte ensuite
// (au-delà du niveau 4, un mot de moins de 10 lettres doit être exact).
export function similarityThresholdFor(level = 1) {
  return Number(level) >= 5 ? 0.9 : 0.8;
}

/**
 * Deux mots sont considérés égaux si strictement identiques
 * ou si leur similarité de caractères >= seuil (1 - levenshtein / longueur max).
 * @param {string} w1
 * @param {string} w2
 * @param {number} threshold
 * @returns {boolean}
 */
export function areWordsSimilar(w1, w2, threshold = 0.8) {
  if (w1 === w2) return true;
  const maxLen = Math.max(w1.length, w2.length);
  if (maxLen === 0) return true;
  const dist = charLevenshtein(w1, w2);
  const similarity = 1 - dist / maxLen;
  return similarity >= threshold;
}

/**
 * Calcule la distance d'édition au niveau des mots entre la cible et la phrase répétée.
 * @param {string|string[]} target
 * @param {string|string[]} spoken
 * @returns {{ errors: number, missing: number, extra: number, substituted: number }}
 */
export function countErrors(target, spoken, level = 1) {
  const threshold = similarityThresholdFor(level);
  const similar = (a, b) => areWordsSimilar(a, b, threshold);
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
      const isMatch = similar(targetWords[i - 1], spokenWords[j - 1]);
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
    if (i > 0 && j > 0 && similar(targetWords[i - 1], spokenWords[j - 1])) {
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
 * @see timeLimitFor
 */
// Le niveau monte toutes les 2 manches (et non à chaque manche : trop dur trop vite).
export function levelForRound(startLevel = 1, roundIndex = 0) {
  const safeStart = Math.max(1, Math.min(10, Number(startLevel) || 1));
  return Math.min(10, safeStart + Math.floor(Math.max(0, roundIndex) / 2));
}

// Temps pour répéter : 0,90 s par mot au niveau 1 → 0,78 s au niveau 4, puis la pression
// monte nettement : 0,72 s au niveau 5 → 0,42 s au niveau 10 (≈ 2,4 mots/s, débit d'un
// locuteur à l'aise), + 2 s pour démarrer. Les nombres comptent pour les mots qu'on prononce.
export function timeLimitFor(text, level = 1) {
  const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
  const wordCount = typeof text === 'string' ? text.split(/[\s'’-]+/).filter(Boolean).length : 0;
  const factor = safeLevel <= 4 ? 0.9 - 0.04 * (safeLevel - 1) : 0.78 - 0.06 * (safeLevel - 4);
  const rawSeconds = wordCount * factor;
  return Math.max(4, Math.ceil(rawSeconds) + 2);
}

/**
 * Calcule la pénalité de points perdus lors d'une manche.
 * Formule : errors × (5 + max(0, level - 4)) + (overTime ? 10 : 0) :
 * une erreur coûte 5 pts jusqu'au niveau 4, puis 6 au niveau 5 … 11 au niveau 10.
 * @param {{ errors?: number, overTime?: boolean, level?: number }} param0
 * @returns {number}
 */
export function roundPenalty({ errors = 0, overTime = false, level = 1 } = {}) {
  const perError = 5 + Math.max(0, (Number(level) || 1) - 4);
  return (Number(errors) || 0) * perError + (overTime ? 10 : 0);
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

import { AI_BASE, aiHeaders } from './apiConfig';

const COACH_ENDPOINT = `${AI_BASE}/coach`;
const COACH_MODES_KEY = 'elocution-coach-modes';
// Bilans en Gemini Pro (~15-25 s, jusqu'à 40 s par modèle côté serveur, 75 s au total).
const BILAN_TIMEOUT_MS = 90000;

export async function isCoachAvailable() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${COACH_ENDPOINT}/status`, {
      headers: aiHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.available);
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

async function post(path, body, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${COACH_ENDPOINT}${path}`, {
      method: 'POST',
      headers: aiHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        reason: 'timeout',
        message: 'Le coach met trop de temps à répondre. Réessaie dans un instant.',
      };
    }
    return {
      ok: false,
      reason: 'offline',
      message: 'Le serveur local du coach IA est éteint : lance local-ai/server.py.',
    };
  }

  clearTimeout(timeoutId);

  if (res.status === 401) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: "Code d'accès IA manquant ou incorrect : va dans Réglages.",
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      reason: 'quota',
      message: "Limite d'utilisation de l'IA atteinte pour aujourd'hui, réessaie demain.",
    };
  }

  if (!res.ok) {
    let errMessage = '';
    try {
      const errJson = await res.json();
      errMessage = errJson.detail || '';
    } catch {
      errMessage = await res.text().catch(() => '');
    }
    return {
      ok: false,
      reason: 'error',
      message: errMessage || `Erreur du serveur coach (${res.status}).`,
    };
  }

  try {
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err?.message || 'Réponse JSON invalide reçue du serveur coach.',
    };
  }
}

export async function getAiFeedback({
  game,
  subject,
  transcript,
  metrics = null,
  attempt = 1,
  wantModel = false,
  theme = '',
  difficulty = '',
}) {
  return post('/feedback', {
    game,
    subject,
    transcript,
    metrics,
    attempt,
    wantModel,
    theme,
    difficulty,
  }, BILAN_TIMEOUT_MS);
}

export async function checkTopic({ input, profile = '' }) {
  return post('/topic/check', {
    input,
    profile,
  });
}

export async function suggestTopic({ category, profile = '', avoid = [] }) {
  return post('/topic/suggest', {
    category,
    profile,
    avoid,
  });
}

export async function duelTurn({
  subject,
  userSide,
  history = [],
  userText,
  turn = 1,
  maxTurns = 3,
  theme = '',
  difficulty = '',
}) {
  return post('/duel/turn', {
    subject,
    userSide,
    history,
    userText,
    turn,
    maxTurns,
    theme,
    difficulty,
  });
}

export async function rebuttal({
  subject,
  theme = '',
  difficulty = '',
  history = [],
  userText,
  exchange = 1,
  maxExchanges = 3,
}) {
  return post('/rebuttal', {
    subject,
    theme,
    difficulty,
    history,
    userText,
    exchange,
    maxExchanges,
  });
}

export async function duelVerdict({ subject, userSide, history = [] }) {
  return post('/duel/verdict', {
    subject,
    userSide,
    history,
  }, BILAN_TIMEOUT_MS);
}

export async function explainFeedback({
  concept,
  audienceA,
  textA,
  audienceB,
  textB,
}) {
  return post('/explain', {
    concept,
    audienceA,
    textA,
    audienceB,
    textB,
  }, BILAN_TIMEOUT_MS);
}

export async function getPhrases({ startLevel = 1, count = 10, weakTypes = [] } = {}) {
  return post('/phrases', {
    startLevel,
    count,
    weakTypes,
  });
}

export async function voiceFeedback({
  game = 'mirror',
  subject = '',
  blobs = [],
  transcripts = '',
  metrics = null,
  theme = '',
  difficulty = '',
}) {
  const formData = new FormData();
  blobs.forEach((blob, i) => {
    let ext = 'webm';
    const type = blob?.type || '';
    if (type.includes('mp4')) ext = 'mp4';
    else if (type.includes('ogg')) ext = 'ogg';
    formData.append('files', blob, `prise${i + 1}.${ext}`);
  });
  formData.append('game', game);
  formData.append('subject', subject);
  formData.append('transcripts', transcripts || '');
  formData.append('metrics', metrics ? JSON.stringify(metrics) : '');
  formData.append('theme', theme);
  formData.append('difficulty', difficulty);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let res;
  try {
    res = await fetch(`${COACH_ENDPOINT}/voice`, {
      method: 'POST',
      headers: aiHeaders(),
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        reason: 'timeout',
        message: 'Le coach met trop de temps à répondre. Réessaie dans un instant.',
      };
    }
    return {
      ok: false,
      reason: 'offline',
      message: 'Le serveur local du coach IA est éteint : lance local-ai/server.py.',
    };
  }

  clearTimeout(timeoutId);

  if (res.status === 401) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: "Code d'accès IA manquant ou incorrect : va dans Réglages.",
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      reason: 'quota',
      message: "Limite d'utilisation de l'IA atteinte pour aujourd'hui, réessaie demain.",
    };
  }

  if (!res.ok) {
    let errMessage = '';
    try {
      const errJson = await res.json();
      errMessage = errJson.detail || '';
    } catch {
      errMessage = await res.text().catch(() => '');
    }
    return {
      ok: false,
      reason: 'error',
      message: errMessage || `Erreur du serveur coach (${res.status}).`,
    };
  }

  try {
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err?.message || 'Réponse JSON invalide reçue du serveur coach.',
    };
  }
}

export async function duelTurnAudio({
  blob,
  subject = '',
  userSide = 'pour',
  theme = '',
  difficulty = '',
  history = [],
  turn = 1,
  maxTurns = 3,
}) {
  const formData = new FormData();
  if (blob) {
    let ext = 'webm';
    const type = blob?.type || '';
    if (type.includes('mp4')) ext = 'mp4';
    else if (type.includes('ogg')) ext = 'ogg';
    formData.append('file', blob, `reponse.${ext}`);
  }
  formData.append('subject', subject);
  formData.append('userSide', userSide);
  formData.append('theme', theme);
  formData.append('difficulty', difficulty);
  formData.append('history', JSON.stringify(history || []));
  formData.append('turn', String(turn));
  formData.append('maxTurns', String(maxTurns));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(`${COACH_ENDPOINT}/duel/turn/audio`, {
      method: 'POST',
      headers: aiHeaders(),
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        reason: 'timeout',
        message: 'Le coach met trop de temps à répondre. Réessaie dans un instant.',
      };
    }
    return {
      ok: false,
      reason: 'offline',
      message: 'Le serveur local du coach IA est éteint : lance local-ai/server.py.',
    };
  }

  clearTimeout(timeoutId);

  if (res.status === 401) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: "Code d'accès IA manquant ou incorrect : va dans Réglages.",
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      reason: 'quota',
      message: "Limite d'utilisation de l'IA atteinte pour aujourd'hui, réessaie demain.",
    };
  }

  if (!res.ok) {
    let errMessage = '';
    try {
      const errJson = await res.json();
      errMessage = errJson.detail || '';
    } catch {
      errMessage = await res.text().catch(() => '');
    }
    return {
      ok: false,
      reason: 'error',
      message: errMessage || `Erreur du serveur coach (${res.status}).`,
    };
  }

  try {
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err?.message || 'Réponse JSON invalide reçue du serveur coach.',
    };
  }
}

export function getCoachMode(gameId) {
  try {
    if (typeof localStorage === 'undefined') return 'manual';
    const raw = localStorage.getItem(COACH_MODES_KEY);
    if (!raw) return 'manual';
    const parsed = JSON.parse(raw);
    return parsed?.[gameId] === 'ai' ? 'ai' : 'manual';
  } catch {
    return 'manual';
  }
}

export function setCoachMode(gameId, mode) {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(COACH_MODES_KEY);
    const current = raw ? JSON.parse(raw) : {};
    current[gameId] = mode === 'ai' ? 'ai' : 'manual';
    localStorage.setItem(COACH_MODES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Impossible de sauvegarder le mode coach:', e);
  }
}

// Bouton « Aide » du débat : situation, attitude, pistes, amorce, erreurs à éviter (~2 s).
export async function debateHelp({ subject, theme = '', difficulty = '', stage = 'sujet', opponentText = '', userText = '' }) {
  return post('/help', { subject, theme, difficulty, stage, opponentText, userText }, 30000);
}

export const AI_BASE = (import.meta.env?.VITE_AI_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');

const KEY = 'elocution-access-code';

export function getAccessCode() {
  try {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : '') || '';
  } catch {
    return '';
  }
}

// Événements pour le bandeau d'alerte « code d'accès IA » (voir AppLayout).
export const CODE_REJECTED_EVENT = 'elocution-code-rejected';
export const CODE_SAVED_EVENT = 'elocution-code-saved';

function emit(name) {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
  } catch {
    /* ignore */
  }
}

// À appeler quand le serveur IA répond 401 : sans ça, la voix HD, la transcription
// et le coach tombent en panne sans que l'utilisateur comprenne pourquoi.
export function notifyCodeRejected() {
  emit(CODE_REJECTED_EVENT);
}

export function setAccessCode(code) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, code.trim());
    }
  } catch {
    /* ignore */
  }
  emit(CODE_SAVED_EVENT);
}

export function aiHeaders(extra = {}) {
  const c = getAccessCode();
  return c ? { ...extra, 'X-Access-Code': c } : { ...extra };
}

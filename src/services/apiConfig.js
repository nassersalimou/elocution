export const AI_BASE = (import.meta.env?.VITE_AI_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');

const KEY = 'elocution-access-code';

export function getAccessCode() {
  try {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : '') || '';
  } catch {
    return '';
  }
}

export function setAccessCode(code) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, code.trim());
    }
  } catch {
    /* ignore */
  }
}

export function aiHeaders(extra = {}) {
  const c = getAccessCode();
  return c ? { ...extra, 'X-Access-Code': c } : { ...extra };
}

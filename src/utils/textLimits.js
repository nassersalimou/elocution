/**
 * Limites de taille des textes envoyés au coach IA (module pur, indépendant de React).
 */

// Le serveur refuse (422) un texte de plus de 6000 caractères.
export const MAX_TEXT_CHARS = 5800;

/**
 * Ramène un long texte (ex. échange oral à 4 tours) sous la limite du serveur :
 * on raccourcit d'abord les répliques de l'adversaire, puis toutes les lignes.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function fitTranscript(text, max = MAX_TEXT_CHARS) {
  if (typeof text !== 'string' || text.length <= max) return text;
  const clip = (line, n) => (line.length > n ? `${line.slice(0, n).trimEnd()}…` : line);
  let lines = text.split('\n');
  for (const n of [400, 250, 150]) {
    lines = lines.map((l) => (l.startsWith('ADVERSAIRE') ? clip(l, n) : l));
    if (lines.join('\n').length <= max) return lines.join('\n');
  }
  const perLine = Math.max(60, Math.floor(max / lines.length) - 1);
  return lines.map((l) => clip(l, perLine)).join('\n').slice(0, max);
}

/**
 * FastAPI renvoie parfois `detail` sous forme de liste d'objets (erreur 422) :
 * on le met à plat pour pouvoir l'afficher sans faire planter la page.
 * @param {unknown} detail
 * @returns {string}
 */
export function detailToText(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d?.msg || '')).filter(Boolean).join(' ; ');
  }
  return '';
}

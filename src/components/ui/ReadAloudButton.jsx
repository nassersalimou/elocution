import { useEffect, useId, useState } from 'react';
import { getSpeechOwner, onSpeechChange, speak, stopSpeaking } from '../../services/speechService';

// Bouton « 🔊 Écouter / ⏹ Arrêter » : lecture à voix haute de n'importe quel texte
// (sujets, critiques, retours du coach…), pensé pour les personnes malvoyantes.
// `text` peut être une chaîne ou une fonction qui la construit au moment du clic.
export function ReadAloudButton({ text, label = 'Écouter', title, compact = false }) {
  const owner = useId();
  const [playing, setPlaying] = useState(() => getSpeechOwner() === owner);

  useEffect(() => onSpeechChange((current) => setPlaying(current === owner)), [owner]);

  const content = typeof text === 'function' ? text() : text;
  if (!content || !String(content).trim()) return null;

  const handleClick = () => {
    if (playing) {
      stopSpeaking();
      return;
    }
    speak(typeof text === 'function' ? text() : text, { owner });
  };

  return (
    <button
      type="button"
      className={`read-aloud-btn ${playing ? 'is-playing' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={handleClick}
      aria-pressed={playing}
      aria-label={playing ? 'Arrêter la lecture' : title || `${label} à voix haute`}
      title={playing ? 'Arrêter la lecture' : title || `${label} à voix haute`}
    >
      <span aria-hidden="true">{playing ? '⏹' : '🔊'}</span>
      {!compact && <span>{playing ? 'Arrêter' : label}</span>}
    </button>
  );
}

// Assemble un texte lisible à partir de sections { titre, contenu } (contenu : chaîne ou liste).
export function buildSpeech(sections) {
  return sections
    .filter((s) => s && (Array.isArray(s.content) ? s.content.length : s.content))
    .map((s) => {
      const body = Array.isArray(s.content) ? s.content.filter(Boolean).join('. ') : s.content;
      return s.title ? `${s.title}. ${body}` : body;
    })
    .join('. ')
    .replace(/\.\s*\./g, '.');
}

export default ReadAloudButton;

import ReadAloudButton from './ReadAloudButton';

export function AudioPlayer({ src, label }) {
  if (!src) return null;
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      {label && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</p>}
      <audio controls src={src} style={{ width: '100%' }} preload="metadata">
        Votre navigateur ne supporte pas la lecture audio.
      </audio>
    </div>
  );
}

// Ancien nom conservé : même bouton « Écouter / Arrêter » que partout ailleurs.
export function SpeakButton({ text, label = 'Écouter' }) {
  return <ReadAloudButton text={text} label={label} />;
}

export default AudioPlayer;

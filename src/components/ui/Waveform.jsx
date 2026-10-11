export function Waveform({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '32px' }} aria-label={active ? 'Enregistrement en cours' : 'En attente'}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            borderRadius: '2px',
            background: active ? 'var(--red)' : 'var(--text-secondary)',
            height: active ? undefined : '8px',
            // Délai inclus dans le raccourci : mélanger animation et animationDelay
            // provoque un avertissement React à chaque rendu.
            animation: active ? `waveform 0.${8 + (i % 4)}s ease-in-out ${i * 0.05}s infinite` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default Waveform;

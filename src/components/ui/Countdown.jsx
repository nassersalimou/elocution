import { useState, useEffect } from 'react';

export function Countdown({ onComplete, labels = ['3', '2', '1', 'PARLE !'] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= labels.length) {
      onComplete?.();
      return;
    }
    const duration = index === labels.length - 1 ? 800 : 700;
    const timer = setTimeout(() => {
      setIndex((i) => i + 1);
    }, duration);

    return () => clearTimeout(timer);
  }, [index, labels, onComplete]);

  if (index >= labels.length) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(8, 11, 20, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span
        key={index}
        className="animate-countdown"
        style={{
          fontSize: index === labels.length - 1 ? '3rem' : '5rem',
          fontWeight: 800,
          color: index === labels.length - 1 ? 'var(--green)' : 'var(--violet-light)',
          textShadow: '0 0 40px rgba(139, 92, 246, 0.5)',
        }}
      >
        {labels[index]}
      </span>
    </div>
  );
}

export default Countdown;

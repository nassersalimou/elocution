import { useState, useEffect } from 'react';
import { isCoachAvailable, getCoachMode, setCoachMode } from '../../services/aiCoachService';

export function CoachModeToggle({ gameId, value, onChange }) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  const currentMode = value !== undefined ? value : getCoachMode(gameId);

  useEffect(() => {
    let isMounted = true;
    isCoachAvailable().then((isAvail) => {
      if (isMounted) {
        setAvailable(isAvail);
        setChecking(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelect = (mode) => {
    if (mode === 'ai' && !available) return;
    setCoachMode(gameId, mode);
    if (onChange) {
      onChange(mode);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
      <div
        style={{
          display: 'inline-flex',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)',
          padding: '3px',
          border: '1px solid var(--border)',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => handleSelect('manual')}
          className={`btn btn-sm ${currentMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 'calc(var(--radius) - 2px)', padding: '0.4rem 0.9rem' }}
        >
          Manuel
        </button>
        <button
          type="button"
          onClick={() => handleSelect('ai')}
          disabled={!available}
          className={`btn btn-sm ${currentMode === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 'calc(var(--radius) - 2px)', padding: '0.4rem 0.9rem' }}
        >
          Assistant IA
        </button>
      </div>
      {!checking && !available && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Coach IA hors ligne : lance le serveur IA (npm run ai).
        </span>
      )}
    </div>
  );
}

export default CoachModeToggle;

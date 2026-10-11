import { useState, useEffect } from 'react';
import { getCoachStatus, getCoachMode, setCoachMode } from '../../services/aiCoachService';

export function CoachModeToggle({ gameId, value, onChange }) {
  const [status, setStatus] = useState(null);
  const available = status === 'ok';
  const checking = status === null;

  const currentMode = value !== undefined ? value : getCoachMode(gameId);

  useEffect(() => {
    let isMounted = true;
    getCoachStatus().then((s) => {
      if (isMounted) setStatus(s);
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
      {status === 'code' && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Assistant IA réservé : entre le code d'accès dans Réglages (demande-le à l'auteur de l'application).
        </span>
      )}
      {status === 'offline' && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Coach IA hors ligne pour le moment : le mode manuel reste disponible.
        </span>
      )}
    </div>
  );
}

export default CoachModeToggle;

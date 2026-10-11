import { useEffect, useRef, useState } from 'react';
import { debateHelp } from '../../services/aiCoachService';
import { stopSpeaking } from '../../services/speechService';
import ReadAloudButton, { buildSpeech } from './ReadAloudButton';

export const HELP_MAX_PER_ROUND = 3;

// Rangée d'outils (enfants : ex. bouton Écouter) + bouton « 💡 Aide » et son panneau.
// - helpKey : change à chaque nouvelle situation (nouveau sujet, nouvelle réplique) → nouvelle aide possible.
// - getRequest() : paramètres envoyés à /coach/help au moment du clic.
// - remaining / onUse : compteur d'aides de la manche, tenu par le jeu (3 max).
// - onOpenChange(open) : le jeu met son chrono en pause pendant la lecture de l'aide.
export function HelpPanel({ helpKey, getRequest, remaining, onUse, onOpenChange, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Nouvelle situation : on oublie l'aide précédente (et on ferme le panneau).
  useEffect(() => {
    requestIdRef.current++;
    setData(null);
    setError('');
    setLoading(false);
    setOpen((wasOpen) => {
      if (wasOpen) onOpenChangeRef.current?.(false);
      return false;
    });
  }, [helpKey]);

  const changeOpen = (value) => {
    setOpen(value);
    onOpenChangeRef.current?.(value);
    if (!value) stopSpeaking();
  };

  const handleClick = async () => {
    if (open) {
      changeOpen(false);
      return;
    }
    if (data) {
      changeOpen(true); // revoir l'aide déjà obtenue : gratuit
      return;
    }
    if (remaining <= 0) return;
    onUse();
    changeOpen(true);
    setLoading(true);
    setError('');
    const id = ++requestIdRef.current;
    const res = await debateHelp(getRequest());
    if (id !== requestIdRef.current) return;
    setLoading(false);
    if (res.ok && res.data) setData(res.data);
    else setError(res.message || "L'aide n'est pas disponible pour le moment.");
  };

  const label = open ? 'Masquer l’aide' : data ? 'Revoir l’aide' : 'Aide';
  const disabled = !open && !data && remaining <= 0;

  return (
    <div>
      <div className="tool-row">
        {children}
        <button
          type="button"
          className="help-btn"
          onClick={handleClick}
          disabled={disabled}
          aria-expanded={open}
          title={disabled ? 'Plus d’aide disponible pour cette manche' : 'Le coach t’explique la situation et te donne des pistes'}
        >
          <span aria-hidden="true">💡</span>
          <span>{label}</span>
          {!data && <span className="help-count">{remaining}/{HELP_MAX_PER_ROUND}</span>}
        </button>
      </div>

      {open && (
        <div className="help-card animate-fade-in" role="region" aria-label="Aide du coach">
          <div className="panel-header">
            <strong style={{ color: 'var(--orange)' }}>💡 Aide du coach</strong>
            {data && (
              <ReadAloudButton
                label="Écouter l’aide"
                text={() =>
                  buildSpeech([
                    { title: 'La situation', content: data.situation },
                    { title: 'Comment réagir', content: data.reagir },
                    { title: 'Des pistes', content: data.pistes },
                    { title: 'Pour te lancer', content: data.amorce },
                    { title: 'À éviter', content: data.eviter },
                  ])
                }
              />
            )}
          </div>

          {loading && <p style={{ color: 'var(--text-secondary)' }}>Le coach regarde la situation… (chrono en pause)</p>}
          {error && <p style={{ color: 'var(--orange)' }}>{error}</p>}

          {data && (
            <>
              {data.situation && (
                <div>
                  <h4 style={{ color: 'var(--blue)' }}>🧭 La situation</h4>
                  <p>{data.situation}</p>
                </div>
              )}
              {data.reagir && (
                <div>
                  <h4 style={{ color: 'var(--violet-light)' }}>🎯 Comment réagir</h4>
                  <p>{data.reagir}</p>
                </div>
              )}
              {data.pistes?.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--green)' }}>💬 Des pistes</h4>
                  <ul>{data.pistes.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
              {data.amorce && (
                <div>
                  <h4 style={{ color: 'var(--orange)' }}>🚀 Pour te lancer</h4>
                  <p style={{ fontStyle: 'italic' }}>« {data.amorce} »</p>
                </div>
              )}
              {data.eviter?.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--red)' }}>⛔ À éviter</h4>
                  <ul>{data.eviter.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
            </>
          )}

          <div style={{ textAlign: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeOpen(false)}>
              J’ai compris, je reprends
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpPanel;

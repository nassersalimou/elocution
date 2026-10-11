import { useState, useEffect, useRef } from 'react';
import { voiceFeedback } from '../../services/aiCoachService';
import ReadAloudButton, { buildSpeech } from './ReadAloudButton';

const CRITERIA = [
  { key: 'intonation', label: 'Intonation' },
  { key: 'rythme', label: 'Rythme' },
  { key: 'pauses', label: 'Pauses' },
  { key: 'assurance', label: 'Assurance' },
  { key: 'diction', label: 'Diction' },
  { key: 'energie', label: 'Énergie' },
];

export function AiVoicePanel({ game, subject, blobs, transcripts, metrics, theme = '', difficulty = '' }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const lastCalledSignatureRef = useRef(null);
  const requestIdRef = useRef(0);
  const propsRef = useRef({ game, subject, blobs, transcripts, metrics, theme, difficulty });
  propsRef.current = { game, subject, blobs, transcripts, metrics, theme, difficulty };

  const signature = (blobs || []).map((b) => b?.size ?? 0).join('-');

  const executeRequest = () => {
    const { game: g, subject: s, blobs: b, transcripts: t, metrics: m, theme: th, difficulty: diff } = propsRef.current;
    if (!b || b.length === 0) return;

    setLoading(true);
    setErrorMsg(null);

    const id = ++requestIdRef.current;
    voiceFeedback({
      game: g,
      subject: s,
      blobs: b,
      transcripts: t,
      metrics: m,
      theme: th,
      difficulty: diff,
    })
      .then((res) => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
        if (res.ok) {
          setData(res.data);
        } else {
          setErrorMsg(res.message);
        }
      })
      .catch(() => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
        setErrorMsg('Le coach IA ne répond pas.');
      });
  };

  useEffect(() => {
    if (!signature || signature === lastCalledSignatureRef.current) {
      return;
    }
    lastCalledSignatureRef.current = signature;
    executeRequest();
  }, [signature]);

  if (!blobs || blobs.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--violet-light)', marginBottom: '0.5rem' }}>
          🎧 Le coach écoute ta voix…
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Analyse de l'intonation, du rythme, de l'assurance et de la diction en cours (environ 20 secondes).
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div
        className="card"
        style={{
          borderLeft: '4px solid var(--orange)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--orange)' }}>
          {errorMsg}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={executeRequest}
        >
          🔄 Réessayer
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="panel-header">
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          🎧 Le coach a écouté ta voix
        </h3>
        <ReadAloudButton
          label="Tout écouter"
          text={() =>
            buildSpeech([
              {
                title: 'Ta voix',
                content: CRITERIA.map(({ key, label }) => {
                  const item = data.voix?.[key];
                  return item ? `${label} : ${item.note} sur 10. ${item.commentaire || ''}` : '';
                }),
              },
              { title: 'Progrès', content: data.progress },
              { title: 'Point fort', content: data.strength },
              { title: 'À travailler', content: [data.weakness, data.why] },
              { title: 'Ton argumentation', content: data.argumentation || [] },
              { title: 'Question pour creuser', content: data.question },
              {
                title: 'Ce que tu aurais pu dire',
                content: (data.examples || []).map((ex) =>
                  ex.instead ? `Au lieu de : ${ex.instead}. Dis plutôt : ${ex.better}` : `Dis plutôt : ${ex.better}`
                ),
              },
              { title: 'Objectif suivant', content: data.nextGoal },
            ])
          }
        />
      </div>

      {/* 6 critères vocaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {CRITERIA.map(({ key, label }) => {
          const item = data.voix?.[key] || { note: 7, commentaire: '' };
          const note = Math.max(1, Math.min(10, Number(item.note) || 7));
          return (
            <div
              key={key}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--violet-light)' }}>{note}/10</span>
              </div>
              <div
                style={{
                  height: '5px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '0.45rem',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${note * 10}%`,
                    background: 'var(--violet)',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                {item.commentaire}
              </p>
            </div>
          );
        })}
      </div>

      {/* Point fort */}
      {data.strength && (
        <div style={{ borderLeft: '3px solid var(--green)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Point fort
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {data.strength}
          </div>
        </div>
      )}

      {/* À travailler */}
      {data.weakness && (
        <div style={{ borderLeft: '3px solid var(--orange)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            À travailler
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {data.weakness}
          </div>
          {data.why && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              {data.why}
            </div>
          )}
        </div>
      )}

      {/* Ton argumentation */}
      {data.argumentation && data.argumentation.length > 0 && (
        <div style={{ borderLeft: '3px solid var(--orange)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            🔍 Ton argumentation
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {data.argumentation.map((critique, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {critique}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question pour creuser */}
      {data.question && (
        <div
          style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            Question pour creuser
          </div>
          <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
            « {data.question} »
          </div>
        </div>
      )}

      {/* Ce que tu aurais pu dire */}
      {data.examples && data.examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💡 Ce que tu aurais pu dire
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.examples.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  fontSize: '0.9rem',
                }}
              >
                {ex.instead && (
                  <div style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', opacity: 0.7 }}>
                    Au lieu de : « {ex.instead} »
                  </div>
                )}
                {ex.better && (
                  <div style={{ color: 'var(--violet-light)', fontWeight: 700 }}>
                    Dis plutôt : « {ex.better} »
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objectif suivant */}
      {data.nextGoal && (
        <div style={{ borderLeft: '3px solid var(--blue)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Objectif suivant
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {data.nextGoal}
          </div>
        </div>
      )}

      {/* Progrès constatés (si 2 prises) */}
      {data.progress && (
        <div style={{ borderLeft: '3px solid var(--violet-light)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Progrès constatés
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {data.progress}
          </div>
        </div>
      )}

      {/* Modèle IA */}
      {data.model && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '0.25rem' }}>
          Modèle : {data.model}
        </div>
      )}
    </div>
  );
}

export default AiVoicePanel;

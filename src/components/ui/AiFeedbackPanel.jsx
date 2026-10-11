import { useState, useEffect, useRef } from 'react';
import { getAiFeedback } from '../../services/aiCoachService';
import ReadAloudButton, { buildSpeech } from './ReadAloudButton';

export function AiFeedbackPanel({ game, subject, transcript, metrics, theme = '', difficulty = '' }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [model, setModel] = useState(null);

  const [loadingImproved, setLoadingImproved] = useState(false);
  const [improved, setImproved] = useState(null);

  const lastCalledTranscriptRef = useRef(null);
  const requestIdRef = useRef(0);
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  useEffect(() => {
    if (!transcript || !transcript.trim() || lastCalledTranscriptRef.current === transcript) {
      return;
    }
    lastCalledTranscriptRef.current = transcript;

    setLoading(true);
    setErrorMsg(null);
    setImproved(null);

    const id = ++requestIdRef.current;
    getAiFeedback({
      game,
      subject,
      transcript,
      metrics: metricsRef.current,
      theme: themeRef.current,
      difficulty: difficultyRef.current,
      attempt: 1,
      wantModel: false,
    })
      .then((res) => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
        if (res.ok) {
          setFeedback(res.data);
          setModel(res.data?.model || null);
        } else {
          setErrorMsg(res.message);
        }
      })
      .catch(() => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
        setErrorMsg('Le coach IA ne répond pas.');
      });
  }, [game, subject, transcript]);

  if (!transcript || !transcript.trim()) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
        En attente de la transcription de ta réponse...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--violet-light)', marginBottom: '0.5rem' }}>
          Le coach analyse ta réponse...
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Analyse de la thèse, des arguments et du rythme en cours.
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
          gap: '0.5rem',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--orange)' }}>
          {errorMsg}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Continue avec l'auto-évaluation ci-dessous.
        </div>
      </div>
    );
  }

  if (!feedback) {
    return null;
  }

  const handleFetchImproved = async () => {
    setLoadingImproved(true);
    try {
      const res = await getAiFeedback({
        game,
        subject,
        transcript,
        metrics: metricsRef.current,
        theme: themeRef.current,
        difficulty: difficultyRef.current,
        attempt: 2,
        wantModel: true,
      });
      if (res?.ok && res.data?.improved) {
        setImproved(res.data.improved);
      }
    } catch {
      // Ignorer silencieusement en cas d'erreur de requête
    } finally {
      setLoadingImproved(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="panel-header">
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎙️ Retour du Coach IA
        </h3>
        <ReadAloudButton
          label="Tout écouter"
          text={() =>
            buildSpeech([
              { title: 'Point fort', content: feedback.strength },
              { title: 'À travailler', content: [feedback.weakness, feedback.why] },
              { title: 'Ton argumentation', content: feedback.argumentation || [] },
              { title: 'Question pour creuser', content: feedback.question },
              {
                title: 'Ce que tu aurais pu dire',
                content: (feedback.examples || []).map((ex) =>
                  ex.instead ? `Au lieu de : ${ex.instead}. Dis plutôt : ${ex.better}` : `Dis plutôt : ${ex.better}`
                ),
              },
              { title: 'Prochain objectif', content: feedback.nextGoal },
              { title: 'Version améliorée', content: improved },
            ])
          }
        />
      </div>

      {/* Point fort */}
      <div style={{ borderLeft: '3px solid var(--green)', paddingLeft: '0.85rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
          Point fort
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {feedback.strength}
        </div>
      </div>

      {/* À travailler */}
      <div style={{ borderLeft: '3px solid var(--orange)', paddingLeft: '0.85rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
          À travailler
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
          {feedback.weakness}
        </div>
        {feedback.why && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
            {feedback.why}
          </div>
        )}
      </div>

      {/* Ton argumentation */}
      {feedback.argumentation && feedback.argumentation.length > 0 && (
        <div style={{ borderLeft: '3px solid var(--orange)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            🔍 Ton argumentation
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {feedback.argumentation.map((critique, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {critique}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question pour creuser */}
      {feedback.question && (
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
            « {feedback.question} »
          </div>
        </div>
      )}

      {/* Ce que tu aurais pu dire */}
      {feedback.examples && feedback.examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💡 Ce que tu aurais pu dire
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {feedback.examples.map((ex, idx) => (
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

      {/* Prochain objectif */}
      {feedback.nextGoal && (
        <div style={{ borderLeft: '3px solid var(--blue)', paddingLeft: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Prochain objectif
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {feedback.nextGoal}
          </div>
        </div>
      )}

      {/* Version améliorée */}
      {!improved ? (
        <div style={{ paddingTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleFetchImproved}
            disabled={loadingImproved}
          >
            {loadingImproved ? 'Génération de la version améliorée...' : '✨ Voir une version améliorée'}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginTop: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Proposition de version améliorée
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
            {improved}
          </div>
        </div>
      )}

      {model && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'right', opacity: 0.7 }}>
          Analyse : {model}
        </div>
      )}
    </div>
  );
}

export default AiFeedbackPanel;

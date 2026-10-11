import { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeVoiceRecording } from '../../services/voiceAnalysis/voiceAnalysisService.js';
import { analyzeText } from '../../utils/textAnalysis.js';
import Icon from './Icon.jsx';

export function VoiceAnalysisReport({ audioBlob, onAnalysisComplete }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  // Le parent passe souvent une fonction recréée à chaque rendu : la lire via une ref
  // évite de relancer Whisper à chaque rendu (des dizaines d'analyses en file d'attente,
  // dont les résultats de la manche 1 arrivaient pendant la manche 2).
  const onCompleteRef = useRef(onAnalysisComplete);
  onCompleteRef.current = onAnalysisComplete;
  const requestIdRef = useRef(0);

  const runAnalysis = useCallback(async () => {
    if (!audioBlob) return;
    const id = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const res = await analyzeVoiceRecording(audioBlob);
    if (id !== requestIdRef.current) return; // enregistrement remplacé ou composant démonté
    setLoading(false);

    if (res.success && res.data) {
      const textMetrics = analyzeText(res.data.text || '');
      const fullAnalysis = {
        ...res.data,
        structure: textMetrics,
      };
      setResult(fullAnalysis);
      setIsAvailable(true);
      if (onCompleteRef.current) onCompleteRef.current(fullAnalysis);
    } else {
      setIsAvailable(res.isAvailable);
      setError(res.error || 'Impossible d\'effectuer l\'analyse.');
    }
  }, [audioBlob]);

  // Une seule analyse par enregistrement.
  useEffect(() => {
    if (!audioBlob) return undefined;
    runAnalysis();
    return () => {
      requestIdRef.current++;
    };
  }, [audioBlob, runAnalysis]);

  if (loading) {
    return (
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '1.5rem', margin: '1.5rem 0' }}>
        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Analyse locale de ta voix…</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Transcription et calcul du débit 100% sur ton processeur</p>
      </div>
    );
  }

  if (error || !isAvailable) {
    return (
      <div className="card" style={{ margin: '1.5rem 0', borderColor: 'rgba(139, 92, 246, 0.3)', background: 'rgba(21, 27, 46, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem' }}>ℹ️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Analyse vocale locale indisponible
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Le serveur Whisper local n'est pas démarré. Ta réponse reste parfaitement enregistrée et tu peux continuer ton entraînement normalement.
            </p>
            {audioBlob && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.75rem' }}
                onClick={runAnalysis}
              >
                Réessayer l'analyse
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { text, metrics = {}, structure = {} } = result;
  const fillers = metrics.fillerWords || [];
  const repetitions = metrics.immediateRepetitions || metrics.repeatedWords || [];

  return (
    <div className="card animate-fade-in" style={{ margin: '1.5rem 0', padding: '1.5rem', borderColor: 'var(--violet)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="mic" size={18} />
          Analyse de ta réponse
        </h3>
        <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>Whisper local</span>
      </div>

      {/* Transcription */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Transcription fidèle :
        </p>
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.6 }}>
          {text ? `« ${text} »` : <span style={{ color: 'var(--text-secondary)' }}>Aucun mot détecté.</span>}
        </div>
      </div>

      {/* Grille des métriques mesurables */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="stat-value">{metrics.wordsPerMinute || 0}</div>
          <div className="stat-label">Débit (mots/min)</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--violet-light)', marginTop: '0.2rem' }}>
            {metrics.paceCategory || 'modéré'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{metrics.firstSpeechDelay !== undefined ? `${metrics.firstSpeechDelay}s` : '0s'}</div>
          <div className="stat-label">Démarrage</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Temps avant 1er mot
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{metrics.longPauseCount || 0}</div>
          <div className="stat-label">Pauses longues</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Max : {metrics.longestPauseSec || 0}s
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{metrics.fillerWordsCount || 0}</div>
          <div className="stat-label">Hésitations</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            dans transcription
          </div>
        </div>
      </div>

      {/* Détails complémentaires */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {fillers.length > 0 && (
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Hésitations repérées : </strong>
            {fillers.join(', ')}
          </div>
        )}
        {repetitions.length > 0 && (
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Répétitions : </strong>
            {repetitions.join(', ')}
          </div>
        )}
        {structure.connectors && structure.connectors.length > 0 && (
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Connecteurs logiques : </strong>
            {structure.connectors.join(', ')}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', textAlign: 'center' }}>
        🔒 Traitement 100% sur cet ordinateur — aucune donnée n'est envoyée sur le cloud.
      </p>
    </div>
  );
}

export default VoiceAnalysisReport;

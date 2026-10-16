import { useState, useEffect, useRef, useCallback } from 'react';
import { rebuttal } from '../../services/aiCoachService';
import { speak, stopSpeaking } from '../../services/speechService';
import { transcribeRecording } from '../../services/voiceAnalysis/voiceAnalysisService';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import useTimer from '../../hooks/useTimer';
import Waveform from '../../components/ui/Waveform';
import ExtraTimeButton, { EXTRA_SECONDS } from './ExtraTimeButton';
import HelpPanel from './HelpPanel';
import ReadAloudButton from './ReadAloudButton';
import AdversaryAvatar from './AdversaryAvatar';

const REFLECTION_TIMES = {
  debutant: 20,
  normal: 15,
  difficile: 10,
  intense: 6,
};

const RESPONSE_TIMES = {
  debutant: 60,
  normal: 45,
  difficile: 40,
  intense: 30,
};

export function OralExchange({
  subject,
  theme = '',
  difficulty = 'normal',
  firstAnswer,
  maxExchanges = 2,
  extraRemaining = 0,
  onUseExtra = null,
  helpRemaining = 0,
  onUseHelp = null,
  onDone,
}) {
  const [history, setHistory] = useState(() => [{ role: 'user', text: firstAnswer }]);
  const [exchange, setExchange] = useState(1);
  const [step, setStep] = useState('waiting'); // 'waiting' | 'speaking' | 'thinking' | 'recording' | 'transcribing' | 'fallback' | 'error'
  const [currentAi, setCurrentAi] = useState({ reply: '', question: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackInput, setFallbackInput] = useState('');
  const [silentTake, setSilentTake] = useState(false); // le micro n'a rien entendu

  const historyRef = useRef(history);
  historyRef.current = history;

  const reflectionSeconds = REFLECTION_TIMES[difficulty] || 15;
  const responseSeconds = RESPONSE_TIMES[difficulty] || 45;

  const { isRecording, startRecording, stopRecording, cleanup: cleanupMic } = useAudioRecorder();

  // Définition de handleReadyToRecord avant son utilisation dans useTimer
  const handleReadyToRecord = useCallback(async () => {
    try {
      await startRecording();
      setStep('recording');
    } catch {
      setStep('fallback');
    }
  }, [startRecording]);

  // Timers
  const thinkingTimer = useTimer(reflectionSeconds, {
    onComplete: () => {
      handleReadyToRecord();
    },
  });

  const handleFinishRecording = useCallback(async () => {
    setStep('transcribing');
    const result = await stopRecording();
    let transcribedText = '';
    let silent = false;
    if (result?.blob) {
      try {
        const res = await transcribeRecording(result.blob);
        if (res?.success && res.data?.text && res.data.text.trim()) {
          transcribedText = res.data.text.trim();
        }
        silent = !!res?.silent;
      } catch {
        // fallback
      }
    }

    if (transcribedText) {
      const nextHistory = [...historyRef.current, { role: 'user', text: transcribedText }];
      setHistory(nextHistory);
      if (exchange < maxExchanges) {
        setExchange((e) => e + 1);
        setStep('waiting');
      } else {
        onDone?.(nextHistory);
      }
    } else {
      setSilentTake(silent);
      setStep('fallback');
    }
  }, [stopRecording, exchange, maxExchanges, onDone]);

  const responseTimer = useTimer(responseSeconds, {
    onComplete: () => {
      handleFinishRecording();
    },
  });

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopSpeaking();
      cleanupMic();
    };
  }, [cleanupMic]);

  // Étape a) 'waiting' : appel du rebuttal
  useEffect(() => {
    if (step !== 'waiting') return;
    let isCancelled = false;

    const fetchRebuttal = async () => {
      const lastUserEntry = [...historyRef.current].reverse().find((h) => h.role === 'user');
      const userText = lastUserEntry?.text || firstAnswer;

      const res = await rebuttal({
        subject,
        theme,
        difficulty,
        history: historyRef.current,
        userText,
        exchange,
        maxExchanges,
      });

      if (isCancelled) return;

      if (!res.ok) {
        setErrorMessage(res.message || 'L’adversaire n’a pas pu répondre.');
        setStep('error');
        return;
      }

      const { reply = '', question = '' } = res.data || {};
      const fullText = `${reply} ${question}`.trim();
      const updatedHistory = [...historyRef.current, { role: 'ai', text: fullText }];
      setHistory(updatedHistory);
      setCurrentAi({ reply, question });
      setStep('speaking');

      speak(fullText, {
        onEnd: () => {
          if (!isCancelled) {
            setStep('thinking');
          }
        },
      });
    };

    fetchRebuttal();

    return () => {
      isCancelled = true;
    };
  }, [step, exchange, subject, theme, difficulty, firstAnswer, maxExchanges]);

  // Gestion du timer en mode 'thinking'
  useEffect(() => {
    if (step === 'thinking') {
      thinkingTimer.reset(reflectionSeconds);
      thinkingTimer.start();
    } else {
      thinkingTimer.pause();
    }
  }, [step, reflectionSeconds]);

  // Gestion du timer en mode 'recording'
  useEffect(() => {
    if (step === 'recording') {
      responseTimer.reset(responseSeconds);
      responseTimer.start();
    } else {
      responseTimer.pause();
    }
  }, [step, responseSeconds]);

  // « Donner ma réponse » : on coupe la lecture et on enregistre tout de suite.
  const handleSkipSpeaking = () => {
    stopSpeaking();
    handleReadyToRecord();
  };

  const handleFallbackSubmit = () => {
    const text = fallbackInput.trim();
    if (!text) return;
    setFallbackInput('');
    const nextHistory = [...historyRef.current, { role: 'user', text }];
    setHistory(nextHistory);
    if (exchange < maxExchanges) {
      setExchange((e) => e + 1);
      setStep('waiting');
    } else {
      onDone?.(nextHistory);
    }
  };

  const handleStopExchange = () => {
    stopSpeaking();
    cleanupMic();
    onDone?.(historyRef.current);
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        border: '1px solid var(--violet)',
        background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 100%)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        margin: '1.5rem 0',
      }}
    >
      {/* En-tête : numéro d'échange et bouton discret Arrêter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⚔️</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--violet-light)' }}>
            Échange oral {exchange} / {maxExchanges}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleStopExchange}
          style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
        >
          Arrêter l'échange ⏹️
        </button>
      </div>

      {/* L'adversaire en grand : il parle pendant sa réplique, il réfléchit le reste du temps.
          Sa réplique est écrite PAR-DESSUS l'image et reste visible pendant la réflexion et la
          réponse : on doit pouvoir la relire (ou la réécouter) sans avoir à la mémoriser. */}
      {['waiting', 'speaking', 'thinking', 'recording', 'transcribing'].includes(step) && (
        <AdversaryAvatar
          key={step === 'speaking' ? 'speaking' : 'thinking'}
          mood={step === 'speaking' ? 'speaking' : 'thinking'}
        >
          {step === 'waiting' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                L'adversaire prépare sa réponse…
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.85 }}>
                Il analyse ton dernier argument pour contre-attaquer.
              </div>
            </div>
          ) : currentAi.reply ? (
            <>
              <div className="panel-header" style={{ marginBottom: '0.4rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase' }}>
                  Réplique de l'adversaire
                </div>
                {/* Pas pendant l'enregistrement : le micro capterait la voix de l'adversaire. */}
                {step === 'thinking' && (
                  <ReadAloudButton label="Réécouter" text={`${currentAi.reply} ${currentAi.question || ''}`} />
                )}
              </div>
              <p style={{ fontSize: '1rem', lineHeight: 1.55, margin: '0 0 0.5rem' }}>{currentAi.reply}</p>
              {currentAi.question && (
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#c4b5fd', lineHeight: 1.4, margin: 0 }}>
                  {currentAi.question}
                </p>
              )}
            </>
          ) : null}
        </AdversaryAvatar>
      )}

      {step === 'speaking' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleSkipSpeaking}>
            Donner ma réponse 🎙️
          </button>
        </div>
      )}

      {step === 'thinking' && (
        <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Prépare ta riposte :
          </div>
          {onUseHelp && (
            <div style={{ width: '100%' }}>
              <HelpPanel
                helpKey={`replique-${exchange}`}
                remaining={helpRemaining}
                onUse={onUseHelp}
                getRequest={() => ({
                  subject,
                  theme,
                  difficulty,
                  stage: 'replique',
                  opponentText: `${currentAi.reply} ${currentAi.question || ''}`.trim(),
                  userText: [...history].reverse().find((m) => m.role === 'user')?.text || '',
                })}
                onOpenChange={(open) => {
                  if (open) thinkingTimer.pause();
                  else if (thinkingTimer.seconds > 0) thinkingTimer.start();
                }}
              />
            </div>
          )}
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--blue)', fontVariantNumeric: 'tabular-nums' }}>
            {thinkingTimer.seconds}s
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReadyToRecord}
            style={{ padding: '0.6rem 1.8rem', fontWeight: 700 }}
          >
            Je suis prêt 🎙️
          </button>
        </div>
      )}

      {step === 'recording' && (
        <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--violet)', fontVariantNumeric: 'tabular-nums' }}>
            {responseTimer.seconds}s
          </div>
          <div className="recording-indicator" style={{ margin: '0.5rem 0' }}>
            <div className="recording-dot" />
            <Waveform active={isRecording} />
            <span style={{ fontSize: '0.85rem', color: 'var(--red)', fontWeight: 600 }}>À toi de parler</span>
          </div>
          {onUseExtra && (
            <ExtraTimeButton
              remaining={extraRemaining}
              onUse={() => {
                if (!onUseExtra()) return;
                responseTimer.setSeconds((s) => s + EXTRA_SECONDS);
              }}
            />
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleFinishRecording}
            style={{ padding: '0.6rem 1.8rem' }}
          >
            Terminer ma réponse ⏹️
          </button>
        </div>
      )}

      {step === 'transcribing' && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--violet-light)', marginBottom: '0.25rem' }}>
            Transcription de ta réponse…
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Écoute et retranscription vocale en cours.
          </div>
        </div>
      )}

      {step === 'fallback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {silentTake && (
            <div style={{ borderLeft: '4px solid var(--orange)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.9rem' }}>
                Je n'ai rien entendu dans le micro. Vérifie qu'il est bien branché et réessaie, ou écris ta réponse.
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSilentTake(false);
                  handleReadyToRecord();
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                Réessayer de parler 🎙️
              </button>
            </div>
          )}
          <label className="label" htmlFor="fallback-input" style={{ fontSize: '0.9rem' }}>
            Écris ce que tu as répondu (ou ce que tu voulais dire) :
          </label>
          <textarea
            id="fallback-input"
            className="input textarea"
            value={fallbackInput}
            onChange={(e) => setFallbackInput(e.target.value)}
            placeholder="Ma réponse à l'adversaire..."
            rows={3}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleFallbackSubmit}
            disabled={!fallbackInput.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            Valider ma réponse
          </button>
        </div>
      )}

      {step === 'error' && (
        <div style={{ borderLeft: '4px solid var(--orange)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.9rem' }}>
            {errorMessage || 'Une erreur est survenue lors de l’échange.'}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleStopExchange}
            style={{ alignSelf: 'flex-start' }}
          >
            Terminer l'échange
          </button>
        </div>
      )}

      {/* Historique des échanges (Toi / Adversaire), petit et lisible */}
      {history.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Historique de la confrontation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            {history.map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.6rem',
                  background: h.role === 'user' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(139, 92, 246, 0.08)',
                  borderLeft: h.role === 'user' ? '3px solid var(--green)' : '3px solid var(--violet-light)',
                  borderRadius: '4px',
                }}
              >
                <strong style={{ color: h.role === 'user' ? 'var(--green)' : 'var(--violet-light)', marginRight: '0.35rem' }}>
                  {h.role === 'user' ? 'Toi :' : 'Adversaire :'}
                </strong>
                <span style={{ color: 'var(--text-primary)' }}>{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OralExchange;

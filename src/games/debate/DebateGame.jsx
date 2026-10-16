import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestionsForSession } from '../../data/debateQuestions';
import { getTimingsForSession, REFLECTION_TIPS } from '../../data/debateTiming';
import { adjustDebateTiming } from '../../utils/adaptiveDifficulty';
import { DEBATE_SELF_EVAL_QUESTIONS } from '../../data/feedbackRules';
import { getDebateFeedback } from '../../services/feedbackEngine';
import { awardXp } from '../../services/progressService';
import { calculateDebateXp } from '../../utils/xpUtils';
import useTimer from '../../hooks/useTimer';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import CircularTimer from '../../components/ui/CircularTimer';
import Countdown from '../../components/ui/Countdown';
import Waveform from '../../components/ui/Waveform';
import AudioPlayer, { SpeakButton } from '../../components/ui/AudioPlayer';
import VoiceAnalysisReport from '../../components/ui/VoiceAnalysisReport';
import ExtraTimeButton, { EXTRA_SECONDS, EXTRA_MAX_PER_ROUND } from '../../components/ui/ExtraTimeButton';
import HelpPanel, { HELP_MAX_PER_ROUND } from '../../components/ui/HelpPanel';
import { transcribeRecording } from '../../services/voiceAnalysis/voiceAnalysisService';
import Icon from '../../components/ui/Icon';
import AiFeedbackPanel from '../../components/ui/AiFeedbackPanel';
import CoachBanner from '../../components/ui/CoachBanner';
import OralExchange from '../../components/ui/OralExchange';
import { recordDebate, rateTopic } from '../../services/topicProfileService';

import { formatTime } from '../../utils/dateUtils';
import FeedbackBox from '../../components/ui/FeedbackBox';

const PHASES = { REFLECTION: 'reflection', COUNTDOWN: 'countdown', RESPONSE: 'response', REVIEW: 'review', END: 'end' };

export function DebateGame({ config, onComplete }) {
  const navigate = useNavigate();
  const { theme, difficulty, rounds: configRounds, coachMode, customTopic } = config;
  const rounds = customTopic ? 1 : configRounds;

  const [questions] = useState(() =>
    customTopic
      ? [{ text: customTopic.subject }]
      : getQuestionsForSession(theme, difficulty, rounds)
  );
  const [timings, setTimings] = useState(() => getTimingsForSession(difficulty, rounds));
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState(PHASES.REFLECTION);
  const [showCountdown, setShowCountdown] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [evaluation, setEvaluation] = useState({});
  const [roundResults, setRoundResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [sessionFeedback, setSessionFeedback] = useState(null);
  const sessionStartRef = useRef(0);
  const responseTimeUsed = useRef(0);
  const reflectionTimeUsed = useRef(0);

  // États pour le coach IA
  const [analysisTranscript, setAnalysisTranscript] = useState('');
  const [analysisMetrics, setAnalysisMetrics] = useState(null);
  const [manualTranscriptInput, setManualTranscriptInput] = useState('');
  const [themeRated, setThemeRated] = useState(false);
  const [silentTake, setSilentTake] = useState(false); // le micro n'a rien entendu pendant la réponse
  // Rallonges « +20 s » : 2 max par manche, partagées entre la réponse et l'échange oral.
  const [extraUsed, setExtraUsed] = useState(0);
  // Aides « 💡 » : 3 max par manche, partagées entre le sujet et l'échange oral.
  const [helpUsed, setHelpUsed] = useState(0);
  const [responseExtraSeconds, setResponseExtraSeconds] = useState(0);
  const responseExtraRef = useRef(0);
  responseExtraRef.current = responseExtraSeconds;
  const consumeExtraTime = () => {
    if (extraUsed >= EXTRA_MAX_PER_ROUND) return false;
    setExtraUsed((n) => n + 1);
    return true;
  };
  const [exchangeTranscript, setExchangeTranscript] = useState('');
  const debateRecordedRef = useRef(false);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const currentTiming = timings[roundIndex] || timings[0];
  const currentQuestion = questions[roundIndex];

  const { isRecording, startRecording, stopRecording, error: micError, cleanup: cleanupMic } = useAudioRecorder();

  const reflectionTimer = useTimer(currentTiming.reflection, {
    autoStart: true,
    onComplete: () => {
      reflectionTimeUsed.current = currentTiming.reflection;
      setShowCountdown(true);
      setPhase(PHASES.COUNTDOWN);
    },
  });

  const handleReady = () => {
    if (phase !== PHASES.REFLECTION) return;
    reflectionTimer.pause();
    const elapsed = currentTiming.reflection - reflectionTimer.seconds;
    reflectionTimeUsed.current = Math.max(1, elapsed);
    setShowCountdown(true);
    setPhase(PHASES.COUNTDOWN);
  };

  const responseTimer = useTimer(currentTiming.response, {
    onComplete: () => handleStopResponse(),
  });

  useEffect(() => {
    return () => cleanupMic();
  }, [cleanupMic]);

  // Mode IA : transcription rapide (~4 s) pour lancer l'échange oral sans attendre
  // Whisper (~30 s), qui continue en parallèle pour les métriques de débit et de pauses.
  useEffect(() => {
    if (coachMode !== 'ai' || !audioBlob) return;
    let active = true;
    transcribeRecording(audioBlob).then((res) => {
      if (!active) return;
      if (res?.silent) setSilentTake(true); // rien entendu : on ne laisse pas inventer de texte
      else if (res?.success && res.data?.text) {
        setAnalysisTranscript((prev) => prev || res.data.text);
      }
    });
    return () => {
      active = false;
    };
  }, [coachMode, audioBlob]);

  const handleCountdownComplete = useCallback(async () => {
    setShowCountdown(false);
    setPhase(PHASES.RESPONSE);
    responseTimeUsed.current = 0;
    try {
      await startRecording();
    } catch {
      // Continue without audio if mic fails
    }
    responseTimer.reset(currentTiming.response);
    responseTimer.start();
  }, [currentTiming.response, startRecording, responseTimer]);

  const handleStopResponse = useCallback(async () => {
    responseTimer.pause();
    const result = await stopRecording();
    if (result?.url) setAudioUrl(result.url);
    if (result?.blob) setAudioBlob(result.blob);
    responseTimeUsed.current = currentTiming.response + responseExtraRef.current - responseTimer.seconds;
    setPhase(PHASES.REVIEW);
    setFeedback(getDebateFeedback({ type: 'round', evaluation: {} }));
  }, [stopRecording, responseTimer, currentTiming.response]);

  const handleEvalChange = (key, value) => {
    const updated = { ...evaluation, [key]: value };
    setEvaluation(updated);
    setFeedback(getDebateFeedback({ type: 'round', evaluation: updated }));
  };

  const computeSelfEvalScore = (eval_) => {
    if (coachMode === 'ai') return 0.8;
    let score = 0;
    let total = 0;
    for (const q of DEBATE_SELF_EVAL_QUESTIONS) {
      total++;
      const val = eval_[q.key];
      if (val === undefined) continue;
      if (q.invert) {
        if (!val) score++;
      } else {
        if (val) score++;
      }
    }
    return total > 0 ? score / total : 0;
  };

  const handleNextRound = () => {
    const selfEvalAvg = computeSelfEvalScore(evaluation);

    const result = {
      round: roundIndex + 1,
      reflectionTime: reflectionTimeUsed.current || currentTiming.reflection,
      responseTimeUsed: responseTimeUsed.current || (currentTiming.response - responseTimer.seconds),
      selfEvalAvg,
      evaluation: { ...evaluation },
    };

    const newResults = [...roundResults, result];
    setRoundResults(newResults);

    if (roundIndex + 1 >= rounds) {
      finishSession(newResults);
      return;
    }

    // Adaptation progressive de la difficulté pour les manches restantes
    const remainingCount = rounds - (roundIndex + 1);
    if (remainingCount > 0) {
      const remainingTimings = timings.slice(roundIndex + 1);
      const adjusted = adjustDebateTiming(remainingTimings, newResults);
      setTimings([...timings.slice(0, roundIndex + 1), ...adjusted]);
    }

    setRoundIndex(roundIndex + 1);
    setPhase(PHASES.REFLECTION);
    setEvaluation({});
    setFeedback('');
    setAudioUrl(null);
    setAudioBlob(null);
    setAnalysisTranscript('');
    setAnalysisMetrics(null);
    setManualTranscriptInput('');
    setSilentTake(false);
    setExchangeTranscript('');
    setExtraUsed(0);
    setHelpUsed(0);
    setResponseExtraSeconds(0);
    reflectionTimeUsed.current = 0;
    cleanupMic();

    const nextTiming = timings[roundIndex + 1];
    reflectionTimer.reset(nextTiming.reflection);
    reflectionTimer.start();
  };

  const finishSession = (results) => {
    const avgSelfEval = results.reduce((s, r) => s + r.selfEvalAvg, 0) / results.length;
    const firstEval = results[0]?.selfEvalAvg || 0;
    const lastEval = results[results.length - 1]?.selfEvalAvg || 0;
    const trainingSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

    const generatedFeedback = getDebateFeedback({
      type: 'session',
      avgSelfEval,
      rounds: results.length,
      firstEval,
      lastEval,
      lastReflectionTime: results[results.length - 1]?.reflectionTime,
    });

    const xp = calculateDebateXp(results.length, avgSelfEval, true);

    if (!onComplete) {
      awardXp(xp, {
        stat: 'improvisation',
        trainingSeconds,
        historyEntry: {
          game: 'debate',
          details: `${results.length} manches`,
          duration: trainingSeconds,
        },
      });
    }

    if (customTopic && !debateRecordedRef.current) {
      debateRecordedRef.current = true;
      recordDebate({
        subject: customTopic.subject,
        theme: customTopic.theme,
        category: customTopic.category,
        imposed: customTopic.imposed,
        score: Math.round(avgSelfEval * 100),
      });
    }

    setPhase(PHASES.END);
    setSessionFeedback(generatedFeedback);
    setRoundResults(results);
  };

  if (phase === PHASES.END) {
    const avgSelfEval = roundResults.reduce((s, r) => s + r.selfEvalAvg, 0) / roundResults.length;
    const avgReflection = roundResults.reduce((s, r) => s + r.reflectionTime, 0) / roundResults.length;
    const avgResponse = roundResults.reduce((s, r) => s + r.responseTimeUsed, 0) / roundResults.length;
    const xp = calculateDebateXp(roundResults.length, avgSelfEval, true);

    return (
      <div className="page game-container animate-fade-in">
        <CoachBanner mode={coachMode} />
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Session terminée</h1>
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{roundResults.length}</div>
            <div className="stat-label">Manches</div>
          </div>
          {coachMode !== 'ai' && (
            <div className="stat-card">
              <div className="stat-value">{Math.round(avgSelfEval * 100)}%</div>
              <div className="stat-label">Auto-éval. moyenne</div>
            </div>
          )}
          <div className="stat-card">
            <div className="stat-value">{formatTime(Math.round(avgReflection))}</div>
            <div className="stat-label">Réflexion moy.</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatTime(Math.round(avgResponse))}</div>
            <div className="stat-label">Réponse moy.</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">+{xp}</div>
            <div className="stat-label">XP gagné</div>
          </div>
        </div>

        {coachMode !== 'ai' && sessionFeedback && (
          <FeedbackBox speech={`${sessionFeedback?.summary || ''} ${sessionFeedback?.nextGoal ? `Ton prochain objectif : ${sessionFeedback.nextGoal}` : ''}`}>
            <p>{sessionFeedback?.summary}</p>
            {sessionFeedback?.nextGoal && <p style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--violet-light)' }}>Ton prochain objectif : {sessionFeedback.nextGoal}</p>}
          </FeedbackBox>
        )}

        {customTopic && (
          <div
            className="card"
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Thème : <strong style={{ color: 'var(--text-primary)' }}>{customTopic.theme}</strong>
            </span>
            {!themeRated ? (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    rateTopic(customTopic.theme, true);
                    setThemeRated(true);
                  }}
                >
                  👍 J'ai aimé ce thème
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    rateTopic(customTopic.theme, false);
                    setThemeRated(true);
                  }}
                >
                  👎 Pas mon truc
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--violet-light)', fontStyle: 'italic' }}>
                Merci, le coach s'adaptera.
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-primary btn-block" onClick={() => onComplete ? onComplete() : navigate('/')}>
            {onComplete ? 'Continuer' : 'Retour à l\'accueil'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASES.REVIEW) {
    return (
      <div className="page game-container animate-fade-in">
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Manche {roundIndex + 1}/{rounds}</p>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Réécoute ta réponse</h2>
        {audioUrl ? (
          <AudioPlayer src={audioUrl} label="Ta prise" />
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '1rem 0' }}>
            Réponse complétée (micro non activé ou non supporté).
          </div>
        )}

        {audioBlob && (
          <VoiceAnalysisReport
            audioBlob={audioBlob}
            onAnalysisComplete={(analysis) => {
              if (coachMode === 'ai' && analysis && !silentTake) {
                // La transcription rapide (Gemini) est souvent déjà là : on ne l'écrase pas.
                setAnalysisTranscript((prev) => prev || analysis.text || '');
                setAnalysisMetrics(analysis.metrics || null);
              }
            }}
          />
        )}

        {coachMode === 'ai' && (!audioBlob || silentTake) && (
          <div className="card" style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {silentTake && (
              <div style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.9rem' }}>
                Je n'ai rien entendu dans le micro. Écris ta réponse pour que le coach l'analyse, ou refais la manche.
              </div>
            )}
            <label className="label" htmlFor="manual-transcript">
              Écris ta réponse en quelques phrases pour que le coach l'analyse
            </label>
            <textarea
              id="manual-transcript"
              className="input textarea"
              value={manualTranscriptInput}
              onChange={(e) => setManualTranscriptInput(e.target.value)}
              placeholder="Ce que j'ai dit ou préparé..."
            />
            <div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!manualTranscriptInput.trim()}
                onClick={() => setAnalysisTranscript(manualTranscriptInput.trim())}
              >
                Analyser
              </button>
            </div>
          </div>
        )}

        {/* L'échange oral démarre tout seul dès que la première réponse est transcrite. */}
        {coachMode === 'ai' && !!analysisTranscript && !exchangeTranscript && (
          <OralExchange
            subject={currentQuestion?.text || ''}
            theme={customTopic ? '' : theme}
            difficulty={difficulty}
            firstAnswer={analysisTranscript}
            extraRemaining={EXTRA_MAX_PER_ROUND - extraUsed}
            onUseExtra={consumeExtraTime}
            helpRemaining={HELP_MAX_PER_ROUND - helpUsed}
            onUseHelp={() => setHelpUsed((n) => n + 1)}
            maxExchanges={config.exchanges || 4}
            onDone={(h) =>
              setExchangeTranscript(
                h.map((m) => `${m.role === 'user' ? 'TOI' : 'ADVERSAIRE'} : ${m.text}`).join('\n')
              )
            }
          />
        )}

        {coachMode === 'ai' && (
          <div style={{ marginTop: '1.5rem' }}>
            <AiFeedbackPanel
              game="debate"
              subject={
                exchangeTranscript.includes('ADVERSAIRE :')
                  ? `${currentQuestion?.text || ''} — échange oral avec un adversaire`
                  : (currentQuestion?.text || '')
              }
              transcript={exchangeTranscript}
              metrics={analysisMetrics}
              theme={theme}
              difficulty={difficulty}
            />
          </div>
        )}

        {coachMode !== 'ai' && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Auto-évaluation</h3>
            {DEBATE_SELF_EVAL_QUESTIONS.map((q) => (
              <label key={q.key} className="checklist-item">
                <input
                  type="checkbox"
                  checked={!!evaluation[q.key]}
                  onChange={(e) => handleEvalChange(q.key, e.target.checked)}
                />
                <span>{q.label}</span>
              </label>
            ))}
          </div>
        )}

        {coachMode !== 'ai' && feedback && <FeedbackBox>{feedback}</FeedbackBox>}

        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={handleNextRound}>
          {roundIndex + 1 >= rounds ? 'Terminer la session' : 'Manche suivante'}
        </button>
      </div>
    );
  }

  return (
    <div className="page game-container">
      <div className="game-header">
        <button type="button" className="btn btn-ghost" onClick={() => { cleanupMic(); navigate(-1); }} aria-label="Retour">
          <Icon name="back" size={20} />
        </button>
        <span>Manche {roundIndex + 1}/{rounds}</span>
      </div>

      <CoachBanner mode={coachMode} />

      <div className="question-display animate-fade-in">
        {currentQuestion?.text}
        <div style={{ marginTop: '1rem' }}>
          <SpeakButton text={currentQuestion?.text} />
        </div>
      </div>

      {phase === PHASES.REFLECTION && (
        <div style={{ textAlign: 'center' }}>
          <HelpPanel
            helpKey={`sujet-${roundIndex}`}
            remaining={HELP_MAX_PER_ROUND - helpUsed}
            onUse={() => setHelpUsed((n) => n + 1)}
            getRequest={() => ({
              subject: currentQuestion?.text || '',
              theme: customTopic ? '' : theme,
              difficulty,
              stage: 'sujet',
            })}
            onOpenChange={(open) => {
              if (open) reflectionTimer.pause();
              else if (reflectionTimer.seconds > 0) reflectionTimer.start();
            }}
          />
          <CircularTimer
            seconds={reflectionTimer.seconds}
            total={currentTiming.reflection}
            label="Temps pour réfléchir"
            color="var(--blue)"
          />
          <div className="tips-row">
            {REFLECTION_TIPS.map((tip) => (
              <span key={tip} className="tip-chip">{tip}</span>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReady}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.15rem',
                padding: '0.6rem 1.8rem',
                border: '1px solid rgba(139, 92, 246, 0.4)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Je suis prêt</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Répondre avant la fin du chrono</span>
            </button>
          </div>
        </div>
      )}

      {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

      {phase === PHASES.RESPONSE && (
        <div style={{ textAlign: 'center' }}>
          <CircularTimer
            seconds={responseTimer.seconds}
            total={currentTiming.response + responseExtraSeconds}
            label="Temps pour répondre"
            color="var(--violet)"
          />
          <div className="recording-indicator">
            <div className="recording-dot" />
            <Waveform active={isRecording} />
            <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>Enregistrement actif</span>
          </div>
          {micError && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{micError}</p>}
          <div>
            <ExtraTimeButton
              remaining={EXTRA_MAX_PER_ROUND - extraUsed}
              onUse={() => {
                if (!consumeExtraTime()) return;
                setResponseExtraSeconds((s) => s + EXTRA_SECONDS);
                responseTimer.setSeconds((s) => s + EXTRA_SECONDS);
              }}
            />
          </div>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleStopResponse}>
            Terminer ma réponse
          </button>
        </div>
      )}
    </div>
  );
}

export default DebateGame;

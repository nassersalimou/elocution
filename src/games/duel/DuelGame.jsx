import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import useTimer from '../../hooks/useTimer';
import CircularTimer from '../../components/ui/CircularTimer';
import Waveform from '../../components/ui/Waveform';
import AudioPlayer from '../../components/ui/AudioPlayer';
import Icon from '../../components/ui/Icon';
import { transcribeRecording } from '../../services/voiceAnalysis/voiceAnalysisService';
import { speak, stopSpeaking, isSpeaking } from '../../services/speechService';
import { duelTurn, duelTurnAudio, duelVerdict } from '../../services/aiCoachService';
import { recordDebate, rateTopic } from '../../services/topicProfileService';
import { awardXp } from '../../services/progressService';
import CoachBanner from '../../components/ui/CoachBanner';
import ReadAloudButton, { buildSpeech } from '../../components/ui/ReadAloudButton';

const MANUAL_EVAL_CRITERIA = [
  { id: 'counter', label: 'J’ai répondu à chaque contre-argument' },
  { id: 'example', label: 'J’ai donné au moins un exemple concret' },
  { id: 'pressure', label: 'J’ai traité les questions pièges' },
  { id: 'consistency', label: 'Je n’ai pas changé de position' },
  { id: 'conclusion', label: 'J’ai conclu clairement' },
];

const REFLECTION_TIMES = {
  debutant: 20,
  normal: 15,
  difficile: 10,
  intense: 6,
};

function getManualOpponentResponse(topic, userSide, turnIndex) {
  const opponentSide = userSide === 'pour' ? 'contre' : 'pour';
  const argsList = topic?.[opponentSide];
  const pressureList = topic?.pressure;

  const reply =
    (argsList && argsList[turnIndex]) ||
    'Ton argumentation comporte des angles morts et ne prend pas en compte les conséquences directes sur le terrain.';
  const pressure =
    (pressureList && pressureList[turnIndex]) ||
    'Quel est le point faible de ton propre argument ?';

  return { reply, pressure };
}

export function DuelGame({ config, onComplete, onRestart }) {
  const navigate = useNavigate();
  const {
    mode: initialMode,
    topic,
    userSide,
    maxTurns,
    timePerTurn,
    difficulty = 'normal',
  } = config;

  const reflectionSeconds = REFLECTION_TIMES[difficulty] || 15;

  const [gameMode, setGameMode] = useState(initialMode); // 'ai' | 'manual'
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState('prompt'); // 'prompt' | 'speaking' | 'reflect' | 'recording' | 'transcribing' | 'confirm' | 'thinking' | 'verdict'

  // Historique des échanges
  const [history, setHistory] = useState([]);
  const historyRef = useRef(history);
  historyRef.current = history;
  const requestIdRef = useRef(0);
  const [lastUnderstoodTranscript, setLastUnderstoodTranscript] = useState(null);

  const [currentOpponent, setCurrentOpponent] = useState(null); // { reply, pressure }
  const [opponentError, setOpponentError] = useState(null);

  // Prise de parole utilisateur
  const [userSpeechText, setUserSpeechText] = useState('');
  const userSpeechTextRef = useRef('');
  userSpeechTextRef.current = userSpeechText;

  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [speakingAi, setSpeakingAi] = useState(false);
  const [isAutoReflect, setIsAutoReflect] = useState(false);

  // Envoi automatique 4s en phase 'confirm'
  const [autoSendSeconds, setAutoSendSeconds] = useState(null);

  // Verdict final
  const [aiVerdict, setAiVerdict] = useState(null);
  const [manualChecks, setManualChecks] = useState({});
  const [finalScore, setFinalScore] = useState(0);
  const [themeRated, setThemeRated] = useState(false);
  const sessionRecordedRef = useRef(false);
  const sessionStartRef = useRef(0);

  const { isRecording, startRecording, stopRecording, error: micError, cleanup: cleanupMic } = useAudioRecorder();

  const cancelAutoSend = useCallback(() => {
    setAutoSendSeconds(null);
  }, []);

  // Déclaration des refs pour callbacks mutuels
  const handleStartRecordingRef = useRef(null);
  const handleSendUserTurnRef = useRef(null);

  // Minuteur de réflexion
  const reflectTimer = useTimer(reflectionSeconds, {
    onComplete: () => {
      handleStartRecordingRef.current?.();
    },
  });

  const startReflection = useCallback(() => {
    setPhase('reflect');
    reflectTimer.reset(reflectionSeconds);
    reflectTimer.start();
  }, [reflectTimer, reflectionSeconds]);

  const handleReadyFromReflect = useCallback(() => {
    reflectTimer.pause();
    handleStartRecordingRef.current?.();
  }, [reflectTimer]);

  // Lecture à voix haute
  const handleToggleSpeakReply = useCallback(
    (textToRead, options = {}) => {
      const thenReflect = Boolean(options.thenReflect);
      if (speakingAi || isSpeaking()) {
        stopSpeaking();
        setSpeakingAi(false);
        setIsAutoReflect(false);
        if (thenReflect) {
          startReflection();
        }
      } else {
        setIsAutoReflect(thenReflect);
        setSpeakingAi(true);
        if (thenReflect) {
          setPhase('speaking');
        }
        speak(textToRead, {
          onEnd: () => {
            setSpeakingAi(false);
            setIsAutoReflect(false);
            if (thenReflect) {
              startReflection();
            }
          },
        });
      }
    },
    [speakingAi, startReflection]
  );

  const handleSkipSpeaking = useCallback(() => {
    stopSpeaking();
    setSpeakingAi(false);
    setIsAutoReflect(false);
    startReflection();
  }, [startReflection]);

  // Minuteur de parole utilisateur
  const handleStopSpeakingAction = useCallback(async () => {
    const result = await stopRecording();
    if (result?.url) setAudioUrl(result.url);
    if (result?.blob) setAudioBlob(result.blob);

    // Mode IA et pas le dernier tour : envoi audio direct vers le coach (~4 s)
    if (gameMode === 'ai' && turn < maxTurns && result?.blob) {
      setPhase('thinking');
      const reqId = ++requestIdRef.current;
      const currentHistory = historyRef.current;

      const res = await duelTurnAudio({
        blob: result.blob,
        subject: topic.subject,
        userSide,
        theme: topic.theme || '',
        difficulty,
        history: currentHistory,
        turn,
        maxTurns,
      });

      if (reqId !== requestIdRef.current) return;

      if (res.ok && res.data) {
        const transcript = (res.data.transcript || '').trim();
        const reply = res.data.reply || '';
        const pressure = res.data.pressure || '';
        const aiTurnObj = { reply, pressure };

        const userMsg = { role: 'user', text: transcript || '(prise vocale)' };
        const aiMsg = { role: 'ai', text: `${reply} ${pressure}`.trim() };
        const nextHistory = [...currentHistory, userMsg, aiMsg];

        setHistory(nextHistory);
        historyRef.current = nextHistory;
        setCurrentOpponent(aiTurnObj);
        setLastUnderstoodTranscript(transcript || null);
        setTurn((t) => t + 1);
        setUserSpeechText('');

        // Enchaînement après réplique : lecture vocale -> phase 'reflect'
        handleToggleSpeakReply(reply, { thenReflect: true });
        return;
      }

      // Échec de duelTurnAudio (ok false) : message d'erreur et repli sur l'ancien chemin
      if (res.message) {
        setOpponentError(res.message);
      }
    }

    // Dernier tour OU mode manuel OU échec duelTurnAudio OU pas d'audio :
    // Transcription locale Whisper puis phase 'confirm'
    setPhase('transcribing');
    let transcribedText = '';
    if (result?.blob) {
      const res = await transcribeRecording(result.blob);
      if (res.success && res.data?.text && res.data.text.trim()) {
        transcribedText = res.data.text.trim();
        setUserSpeechText(transcribedText);
      }
    }
    setPhase('confirm');
    if (transcribedText) {
      setAutoSendSeconds(4);
    } else {
      setAutoSendSeconds(null);
    }
  }, [
    stopRecording,
    gameMode,
    turn,
    maxTurns,
    topic.subject,
    topic.theme,
    userSide,
    difficulty,
    handleToggleSpeakReply,
  ]);

  const timer = useTimer(timePerTurn, {
    onComplete: () => handleStopSpeakingAction(),
  });

  // Démarrer l'enregistrement
  const handleStartRecording = useCallback(async () => {
    cancelAutoSend();
    reflectTimer.pause();
    setAudioUrl(null);
    setAudioBlob(null);
    setUserSpeechText('');
    setLastUnderstoodTranscript(null);
    setPhase('recording');
    try {
      await startRecording();
    } catch {
      // Micro indisponible : continue en mode texte
    }
    timer.reset(timePerTurn);
    timer.start();
  }, [cancelAutoSend, reflectTimer, startRecording, timer, timePerTurn]);

  handleStartRecordingRef.current = handleStartRecording;

  // Refaire sa réponse si mal compris
  const handleRedoAnswer = useCallback(() => {
    requestIdRef.current += 1;
    stopSpeaking();
    setSpeakingAi(false);
    setIsAutoReflect(false);
    reflectTimer.pause();
    timer.pause();
    setLastUnderstoodTranscript(null);

    // Retire les 2 derniers messages de l'historique (user + ai)
    const prevHistory = historyRef.current.slice(0, -2);
    setHistory(prevHistory);
    historyRef.current = prevHistory;

    // Revient au tour précédent
    setTurn((t) => Math.max(1, t - 1));

    // Restaure la réplique précédente si tour > 1
    const lastAiMsg = [...prevHistory].reverse().find((m) => m.role === 'ai');
    if (lastAiMsg) {
      setCurrentOpponent({ reply: lastAiMsg.text, pressure: '' });
    } else {
      setCurrentOpponent(null);
    }

    // Relance directement l'enregistrement
    handleStartRecordingRef.current?.();
  }, [reflectTimer, timer]);

  const handleFinishEarly = () => {
    timer.pause();
    handleStopSpeakingAction();
  };

  // Envoi automatique 4s en phase 'confirm'
  useEffect(() => {
    if (autoSendSeconds === null || phase !== 'confirm') return;

    if (autoSendSeconds <= 0) {
      cancelAutoSend();
      handleSendUserTurnRef.current?.();
      return;
    }

    const timerId = setTimeout(() => {
      setAutoSendSeconds((s) => (s !== null ? s - 1 : null));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [autoSendSeconds, phase, cancelAutoSend]);

  // Finalisation et attribution d'XP
  const finalizeSession = useCallback(
    (score) => {
      if (sessionRecordedRef.current) return;
      sessionRecordedRef.current = true;

      const trainingSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const xp = 30 + Math.round(score / 5);

      awardXp(xp, {
        stat: 'improvisation',
        trainingSeconds,
        historyEntry: {
          game: 'duel',
          details: `${maxTurns} tours (${userSide})`,
          duration: trainingSeconds,
        },
      });

      recordDebate({
        subject: topic.subject,
        theme: topic.theme || 'societe',
        category: topic.category || 'liked',
        imposed: Boolean(topic.imposed),
        score,
      });
    },
    [maxTurns, topic.category, topic.imposed, topic.subject, topic.theme, userSide]
  );

  const triggerVerdict = useCallback(
    async (finalHistory) => {
      cancelAutoSend();
      reflectTimer.pause();
      timer.pause();
      stopSpeaking();
      setPhase('verdict');
      if (gameMode === 'ai') {
        const res = await duelVerdict({
          subject: topic.subject,
          userSide,
          history: finalHistory,
        });
        if (res.ok && res.data) {
          setAiVerdict(res.data);
          const score = typeof res.data.score === 'number' ? res.data.score : 70;
          setFinalScore(score);
          finalizeSession(score);
        } else {
          setOpponentError('Verdict IA indisponible. Utilise l’auto-évaluation ci-dessous.');
          setGameMode('manual');
        }
      }
    },
    [cancelAutoSend, reflectTimer, timer, gameMode, topic.subject, userSide, finalizeSession]
  );

  // Traiter la fin du tour quand l'utilisateur confirme son texte
  const handleSendUserTurn = useCallback(async () => {
    cancelAutoSend();
    reflectTimer.pause();
    timer.pause();
    const textToSend = userSpeechTextRef.current.trim();
    if (!textToSend) return;

    const currentHistory = historyRef.current;
    const newHistory = [...currentHistory, { role: 'user', text: textToSend }];
    setHistory(newHistory);
    historyRef.current = newHistory;

    // Si on a atteint le nombre maximum de tours -> Direction verdict
    if (turn >= maxTurns) {
      triggerVerdict(newHistory);
      return;
    }

    // Sinon -> Réponse de l'adversaire
    setPhase('thinking');
    if (gameMode === 'ai') {
      const res = await duelTurn({
        subject: topic.subject,
        theme: topic.theme || '',
        difficulty,
        userSide,
        history: newHistory,
        userText: textToSend,
        turn,
        maxTurns,
      });

      if (res.ok && res.data?.reply) {
        const reply = res.data.reply;
        const pressure = res.data.pressure || '';
        const aiTurnObj = { reply, pressure };
        setCurrentOpponent(aiTurnObj);
        const nextHistory = [...newHistory, { role: 'ai', text: `${reply} ${pressure}`.trim() }];
        setHistory(nextHistory);
        historyRef.current = nextHistory;
        setTurn((t) => t + 1);
        setUserSpeechText('');
        handleToggleSpeakReply(reply, { thenReflect: true });
      } else {
        // En cas d'erreur de quota ou hors ligne : bascule sur manuel
        setOpponentError(res.message || 'Le coach IA est indisponible. Bascule sur l’adversaire manuel.');
        setGameMode('manual');
        const manualResp = getManualOpponentResponse(topic, userSide, turn - 1);
        setCurrentOpponent(manualResp);
        const nextHistory = [...newHistory, { role: 'ai', text: `${manualResp.reply} ${manualResp.pressure}`.trim() }];
        setHistory(nextHistory);
        historyRef.current = nextHistory;
        setTurn((t) => t + 1);
        setUserSpeechText('');
        handleToggleSpeakReply(manualResp.reply, { thenReflect: true });
      }
    } else {
      // Mode manuel
      const manualResp = getManualOpponentResponse(topic, userSide, turn - 1);
      setCurrentOpponent(manualResp);
      const nextHistory = [...newHistory, { role: 'ai', text: `${manualResp.reply} ${manualResp.pressure}`.trim() }];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      setTurn((t) => t + 1);
      setUserSpeechText('');
      handleToggleSpeakReply(manualResp.reply, { thenReflect: true });
    }
  }, [
    cancelAutoSend,
    reflectTimer,
    timer,
    turn,
    maxTurns,
    gameMode,
    topic,
    userSide,
    difficulty,
    triggerVerdict,
    handleToggleSpeakReply,
  ]);

  handleSendUserTurnRef.current = handleSendUserTurn;

  // Nettoyage audio, timers et micro au démontage
  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => {
      cancelAutoSend();
      reflectTimer.pause();
      timer.pause();
      cleanupMic();
      stopSpeaking();
    };
  }, [cleanupMic, cancelAutoSend, reflectTimer, timer]);

  const handleManualCheckToggle = (id) => {
    const updated = { ...manualChecks, [id]: !manualChecks[id] };
    setManualChecks(updated);

    const checkedCount = MANUAL_EVAL_CRITERIA.filter((c) => updated[c.id]).length;
    const score = Math.round((checkedCount / MANUAL_EVAL_CRITERIA.length) * 100);
    setFinalScore(score);
    finalizeSession(score);
  };

  // --- RENDU : VERDICT FINAL ---
  if (phase === 'verdict') {
    return (
      <div className="page game-container animate-fade-in">
        <CoachBanner mode={gameMode} />
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Verdict du duel ⚔️</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {topic.subject} ({userSide.toUpperCase()})
        </p>

        {/* VERDICT IA */}
        {gameMode === 'ai' && aiVerdict ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--violet-light)' }}>
                {finalScore} / 100
              </div>
              <ReadAloudButton
                label="Écouter le verdict"
                text={() =>
                  buildSpeech([
                    { title: 'Score', content: `${finalScore} sur 100` },
                    { title: 'Conseil', content: aiVerdict.advice },
                    { title: 'Tes meilleurs arguments', content: aiVerdict.bestArguments || [] },
                    { title: 'Tes points faibles', content: aiVerdict.weakPoints || [] },
                    { title: 'Questions esquivées', content: aiVerdict.dodged || [] },
                  ])
                }
              />
            </div>

            {aiVerdict.advice && (
              <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '1rem', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--violet)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--violet-light)', marginBottom: '0.2rem' }}>
                  Conseil du coach
                </div>
                <p style={{ fontSize: '0.95rem' }}>{aiVerdict.advice}</p>
              </div>
            )}

            {aiVerdict.bestArguments?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Points forts & meilleurs arguments
                </div>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                  {aiVerdict.bestArguments.map((arg, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{arg}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiVerdict.weakPoints?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Failles logiques & points faibles
                </div>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                  {aiVerdict.weakPoints.map((arg, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{arg}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiVerdict.dodged?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Ce que tu as esquivé
                </div>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                  {aiVerdict.dodged.map((arg, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{arg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* VERDICT MANUEL */
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Auto-évaluation du duel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {MANUAL_EVAL_CRITERIA.map((c) => (
                <label key={c.id} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={!!manualChecks[c.id]}
                    onChange={() => handleManualCheckToggle(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--violet-light)' }}>
              Score : {finalScore} / 100
            </div>
          </div>
        )}

        {/* FEEDBACK THEME */}
        <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
            Thème : <strong>{topic.theme || 'Société'}</strong>
          </span>
          {!themeRated ? (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  rateTopic(topic.theme || 'societe', true);
                  setThemeRated(true);
                }}
              >
                👍 J’ai aimé ce thème
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  rateTopic(topic.theme || 'societe', false);
                  setThemeRated(true);
                }}
              >
                👎 Pas mon truc
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--violet-light)', fontStyle: 'italic' }}>
              Merci, le coach s’adaptera.
            </span>
          )}
        </div>

        {/* HISTORIQUE DÉPLIABLE DU DUEL */}
        <details className="card" style={{ marginBottom: '1.5rem', cursor: 'pointer' }}>
          <summary style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            📜 Voir l’historique complet des échanges ({history.length})
          </summary>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((h, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius)',
                  background: h.role === 'user' ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-secondary)',
                  borderLeft: h.role === 'user' ? '3px solid var(--violet)' : '3px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: h.role === 'user' ? 'var(--violet-light)' : 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  {h.role === 'user' ? `Toi (${userSide.toUpperCase()})` : 'Adversaire'}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{h.text}</div>
              </div>
            ))}
          </div>
        </details>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => (onRestart ? onRestart() : window.location.reload())}
          >
            Rejouer
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => (onComplete ? onComplete() : navigate('/'))}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // --- RENDU : DÉROULEMENT DU DUEL (TOURS 1 à maxTurns) ---
  return (
    <div className="page game-container">
      <div className="game-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            cancelAutoSend();
            reflectTimer.pause();
            timer.pause();
            cleanupMic();
            stopSpeaking();
            navigate(-1);
          }}
          aria-label="Retour"
        >
          <Icon name="back" size={20} />
        </button>
        <span>
          Tour {turn} / {maxTurns}
        </span>
      </div>

      <CoachBanner mode={gameMode} />

      {opponentError && (
        <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--orange)', borderRadius: 'var(--radius)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {opponentError}
        </div>
      )}

      {/* RAPPEL DU SUJET ET DU CAMP */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--violet-light)', fontWeight: 700, textTransform: 'uppercase' }}>
              Sujet du duel
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {topic.subject}
            </div>
          </div>
          <span className={`badge ${userSide === 'pour' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.85rem' }}>
            Tu es {userSide.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ADVERSAIRE / CONSIGNE DU TOUR */}
      {turn === 1 ? (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '1.5rem', textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--violet-light)', marginBottom: '0.4rem' }}>
            Ouvre le débat
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            Donne ta thèse et ton meilleur argument pour défendre ta position.
          </p>
        </div>
      ) : (
        currentOpponent && (
          <>
            {gameMode === 'ai' && lastUnderstoodTranscript && (
              <div
                className="card animate-fade-in"
                style={{
                  marginBottom: '1rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Ce que le coach a compris :
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRedoAnswer}
                    style={{ fontSize: '0.8rem', color: 'var(--violet-light)', padding: '0.2rem 0.5rem' }}
                  >
                    Il m'a mal compris → refaire ma réponse
                  </button>
                </div>
                <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  « {lastUnderstoodTranscript} »
                </div>
              </div>
            )}
            <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--violet)', marginBottom: '1.5rem', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase' }}>
                  Réplique de l’adversaire
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (speakingAi && isAutoReflect) {
                      handleSkipSpeaking();
                    } else {
                      handleToggleSpeakReply(currentOpponent.reply);
                    }
                  }}
                  style={{ padding: '0.2rem 0.5rem' }}
                >
                  {speakingAi ? (isAutoReflect ? '⏭️ Passer la lecture' : '🔇 Couper') : '🔊 Écouter'}
                </button>
              </div>
              <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                « {currentOpponent.reply} »
              </p>
              {currentOpponent.pressure && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                    🎯 Question piège à traiter :
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {currentOpponent.pressure}
                  </span>
                </div>
              )}
            </div>
          </>
        )
      )}

      {/* PHASE LECTURE DE L'ADVERSAIRE */}
      {phase === 'speaking' && (
        <div
          className="card animate-fade-in"
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--violet-light)', fontWeight: 600 }}>
            <span className="recording-dot" style={{ background: 'var(--violet)' }} />
            <span>L’adversaire prend la parole...</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSkipSpeaking}
          >
            ⏭️ Passer la lecture
          </button>
        </div>
      )}

      {/* PHASE RÉFLEXION */}
      {phase === 'reflect' && (
        <div
          className="card animate-fade-in"
          style={{
            textAlign: 'center',
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            border: '1px solid var(--violet)',
            background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.08) 100%)',
          }}
        >
          <CircularTimer
            seconds={reflectTimer.seconds}
            total={reflectionSeconds}
            label="Réflexion"
            color="var(--violet)"
          />
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--violet-light)' }}>
              Réfléchis… {reflectTimer.seconds} s
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
              Prépare ton argumentation face à la réplique et traite la question piège.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ minWidth: '220px', padding: '0.85rem 2rem', fontWeight: 700 }}
            onClick={handleReadyFromReflect}
          >
            ⚡ Je suis prêt
          </button>
        </div>
      )}

      {/* PHASE ATTENTE : BOUTON PARLER OU SAISIR DIRECT */}
      {phase === 'prompt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ minWidth: '220px', padding: '1rem 2rem' }}
            onClick={handleStartRecording}
          >
            🎙️ Parler ({timePerTurn}s)
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPhase('confirm')}
          >
            ✏️ Écrire ma réponse au clavier
          </button>
        </div>
      )}

      {/* PHASE ENREGISTREMENT */}
      {phase === 'recording' && (
        <div style={{ textAlign: 'center' }}>
          <CircularTimer
            seconds={timer.seconds}
            total={timePerTurn}
            label="Temps de parole"
            color="var(--violet)"
          />
          <div className="recording-indicator" style={{ margin: '1rem 0' }}>
            <div className="recording-dot" />
            <Waveform active={isRecording} />
            <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>Enregistrement en cours</span>
          </div>
          {micError && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>{micError}</p>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleFinishEarly}
          >
            J’ai fini
          </button>
        </div>
      )}

      {/* PHASE TRANSCRIPTION */}
      {phase === 'transcribing' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600 }}>Transcription de ta prise de parole...</p>
        </div>
      )}

      {/* PHASE CONFIRMATION & TEXTAREA REPLI */}
      {phase === 'confirm' && (
        <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {audioUrl && <AudioPlayer src={audioUrl} label="Ta prise" />}

          {autoSendSeconds !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid var(--violet)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="recording-dot" style={{ background: 'var(--violet)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  Envoi dans {autoSendSeconds} s…
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={cancelAutoSend}
                >
                  ✏️ Modifier
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSendUserTurn()}
                >
                  Envoyer 🚀
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="user-speech-input">
              {audioBlob ? 'Vérifie ou ajuste la transcription de ton argument :' : 'Écris ton argument :'}
            </label>
            <textarea
              id="user-speech-input"
              className="input textarea"
              value={userSpeechText}
              onChange={(e) => {
                cancelAutoSend();
                setUserSpeechText(e.target.value);
              }}
              placeholder="Exprime ici ton argument avec clarté..."
              rows={4}
            />
          </div>

          {autoSendSeconds === null && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => handleSendUserTurn()}
              disabled={!userSpeechText.trim()}
            >
              Envoyer mon argument 🚀
            </button>
          )}
        </div>
      )}

      {/* PHASE ATTENTE DE L'IA */}
      {phase === 'thinking' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600 }}>L’adversaire t’a écouté et prépare sa réponse…</p>
        </div>
      )}
    </div>
  );
}

export default DuelGame;

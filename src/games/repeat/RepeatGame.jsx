import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Waveform from '../../components/ui/Waveform';
import CircularTimer from '../../components/ui/CircularTimer';
import { speak, stopSpeaking } from '../../services/speechService';
import { transcribeRecording } from '../../services/voiceAnalysis/voiceAnalysisService';
import { getPhrases } from '../../services/aiCoachService';
import { getFallbackPhrases, PHRASE_TYPE_LABELS } from '../../data/repeatPhrases';
import {
  countErrors,
  timeLimitFor,
  roundPenalty,
  recordTypeResult,
  getWeakTypes,
} from '../../utils/repeatScoring';
import { awardXp } from '../../services/progressService';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import useTimer from '../../hooks/useTimer';
import audioRecorder from '../../services/audioService';
import { createVoiceActivityMonitor } from '../../utils/speechActivity';

// Au-delà de la limite de temps, on coupe de toute façon après ce délai (s).
const HARD_STOP_GRACE_SECONDS = 8;

export function RepeatGame({ quickMode = false, onComplete }) {
  const navigate = useNavigate();

  // Configuration du jeu
  const [phase, setPhase] = useState(quickMode ? 'loading' : 'config'); // 'config' | 'loading' | 'listen' | 'record' | 'transcribing' | 'check' | 'end'
  const [startLevel, setStartLevel] = useState(1);
  const [showPhraseText, setShowPhraseText] = useState(false);

  // Données de partie
  const [phrases, setPhrases] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [points, setPoints] = useState(100);
  const [isFallback, setIsFallback] = useState(false);
  const [relistenUsed, setRelistenUsed] = useState(false);

  // Résultats de la manche en cours
  const [roundResult, setRoundResult] = useState(null);
  const [successfulRounds, setSuccessfulRounds] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);

  // Horodatage & Refs
  const sessionStartRef = useRef(Date.now());
  const recordStartRef = useRef(0);
  const hasFinishedRef = useRef(false);

  // Détection de fin de parole : l'audio décide quand c'est fini et combien de temps on a mis.
  const stopMonitorRef = useRef(null);
  const hardStopRef = useRef(null);
  const speechRef = useRef({ startAt: null, lastVoiceAt: null });
  const finishingRef = useRef(false);
  const finishRef = useRef(null);

  const stopMonitor = useCallback(() => {
    if (stopMonitorRef.current) stopMonitorRef.current();
    stopMonitorRef.current = null;
    if (hardStopRef.current) clearTimeout(hardStopRef.current);
    hardStopRef.current = null;
  }, []);

  // Audio & Micro
  const { isRecording, startRecording, stopRecording, error: micError, cleanup: cleanupMic } = useAudioRecorder();

  // Nettoyage au démontage
  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => {
      stopSpeaking();
      stopMonitor();
      cleanupMic();
    };
  }, [cleanupMic, stopMonitor]);

  const currentPhrase = phrases[currentIndex] || null;
  const currentLimit = currentPhrase ? timeLimitFor(currentPhrase.text, currentPhrase.level) : 5;

  // Minuteur de la prise de parole (informatif, n'interrompt pas brutalement)
  const timer = useTimer(currentLimit, {});

  // Démarrer l'enregistrement vocal
  const handleStartRecording = useCallback(async () => {
    stopSpeaking();
    stopMonitor();
    finishingRef.current = false;
    speechRef.current = { startAt: null, lastVoiceAt: null };
    recordStartRef.current = Date.now();
    setPhase('record');
    try {
      await startRecording();
      // Coupe tout seul quand la voix s'arrête (ou, au pire, un peu après la limite de temps).
      stopMonitorRef.current = createVoiceActivityMonitor(audioRecorder.activeStream, (info) => {
        speechRef.current = { startAt: info.speechStartAt, lastVoiceAt: info.lastVoiceAt };
        if (info.speechEnded && finishRef.current) finishRef.current();
      });
      hardStopRef.current = setTimeout(() => {
        if (finishRef.current) finishRef.current();
      }, (currentLimit + HARD_STOP_GRACE_SECONDS) * 1000);
    } catch {
      // Micro indisponible
    }
    timer.reset(currentLimit);
    timer.start();
  }, [currentLimit, startRecording, timer, stopMonitor]);

  // Écouter la phrase à voix haute
  const playCurrentPhrase = useCallback((text) => {
    if (!text) return;
    setPhase('listen');
    speak(text, {
      onEnd: () => {
        handleStartRecording();
      },
    });
  }, [handleStartRecording]);

  // Lancement de la partie : récupération des phrases (IA puis fallback)
  const handleStartGame = useCallback(async (levelToStart = startLevel) => {
    setPhase('loading');
    setPoints(100);
    setCurrentIndex(0);
    setSuccessfulRounds(0);
    setRoundResult(null);
    setRelistenUsed(false);
    hasFinishedRef.current = false;

    const weak = getWeakTypes();
    let loadedPhrases = [];
    let usedFallback = false;

    try {
      const res = await getPhrases({
        startLevel: levelToStart,
        count: 10,
        weakTypes: weak,
      });
      if (res?.ok && Array.isArray(res.data?.phrases) && res.data.phrases.length > 0) {
        loadedPhrases = res.data.phrases;
      }
    } catch {
      // Erreur réseau ou API
    }

    if (!loadedPhrases || loadedPhrases.length === 0) {
      loadedPhrases = getFallbackPhrases(levelToStart, 10);
      usedFallback = true;
    }

    setPhrases(loadedPhrases);
    setIsFallback(usedFallback);

    if (loadedPhrases.length > 0) {
      playCurrentPhrase(loadedPhrases[0].text);
    }
  }, [startLevel, playCurrentPhrase]);

  // Si quickMode = true, lancer directement
  useEffect(() => {
    if (quickMode && phase === 'loading' && phrases.length === 0) {
      handleStartGame(1);
    }
  }, [quickMode, phase, phrases.length, handleStartGame]);

  // Bouton Réécouter (-3 points, une fois par manche)
  const handleRelisten = () => {
    if (relistenUsed || points <= 3 || !currentPhrase) return;
    setRelistenUsed(true);
    setPoints((p) => Math.max(0, p - 3));
    stopSpeaking();
    playCurrentPhrase(currentPhrase.text);
  };

  // Fin de prise de parole par l'utilisateur
  const handleFinishRecording = async () => {
    if (finishingRef.current) return; // coupure automatique et clic sur « Terminer » en même temps
    finishingRef.current = true;
    stopMonitor();
    timer.pause();
    setPhase('transcribing');
    // Le dernier instant où l'on a entendu la voix décide si la phrase était finie à temps ;
    // sans voix détectée, on se rabat sur l'instant du clic.
    const lastVoiceAt = speechRef.current.lastVoiceAt;
    const spokenUntil = lastVoiceAt ?? Date.now();
    const elapsedSeconds = (spokenUntil - recordStartRef.current) / 1000;
    const overTime = elapsedSeconds > currentLimit;

    let transcription = '';
    const recResult = await stopRecording();
    if (recResult?.blob) {
      try {
        const res = await transcribeRecording(recResult.blob);
        if (res?.success && res.data?.text && res.data.text.trim()) {
          transcription = res.data.text.trim();
        }
      } catch {
        // Échec transcription
      }
    }

    if (!currentPhrase) return;

    if (transcription) {
      const errStats = countErrors(currentPhrase.text, transcription, currentPhrase.level);
      const penalty = roundPenalty({ errors: errStats.errors, overTime, level: currentPhrase.level });
      recordTypeResult(currentPhrase.type, errStats.errors);

      const nextPoints = Math.max(0, points - penalty);
      setPoints(nextPoints);

      const isPerfect = errStats.errors === 0 && !overTime;
      if (isPerfect) {
        setSuccessfulRounds((s) => s + 1);
      }

      setRoundResult({
        transcription,
        errors: errStats.errors,
        missing: errStats.missing,
        extra: errStats.extra,
        substituted: errStats.substituted,
        overTime,
        penalty,
        failed: false,
      });
    } else {
      // Transcription indisponible ou aucun son : pas de points retirés
      setRoundResult({
        transcription: '',
        errors: 0,
        overTime,
        penalty: 0,
        failed: true,
      });
    }

    setPhase('check');
  };
  finishRef.current = handleFinishRecording;

  // Fin du jeu et attribution de l'XP
  const triggerEndGame = useCallback((finalPoints = points) => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    stopSpeaking();
    cleanupMic();
    setPhase('end');

    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const xp = Math.max(10, 20 + Math.round(finalPoints / 2) + successfulRounds * 5);
    setEarnedXp(xp);

    const maxLevelReached = phrases[currentIndex]?.level || startLevel;

    if (!onComplete) {
      awardXp(xp, {
        stat: 'conscienceOrale',
        trainingSeconds: duration,
        historyEntry: {
          game: 'repeat',
          details: `Niveau ${maxLevelReached} · ${finalPoints} pts`,
          duration,
        },
      });
    } else {
      onComplete({
        points: finalPoints,
        successfulRounds,
        maxLevel: maxLevelReached,
      });
    }
  }, [points, successfulRounds, phrases, currentIndex, startLevel, onComplete, cleanupMic]);

  // Passage à la manche suivante
  const handleNextRound = () => {
    if (points <= 0 || currentIndex >= phrases.length - 1) {
      triggerEndGame(points);
      return;
    }

    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    setRoundResult(null);
    setRelistenUsed(false);
    playCurrentPhrase(phrases[nextIdx].text);
  };

  // --- RENDU : CONFIGURATION ---
  if (phase === 'config') {
    const weakList = getWeakTypes();
    return (
      <div className="page game-container animate-fade-in">
        <div className="game-header">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
            aria-label="Retour"
          >
            <Icon name="back" size={20} />
          </button>
          <h1>Répète la phrase</h1>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Écoute la phrase, répète-la à l'oral sans erreur et avant la fin du temps.
          100 points au départ, chaque erreur coûte des points. Le temps baisse à chaque manche,
          et dès le niveau 5 les phrases s'allongent, le chrono se resserre et chaque erreur coûte de plus en plus cher.
        </p>

        {/* NIVEAU DE DÉPART */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">Niveau de départ (1 à 10)</label>
          <div className="option-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`option-btn ${startLevel === lvl ? 'selected' : ''}`}
                style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 700 }}
                onClick={() => setStartLevel(lvl)}
              >
                Niv. {lvl}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>
            {startLevel === 1 ? 'Progression normale de 1 à 10.' : `Démarrage direct au niveau ${startLevel} pour plus de défi.`}
          </span>
        </div>

        {/* AFFICHER LA PHRASE */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">Afficher la phrase écrite</label>
          <div className="option-grid">
            <button
              type="button"
              className={`option-btn ${!showPhraseText ? 'selected' : ''}`}
              onClick={() => setShowPhraseText(false)}
            >
              Non (audio seul 🎧)
            </button>
            <button
              type="button"
              className={`option-btn ${showPhraseText ? 'selected' : ''}`}
              onClick={() => setShowPhraseText(true)}
            >
              Oui (texte visible 👁️)
            </button>
          </div>
        </div>

        {/* POINTS FAIBLES DÉTECTÉS */}
        {weakList.length > 0 && (
          <div className="card" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid var(--violet)', marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
              🎯 Tes points faibles travaillés :
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {weakList.map((wt) => (
                <span key={wt} className="badge badge-violet" style={{ fontSize: '0.85rem' }}>
                  {PHRASE_TYPE_LABELS[wt] || wt}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg btn-block"
          onClick={() => handleStartGame(startLevel)}
        >
          C'est parti 🚀
        </button>
      </div>
    );
  }

  // --- RENDU : CHARGEMENT ---
  if (phase === 'loading') {
    return (
      <div className="page game-container animate-fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
        <h2>Préparation des phrases...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Le coach sélectionne 10 défis d'élocution adaptés à ton niveau.</p>
      </div>
    );
  }

  // --- RENDU : BILAN FINAL ---
  if (phase === 'end') {
    const weakList = getWeakTypes();
    const isEliminated = points <= 0;
    const maxLevel = phrases[currentIndex]?.level || startLevel;

    return (
      <div className="page game-container animate-fade-in">
        <div className="game-header">
          <h1>{isEliminated ? 'Plus de points ! 💥' : 'Partie terminée ! 🏆'}</h1>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: isEliminated ? 'var(--red)' : 'var(--violet-light)', marginBottom: '0.25rem' }}>
            {points} / 100
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Points restants
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1.75rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{successfulRounds} / {phrases.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manches parfaites</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Niveau {maxLevel}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Niveau atteint</div>
            </div>
          </div>

          {earnedXp > 0 && !onComplete && (
            <div style={{ marginTop: '1.25rem', color: 'var(--green)', fontWeight: 700, fontSize: '1.1rem' }}>
              +{earnedXp} XP gagnés
            </div>
          )}
        </div>

        {/* POINTS FAIBLES */}
        {weakList.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
              📊 Tes points faibles à surveiller :
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {weakList.map((wt) => (
                <span key={wt} className="badge badge-orange" style={{ fontSize: '0.85rem' }}>
                  {PHRASE_TYPE_LABELS[wt] || wt}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => handleStartGame(startLevel)}
          >
            Rejouer 🔁
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate('/entrainement')}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // --- RENDU EN COURS DE JEU (listen, record, transcribing, check) ---
  const healthPercent = Math.max(0, Math.min(100, points));
  const healthColor = healthPercent > 60 ? 'var(--green)' : healthPercent > 30 ? 'var(--orange)' : 'var(--red)';

  return (
    <div className="page game-container">
      {/* HEADER DE MANCHE */}
      <div className="game-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            stopSpeaking();
            stopMonitor();
            cleanupMic();
            navigate(-1);
          }}
          aria-label="Quitter"
        >
          <Icon name="back" size={20} />
        </button>
        <span>
          Manche {currentIndex + 1} / {phrases.length}
        </span>
        <span className="badge badge-violet" style={{ fontSize: '0.8rem' }}>
          Niveau {currentPhrase?.level || startLevel}
        </span>
      </div>

      {/* BARRE DE VIE & POINTS RESTANTS */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {isFallback && <span style={{ marginRight: '0.5rem', color: 'var(--text-secondary)' }}>• Secours</span>}
            {currentPhrase && (PHRASE_TYPE_LABELS[currentPhrase.type] || currentPhrase.type)}
          </span>
          <span style={{ fontWeight: 800, color: healthColor, fontSize: '0.95rem' }}>
            {points} / 100 pts
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${healthPercent}%`,
              height: '100%',
              background: healthColor,
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* PHASE 'LISTEN' */}
      {phase === 'listen' && (
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '2rem 1.5rem', border: '1px solid var(--violet)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎧</div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--violet-light)', marginBottom: '0.75rem' }}>
            Écoute attentivement...
          </h2>

          {showPhraseText ? (
            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1rem 0', lineHeight: 1.5 }}>
              « {currentPhrase?.text} »
            </p>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: 'var(--radius)', margin: '1rem 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Phrase masquée (écoute et mémorise)
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRelisten}
              disabled={relistenUsed || points <= 3}
            >
              🔁 Réécouter (-3 pts)
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleStartRecording}
            >
              🎙️ Parler maintenant
            </button>
          </div>
        </div>
      )}

      {/* PHASE 'RECORD' */}
      {phase === 'record' && (
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <CircularTimer
            seconds={timer.seconds}
            total={currentLimit}
            label="Temps limite"
            color="var(--violet)"
          />

          {timer.seconds === 0 && (
            <div style={{ margin: '0.75rem 0', padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderRadius: 'var(--radius)', fontSize: '0.85rem', fontWeight: 700 }}>
              ⏱️ Temps limite dépassé : si tu parles encore, +10 pts de pénalité. Termine ta phrase !
            </div>
          )}

          <div className="recording-indicator" style={{ margin: '1.25rem 0' }}>
            <div className="recording-dot" />
            <Waveform active={isRecording} />
            <span style={{ fontSize: '0.85rem', color: 'var(--red)', fontWeight: 600 }}>Répète la phrase à voix haute</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 1rem' }}>
            L'enregistrement s'arrête tout seul quand tu as fini de parler.
          </p>

          {micError && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>{micError}</p>}

          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ minWidth: '200px', fontWeight: 700 }}
            onClick={handleFinishRecording}
          >
            Terminer ⏹️
          </button>
        </div>
      )}

      {/* PHASE 'TRANSCRIBING' */}
      {phase === 'transcribing' && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, fontSize: '1rem' }}>Vérification de ta répétition...</p>
        </div>
      )}

      {/* PHASE 'CHECK' : RÉSULTATS DE LA MANCHE */}
      {phase === 'check' && roundResult && (
        <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* STATUT ET PÉNALITÉ */}
          {roundResult.failed ? (
            <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--orange)', borderRadius: 'var(--radius)', fontWeight: 600 }}>
              Transcription indisponible — aucun point retiré.
            </div>
          ) : roundResult.errors === 0 && !roundResult.overTime ? (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: 'var(--radius)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯</span>
              <span>Répétition parfaite ! (0 pt perdu)</span>
            </div>
          ) : (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 'var(--radius)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {roundResult.overTime ? '⏱️ Trop lent ! ' : ''}
                {roundResult.errors > 0 ? `${roundResult.errors} erreur${roundResult.errors > 1 ? 's' : ''}` : ''}
              </span>
              <span>- {roundResult.penalty} pts</span>
            </div>
          )}

          {/* DÉTAIL DES TEXTES */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase' }}>
              Phrase attendue
            </span>
            <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              « {currentPhrase?.text} »
            </p>
          </div>

          {roundResult.transcription && (
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Ce qui a été compris
              </span>
              <p style={{ fontSize: '0.95rem', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
                « {roundResult.transcription} »
              </p>
            </div>
          )}

          {/* ALERTE FIN DE POINTS */}
          {points <= 0 && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red)', borderRadius: 'var(--radius)', fontWeight: 800, textAlign: 'center' }}>
              💥 Plus de points ! Tu n'as plus d'énergie.
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            onClick={handleNextRound}
          >
            {points <= 0 || currentIndex >= phrases.length - 1 ? 'Voir les résultats 🏆' : 'Manche suivante ➡️'}
          </button>
        </div>
      )}
    </div>
  );
}

export default RepeatGame;

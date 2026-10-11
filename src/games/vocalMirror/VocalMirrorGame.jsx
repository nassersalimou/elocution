import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRandomMirrorMission, MIRROR_CHECKLIST } from '../../data/mirrorMissions';
import { getMirrorFeedback } from '../../services/feedbackEngine';
import { awardXp } from '../../services/progressService';
import { XP_REWARDS } from '../../utils/xpUtils';
import { getCoachMode } from '../../services/aiCoachService';
import useTimer from '../../hooks/useTimer';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import Countdown from '../../components/ui/Countdown';
import Waveform from '../../components/ui/Waveform';
import AudioPlayer from '../../components/ui/AudioPlayer';
import VoiceAnalysisReport from '../../components/ui/VoiceAnalysisReport';
import { analyzeVoiceRecording } from '../../services/voiceAnalysis/voiceAnalysisService';
import Icon from '../../components/ui/Icon';
import CoachModeToggle from '../../components/ui/CoachModeToggle';
import AiVoicePanel from '../../components/ui/AiVoicePanel';
import CoachBanner from '../../components/ui/CoachBanner';
import FeedbackBox from '../../components/ui/FeedbackBox';

const PHASES = {
  MISSION: 'mission',
  PREP: 'prep',
  COUNTDOWN: 'countdown',
  RECORD1: 'record1',
  REVIEW1: 'review1',
  GOALS: 'goals',
  RECORD2: 'record2',
  COMPARE: 'compare',
  END: 'end',
};

export function VocalMirrorGame({ _quickMode = false, onComplete }) {
  const navigate = useNavigate();
  const [coachMode, setCoachMode] = useState(() => getCoachMode('mirror'));
  const [phase, setPhase] = useState(PHASES.MISSION);
  const [mission] = useState(() => getRandomMirrorMission());
  const [showCountdown, setShowCountdown] = useState(false);
  const [takeNumber, setTakeNumber] = useState(1);
  const [audio1, setAudio1] = useState(null);
  const [audio2, setAudio2] = useState(null);
  const [blob1, setBlob1] = useState(null);
  const [blob2, setBlob2] = useState(null);
  const [analysis1, setAnalysis1] = useState(null);
  const [analysis2, setAnalysis2] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [goals, setGoals] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [progress, setProgress] = useState('');
  const sessionStartRef = useRef(0);

  const blobs1 = useMemo(() => (blob1 ? [blob1] : []), [blob1]);
  const blobs12 = useMemo(() => (blob1 && blob2 ? [blob1, blob2] : []), [blob1, blob2]);

  const { isRecording, startRecording, stopRecording, cleanup, error: micError } = useAudioRecorder();
  const prepTimer = useTimer(10, { onComplete: () => { setShowCountdown(true); setPhase(PHASES.COUNTDOWN); } });
  const recordTimer = useTimer(45, {
    onComplete: () => handleStopRecord(),
  });

  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => cleanup();
  }, [cleanup]);

  const handleCountdownComplete = useCallback(async () => {
    setShowCountdown(false);
    setPhase(takeNumber === 1 ? PHASES.RECORD1 : PHASES.RECORD2);
    try {
      await startRecording();
      recordTimer.reset(45);
      recordTimer.start();
    } catch {
      setPhase(takeNumber === 1 ? PHASES.REVIEW1 : PHASES.COMPARE);
    }
  }, [takeNumber, startRecording, recordTimer]);

  const handleStopRecord = useCallback(async () => {
    recordTimer.pause();
    const result = await stopRecording();
    if (takeNumber === 1) {
      if (result?.url) setAudio1(result.url);
      if (result?.blob) setBlob1(result.blob);
      setPhase(PHASES.REVIEW1);
    } else {
      if (result?.url) setAudio2(result.url);
      if (result?.blob) {
        setBlob2(result.blob);
        analyzeVoiceRecording(result.blob).then((res) => {
          if (res.success && res.data) setAnalysis2(res.data);
        }).catch(() => {});
      }
      setPhase(PHASES.COMPARE);
    }
  }, [stopRecording, recordTimer, takeNumber]);

  const handleStartPrep = () => {
    setPhase(PHASES.PREP);
    prepTimer.reset(10);
    prepTimer.start();
  };

  const handleStartTake2 = () => {
    setTakeNumber(2);
    setShowCountdown(true);
    setPhase(PHASES.COUNTDOWN);
  };

  const handleChecklistSubmit = () => {
    const selectedGoals = getMirrorFeedback(checklist);
    setGoals(selectedGoals);
    setPhase(PHASES.GOALS);
  };

  const handleCompareSubmit = () => {
    const trainingSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    if (!onComplete) {
      awardXp(XP_REWARDS.SESSION_COMPLETE + XP_REWARDS.EXERCISE_COMPLETE, {
        stat: 'conscienceOrale',
        trainingSeconds,
        historyEntry: {
          game: 'mirror',
          details: '2 prises comparées',
          duration: trainingSeconds,
        },
      });
    }
    setPhase(PHASES.END);
  };

  if (phase === PHASES.MISSION) {
    return (
      <div className="page game-container">
        <div className="game-header">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}><Icon name="back" size={20} /></button>
          <h1>Miroir Vocal</h1>
        </div>
        <CoachBanner mode={coachMode} />
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Mission</h2>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.6 }}>{mission}</p>
        </div>
        <div style={{ margin: '1.25rem 0' }}>
          <CoachModeToggle gameId="mirror" value={coachMode} onChange={setCoachMode} />
        </div>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '1rem 0' }}>10 secondes de préparation, puis 45 secondes pour parler.</p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleStartPrep}>COMMENCER</button>
      </div>
    );
  }

  if (phase === PHASES.PREP) {
    return (
      <div className="page game-container" style={{ textAlign: 'center' }}>
        <h2>Prépare-toi</h2>
        <p className="question-display" style={{ margin: '1.5rem 0' }}>{mission}</p>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--blue)' }}>{prepTimer.seconds}</div>
      </div>
    );
  }

  if (showCountdown) {
    return <Countdown onComplete={handleCountdownComplete} />;
  }

  if (phase === PHASES.RECORD1 || phase === PHASES.RECORD2) {
    return (
      <div className="page game-container" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{phase === PHASES.RECORD1 ? 'PRISE 1' : 'PRISE 2'}</p>
        <p style={{ fontSize: '1rem', margin: '1rem 0', color: 'var(--text-secondary)' }}>{mission}</p>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '1.5rem 0' }}>{recordTimer.seconds}s</div>
        <div className="recording-indicator">
          <div className="recording-dot" />
          <Waveform active={isRecording} />
          <span>Enregistrement...</span>
        </div>
        {micError && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{micError}</p>}
        <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleStopRecord}>Terminer</button>
      </div>
    );
  }

  if (phase === PHASES.REVIEW1) {
    return (
      <div className="page game-container animate-fade-in">
        <CoachBanner mode={coachMode} />
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Réécoute ta prise</h2>
        {audio1 ? (
          <AudioPlayer src={audio1} label="PRISE 1" />
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: '1rem 0', textAlign: 'center' }}>
            Enregistrement non disponible (micro non autorisé ou absent).
          </p>
        )}
        {blob1 && <VoiceAnalysisReport audioBlob={blob1} onAnalysisComplete={setAnalysis1} />}
        {coachMode === 'ai' && blob1 && (
          <div style={{ margin: '1.5rem 0' }}>
            <AiVoicePanel
              game="mirror"
              subject={`Prise 1 — mission : ${mission}`}
              blobs={blobs1}
              transcripts={analysis1?.text || ''}
              metrics={analysis1?.metrics || null}
            />
          </div>
        )}
        {coachMode !== 'ai' ? (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '1.5rem 0' }}>Écoute attentivement avant de continuer.</p>
            <h3 style={{ marginBottom: '1rem' }}>J'ai remarqué :</h3>
            {MIRROR_CHECKLIST.map((item) => (
              <label key={item.key} className="checklist-item">
                <input type="checkbox" checked={!!checklist[item.key]} onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))} />
                <span>{item.label}</span>
              </label>
            ))}
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={handleChecklistSubmit}>Continuer</button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={handleStartTake2}>Lancer la prise 2</button>
        )}
      </div>
    );
  }

  if (phase === PHASES.GOALS) {
    return (
      <div className="page game-container">
        <h2 style={{ marginBottom: '1rem' }}>Tes objectifs pour la prise 2</h2>
        <FeedbackBox speech={goals.map((g, i) => `Objectif ${i + 1} : ${g}`).join('. ')}>
          {goals.map((g, i) => <p key={i} style={{ marginBottom: '0.5rem' }}>{i + 1}. {g}</p>)}
        </FeedbackBox>
        <p className="question-display" style={{ margin: '1.5rem 0' }}>{mission}</p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleStartTake2}>Lancer la prise 2</button>
      </div>
    );
  }

  if (phase === PHASES.COMPARE) {
    return (
      <div className="page game-container animate-fade-in">
        <CoachBanner mode={coachMode} />
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Comparaison</h2>
        <div className="compare-grid">
          {audio1 ? <AudioPlayer src={audio1} label="PRISE 1" /> : <div className="card"><p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Prise 1 non disponible</p></div>}
          {audio2 ? <AudioPlayer src={audio2} label="PRISE 2" /> : <div className="card"><p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Prise 2 non disponible</p></div>}
        </div>

        {blob2 && !analysis2 && (
          <VoiceAnalysisReport audioBlob={blob2} onAnalysisComplete={setAnalysis2} />
        )}

        {analysis1?.metrics && analysis2?.metrics && (
          <div className="card animate-fade-in" style={{ margin: '1.5rem 0', padding: '1.25rem', borderColor: 'var(--violet)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', textAlign: 'center', color: 'var(--violet-light)' }}>
              Comparaison vocale objective
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem' }}>Métrique</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Prise 1</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Prise 2</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Différence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>Débit</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis1.metrics.wordsPerMinute} mots/min</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis2.metrics.wordsPerMinute} mots/min</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--violet-light)' }}>
                      {analysis1.metrics.wordsPerMinute} → {analysis2.metrics.wordsPerMinute}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>Démarrage (1er mot)</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis1.metrics.firstSpeechDelay}s</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis2.metrics.firstSpeechDelay}s</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--violet-light)' }}>
                      {analysis1.metrics.firstSpeechDelay}s → {analysis2.metrics.firstSpeechDelay}s
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>Pauses longues (&gt; 1s)</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis1.metrics.longPauseCount}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis2.metrics.longPauseCount}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--violet-light)' }}>
                      {analysis1.metrics.longPauseCount} → {analysis2.metrics.longPauseCount}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>Hésitations transcrites</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis1.metrics.fillerWordsCount}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis2.metrics.fillerWordsCount}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--violet-light)' }}>
                      {analysis1.metrics.fillerWordsCount} → {analysis2.metrics.fillerWordsCount}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem' }}>Nombre de mots</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis1.metrics.spokenWordCount}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{analysis2.metrics.spokenWordCount}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--violet-light)' }}>
                      {analysis1.metrics.spokenWordCount} → {analysis2.metrics.spokenWordCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {coachMode === 'ai' && blob1 && blob2 && (
          <div style={{ margin: '1.5rem 0' }}>
            <AiVoicePanel
              game="mirror"
              subject={`Comparaison prise 1 / prise 2 — mission : ${mission}`}
              blobs={blobs12}
              transcripts={`PRISE 1 : ${analysis1?.text || ''}\nPRISE 2 : ${analysis2?.text || ''}`}
              metrics={{ prise1: analysis1?.metrics || null, prise2: analysis2?.metrics || null }}
            />
          </div>
        )}

        {coachMode !== 'ai' ? (
          <>
            <h3 style={{ margin: '1.5rem 0 1rem' }}>Quelle prise était meilleure ?</h3>
            <div className="option-grid">
              {['Prise 1', 'Prise 2', 'Similaires'].map((opt) => (
                <button key={opt} type="button" className={`option-btn ${comparison === opt ? 'selected' : ''}`} onClick={() => setComparison(opt)}>{opt}</button>
              ))}
            </div>
            <label className="label" style={{ marginTop: '1.5rem' }}>Sur quoi as-tu progressé ?</label>
            <textarea className="input textarea" value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="Décris tes progrès..." />
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} disabled={!comparison} onClick={handleCompareSubmit}>Terminer</button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={handleCompareSubmit}>Terminer</button>
        )}
      </div>
    );
  }

  if (phase === PHASES.END) {
    return (
      <div className="page game-container animate-fade-in" style={{ textAlign: 'center' }}>
        <CoachBanner mode={coachMode} />
        <h1>Bravo !</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Tu as complété une session miroir vocal.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => onComplete ? onComplete() : navigate('/')}>
          {onComplete ? 'Continuer' : 'Retour'}
        </button>
      </div>
    );
  }

  return null;
}

export default VocalMirrorGame;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRandomClarityExercise } from '../../data/clarityExercises';
import { analyzeText } from '../../utils/textAnalysis';
import { getClarityFeedback } from '../../services/feedbackEngine';
import { speak } from '../../services/speechService';
import { awardXp } from '../../services/progressService';
import { XP_REWARDS } from '../../utils/xpUtils';
import { getCoachMode } from '../../services/aiCoachService';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import Waveform from '../../components/ui/Waveform';
import AudioPlayer from '../../components/ui/AudioPlayer';
import Icon from '../../components/ui/Icon';
import CoachModeToggle from '../../components/ui/CoachModeToggle';
import AiFeedbackPanel from '../../components/ui/AiFeedbackPanel';
import CoachBanner from '../../components/ui/CoachBanner';
import FeedbackBox from '../../components/ui/FeedbackBox';

const STRUCTURE = ['Position', 'Argument', 'Exemple ou nuance', 'Conclusion'];

export function ClarityGame({ _quickMode = false, onComplete }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => getCoachMode('clarity'));
  const [exercise] = useState(() => getRandomClarityExercise());
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('write');
  const [feedback, setFeedback] = useState('');
  const [oralPhase, setOralPhase] = useState(false);
  const [oralError, setOralError] = useState(null);
  const { audioUrl, startRecording, stopRecording, isRecording, cleanup } = useAudioRecorder();

  useEffect(() => () => cleanup(), [cleanup]);

  const handleAnalyze = () => {
    const analysis = analyzeText(text);
    const fb = getClarityFeedback(analysis);
    setFeedback(fb);
    setPhase('feedback');
  };

  const handleReadAloud = () => speak(text);

  const handleOralChallenge = async () => {
    setOralError(null);
    setOralPhase(true);
    try {
      await startRecording();
    } catch (err) {
      setOralError(err.message || 'Micro indisponible ou accès refusé');
      setOralPhase(false);
    }
  };

  const handleStopOral = async () => {
    await stopRecording();
    const trainingSeconds = 120;
    if (!onComplete) {
      awardXp(XP_REWARDS.EXERCISE_COMPLETE + 10, {
        stat: 'structure',
        trainingSeconds,
        historyEntry: {
          game: 'clarity',
          details: 'Exercice de structuration + défi oral',
          duration: trainingSeconds,
        },
      });
    }
    setPhase('done');
  };

  const handleFinishWithoutOral = () => {
    const trainingSeconds = 60;
    if (!onComplete) {
      awardXp(XP_REWARDS.EXERCISE_COMPLETE, {
        stat: 'structure',
        trainingSeconds,
        historyEntry: {
          game: 'clarity',
          details: 'Exercice de structuration (écrit)',
          duration: trainingSeconds,
        },
      });
    }
    if (onComplete) onComplete();
    else navigate('/');
  };

  if (phase === 'done') {
    return (
      <div className="page game-container animate-fade-in" style={{ textAlign: 'center' }}>
        <CoachBanner mode={mode} />
        <h1>Exercice terminé</h1>
        {audioUrl && <AudioPlayer src={audioUrl} label="Ta réponse orale" />}
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={() => onComplete ? onComplete() : navigate('/')}>
          {onComplete ? 'Continuer' : 'Retour'}
        </button>
      </div>
    );
  }

  if (oralPhase) {
    return (
      <div className="page game-container" style={{ textAlign: 'center' }}>
        <CoachBanner mode={mode} />
        <h2>Réponds oralement sans regarder ton texte</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>{exercise.mission}</p>
        <div className="recording-indicator">
          <div className="recording-dot" />
          <Waveform active={isRecording} />
          <span>Enregistrement en cours...</span>
        </div>
        <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleStopOral}>Terminer</button>
      </div>
    );
  }

  if (phase === 'feedback') {
    return (
      <div className="page game-container animate-fade-in">
        <CoachBanner mode={mode} />
        <h2 style={{ marginBottom: '1rem' }}>Analyse</h2>
        {mode !== 'ai' && <FeedbackBox>{feedback}</FeedbackBox>}
        <div className="card" style={{ margin: '1.5rem 0' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ta réponse :</p>
          <p>{text}</p>
        </div>
        {mode === 'ai' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <AiFeedbackPanel
              game="clarity"
              subject={`${exercise.mission}\nIdées brutes : ${exercise.ideas.join(' ; ')}`}
              transcript={text}
              metrics={null}
            />
          </div>
        )}
        {oralError && <p style={{ color: 'var(--red)', fontSize: '0.9rem', marginBottom: '1rem' }}>{oralError}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReadAloud}>Lire ma réponse à voix haute</button>
          <button type="button" className="btn btn-primary" onClick={handleOralChallenge}>Répondre oralement sans regarder mon texte</button>
          <button type="button" className="btn btn-ghost" onClick={handleFinishWithoutOral}>
            {onComplete ? 'Continuer' : 'Terminer sans oral'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page game-container">
      <div className="game-header">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}><Icon name="back" size={20} /></button>
        <h1>Construis ta pensée</h1>
      </div>

      <CoachBanner mode={mode} />

      <div style={{ marginBottom: '1.25rem' }}>
        <CoachModeToggle gameId="clarity" value={mode} onChange={setMode} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Mission</p>
        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{exercise.mission}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>IDÉES BRUTES :</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {exercise.ideas.map((idea) => (
            <li key={idea} style={{ padding: '0.35rem 0', color: 'var(--text-secondary)' }}>• {idea}</li>
          ))}
        </ul>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Transforme ces idées en une réponse claire de 2 à 4 phrases.
      </p>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Structure recommandée :</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {STRUCTURE.map((s, i) => (
            <span key={s} className="tip-chip">{i + 1}. {s}</span>
          ))}
        </div>
      </div>

      <textarea
        className="input textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Écris ta réponse structurée ici..."
        rows={6}
      />

      <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} disabled={text.trim().length < 20} onClick={handleAnalyze}>
        Analyser ma réponse
      </button>
    </div>
  );
}

export default ClarityGame;

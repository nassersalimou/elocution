import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DebateGame from '../games/debate/DebateGame';
import ClarityGame from '../games/clarity/ClarityGame';
import VocalMirrorGame from '../games/vocalMirror/VocalMirrorGame';
import VocabularyGame from '../games/vocabulary/VocabularyGame';
import { awardXp } from '../services/progressService';
import { XP_REWARDS } from '../utils/xpUtils';

const STEPS = ['debate', 'clarity', 'mirror', 'vocabulary'];

const STEP_LABELS = {
  debate: 'Réflexe Débat — 1 manche',
  clarity: 'Construis ta pensée',
  mirror: 'Miroir Vocal — 1 prise rapide',
  vocabulary: 'Sprint Vocabulaire — 60 sec',
};

export function QuickSession() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(-1);
  const [finished, setFinished] = useState(false);

  const currentStep = STEPS[stepIndex];

  const handleStepComplete = () => {
    if (stepIndex + 1 >= STEPS.length) {
      awardXp(XP_REWARDS.SESSION_COMPLETE, {
        isQuickSession: true,
        historyEntry: {
          game: 'quick',
          details: 'Session rapide 5 min',
          duration: 300,
        },
      });
      setFinished(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  if (finished) {
    return (
      <div className="page game-container animate-fade-in" style={{ textAlign: 'center' }}>
        <h1>Session rapide terminée !</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Tu as complété les 4 exercices. Bravo !</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </div>
    );
  }

  if (stepIndex === -1) {
    return (
      <div className="page game-container">
        <h1 className="page-title">Session rapide — 5 minutes</h1>
        <p className="page-subtitle">Un entraînement complet en 4 étapes.</p>
        <div className="card" style={{ marginBottom: '2rem' }}>
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>{i + 1}</span>
              <span>{STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setStepIndex(0)}>Démarrer</button>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.75rem' }} onClick={() => navigate(-1)}>Annuler</button>
      </div>
    );
  }

  if (currentStep === 'debate') {
    return <DebateGame config={{ theme: 'debat', difficulty: 'normal', rounds: 1 }} onComplete={handleStepComplete} />;
  }
  if (currentStep === 'clarity') {
    return <ClarityGame quickMode onComplete={handleStepComplete} />;
  }
  if (currentStep === 'mirror') {
    return <VocalMirrorGame quickMode onComplete={handleStepComplete} />;
  }
  if (currentStep === 'vocabulary') {
    return <VocabularyGame quickMode onComplete={handleStepComplete} />;
  }

  return null;
}

export default QuickSession;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../services/storageService';

const SCREENS = [
  { title: 'Réfléchis plus vite.', desc: 'Entraîne ton cerveau à trouver des idées sous pression, comme en débat ou en entretien.' },
  { title: 'Parle avec plus de clarté.', desc: 'Structure tes pensées, enrichis ton vocabulaire et prends conscience de ta voix.' },
  { title: 'Transforme l\'entraînement en réflexe.', desc: 'Quelques minutes par jour suffisent. Ta progression est sauvegardée localement.' },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const screen = SCREENS[step];

  const finish = () => {
    updateProfile((p) => ({ ...p, onboardingComplete: true }));
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🎯</div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{screen.title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>{screen.desc}</p>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
          {SCREENS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? 'var(--violet)' : 'var(--border)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {step < SCREENS.length - 1 ? (
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(step + 1)}>
            Suivant
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={finish}>
            COMMENCER
          </button>
        )}

        {step > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => setStep(step - 1)}>
            Retour
          </button>
        )}
      </div>
    </div>
  );
}

export default Onboarding;

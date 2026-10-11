import { useProfile } from '../hooks/useProfile';
import { getLevelInfo } from '../services/progressService';
import { formatDuration } from '../utils/dateUtils';
import { BADGES } from '../data/badges';
import AnimatedNumber from '../components/ui/AnimatedNumber';

const SKILLS = [
  { key: 'reflexion', label: 'Réflexion rapide', color: 'var(--violet)' },
  { key: 'structure', label: 'Structure', color: 'var(--blue)' },
  { key: 'vocabulaire', label: 'Vocabulaire', color: 'var(--green)' },
  { key: 'improvisation', label: 'Improvisation', color: 'var(--orange)' },
  { key: 'conscienceOrale', label: 'Conscience orale', color: 'var(--violet-light)' },
];

export function ProgressPage() {
  const { profile } = useProfile();
  const levelInfo = getLevelInfo(profile.xp);
  const maxSkill = Math.max(...SKILLS.map((s) => profile.stats[s.key]), 1);

  return (
    <div className="page">
      <h1 className="page-title">Progression</h1>
      <p className="page-subtitle">Tes statistiques basées sur tes sessions et auto-évaluations.</p>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value"><AnimatedNumber value={profile.xp} /></div>
          <div className="stat-label">XP total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{levelInfo.name}</div>
          <div className="stat-label">Niveau {levelInfo.level}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value"><AnimatedNumber value={profile.sessionsCount} /></div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(profile.totalTrainingSeconds)}</div>
          <div className="stat-label">Temps d'entraînement</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">🔥 {profile.bestStreak}</div>
          <div className="stat-label">Meilleure série</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Compétences</h2>
      <div className="card" style={{ marginBottom: '2rem' }}>
        {SKILLS.map((skill) => (
          <div key={skill.key} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem' }}>{skill.label}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{profile.stats[skill.key]} sessions</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(profile.stats[skill.key] / maxSkill) * 100}%`, background: skill.color }} />
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Badges</h2>
      <div className="grid-3">
        {BADGES.map((badge) => {
          const earned = profile.badges.includes(badge.id);
          return (
            <div key={badge.id} className="card" style={{ opacity: earned ? 1 : 0.4, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{badge.icon}</div>
              <h4 style={{ fontSize: '0.95rem' }}>{badge.name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{badge.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressPage;

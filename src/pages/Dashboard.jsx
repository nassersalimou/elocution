import { Link } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { getLevelInfo } from '../services/progressService';
import { formatDuration } from '../utils/dateUtils';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import Icon from '../components/ui/Icon';

const GAMES = [
  { to: '/jeu/debat', icon: '🎤', color: 'rgba(139, 92, 246, 0.2)', title: 'Réflexe Débat', desc: 'Réfléchis et parle sous pression. Timers progressifs.' },
  { to: '/jeu/duel', icon: '⚔️', color: 'rgba(239, 68, 68, 0.2)', title: 'Duel contradictoire', desc: 'Défends ta position face à un adversaire qui contre-attaque.' },
  { to: '/jeu/explique', icon: '🎭', color: 'rgba(236, 72, 153, 0.2)', title: 'Explique à deux publics', desc: 'Adapte le même concept à deux interlocuteurs très différents.' },
  { to: '/jeu/vocabulaire', icon: '⚡', color: 'rgba(56, 189, 248, 0.2)', title: 'Sprint Vocabulaire', desc: 'Synonymes, antonymes, champs lexicaux en 60 secondes.' },
  { to: '/jeu/repete', icon: '🔁', color: 'rgba(20, 184, 166, 0.2)', title: 'Répète la phrase', desc: 'Diction et rapidité : répète sans erreur, de plus en plus vite.' },
  { to: '/jeu/miroir', icon: '🪞', color: 'rgba(34, 197, 94, 0.2)', title: 'Miroir Vocal', desc: 'Parle, écoute-toi, compare et progresse.' },
  { to: '/jeu/clarte', icon: '🏗️', color: 'rgba(245, 158, 11, 0.2)', title: 'Construis ta pensée', desc: 'Transforme des idées brutes en réponse structurée.' },
];

export function Dashboard() {
  const { profile } = useProfile();
  const levelInfo = getLevelInfo(profile.xp);

  return (
    <div className="page">
      <section className="hero halo">
        <h1>Entraîne ta pensée.<br />Trouve tes mots.<br />Parle avec impact.</h1>
        <p>Des exercices rapides pour développer tes réflexes, ta clarté et ton vocabulaire.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/session-rapide" className="btn btn-primary btn-lg">COMMENCER UNE SESSION</Link>
          <Link to="/entrainement" className="btn btn-secondary">Continuer mon entraînement</Link>
        </div>
      </section>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Bonjour, prêt à entraîner ton esprit ?
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value"><AnimatedNumber value={levelInfo.level} /></div>
          <div className="stat-label">Niveau — {levelInfo.name}</div>
          <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
            <div className="progress-bar-fill" style={{ width: `${levelInfo.progress}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value"><AnimatedNumber value={profile.xp} /></div>
          <div className="stat-label">XP</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Icon name="flame" size={24} style={{ color: 'var(--orange)' }} />
            <AnimatedNumber value={profile.streak} />
          </div>
          <div className="stat-label">Série quotidienne</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(profile.totalTrainingSeconds)}</div>
          <div className="stat-label">Temps total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value"><AnimatedNumber value={profile.bestScore} /></div>
          <div className="stat-label">Meilleur score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value"><AnimatedNumber value={profile.exercisesToday} /></div>
          <div className="stat-label">Exercices aujourd'hui</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Entraînements</h2>
      <div className="game-cards">
        {GAMES.map((game) => (
          <Link key={game.to} to={game.to} className="game-card">
            <div className="game-card-icon" style={{ background: game.color }}>{game.icon}</div>
            <h3>{game.title}</h3>
            <p>{game.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;

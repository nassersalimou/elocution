import { Link } from 'react-router-dom';

const GAMES = [
  { to: '/jeu/debat', icon: '🎤', title: 'Réflexe Débat', desc: 'Réfléchis puis parle sous pression croissante.', tag: 'Improvisation' },
  { to: '/jeu/duel', icon: '⚔️', title: 'Duel contradictoire', desc: 'Défends ta position face à un adversaire qui contre-attaque.', tag: 'Argumentation' },
  { to: '/jeu/explique', icon: '🎭', title: 'Explique à deux publics', desc: 'Adapte le même concept à deux interlocuteurs très différents.', tag: 'Adaptation' },
  { to: '/jeu/vocabulaire', icon: '⚡', title: 'Sprint Vocabulaire', desc: 'Teste ta rapidité lexicale en 60 secondes.', tag: 'Vocabulaire' },
  { to: '/jeu/repete', icon: '🔁', title: 'Répète la phrase', desc: 'Diction et rapidité : répète sans erreur, de plus en plus vite', tag: 'Diction' },
  { to: '/jeu/miroir', icon: '🪞', title: 'Miroir Vocal', desc: 'Enregistre-toi, écoute et compare.', tag: 'Conscience orale' },
  { to: '/jeu/clarte', icon: '🏗️', title: 'Construis ta pensée', desc: 'Structure des idées désordonnées.', tag: 'Structure' },
];

export function Training() {
  return (
    <div className="page">
      <h1 className="page-title">Entraînement</h1>
      <p className="page-subtitle">Choisis un exercice ou lance une session rapide de 5 minutes.</p>

      <Link to="/session-rapide" className="card card-hover" style={{ display: 'block', marginBottom: '2rem', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>⏱️</span>
          <div>
            <h3>Session rapide — 5 minutes</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>1 débat + 1 clarté + 1 miroir + 1 vocabulaire</p>
          </div>
        </div>
      </Link>

      <div className="game-cards">
        {GAMES.map((game) => (
          <Link key={game.to} to={game.to} className="game-card">
            <span className="badge badge-violet" style={{ marginBottom: '0.75rem' }}>{game.tag}</span>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{game.icon}</div>
            <h3>{game.title}</h3>
            <p>{game.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Training;

import { useProfile } from '../hooks/useProfile';
import { groupHistoryByDate } from '../utils/dateUtils';
import { formatDuration } from '../utils/dateUtils';

const GAME_LABELS = {
  debate: 'Réflexe débat',
  duel: 'Duel contradictoire',
  explain: 'Explique à deux publics',
  vocabulary: 'Sprint vocabulaire',
  mirror: 'Miroir vocal',
  clarity: 'Construis ta pensée',
  repeat: 'Répète la phrase',
  quick: 'Session rapide',
};

export function HistoryPage() {
  const { profile } = useProfile();
  const groups = groupHistoryByDate(profile.history);

  if (profile.history.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Historique</h1>
        <div className="empty-state">
          <h3>Aucune session pour l'instant</h3>
          <p>Commence un entraînement pour voir ton historique ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Historique</h1>
      <p className="page-subtitle">Tes dernières sessions d'entraînement.</p>

      {Object.entries(groups).map(([date, entries]) => (
        <div key={date} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{date}</h3>
          {entries.map((entry) => (
            <div key={entry.id} className="card" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem' }}>{GAME_LABELS[entry.game] || entry.game}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {entry.details}
                  {entry.duration ? ` · ${formatDuration(entry.duration)}` : ''}
                </p>
              </div>
              <span className="badge badge-green">+{entry.xp} XP</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default HistoryPage;

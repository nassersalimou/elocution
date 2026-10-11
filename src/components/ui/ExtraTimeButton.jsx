// Bouton « +20 s de parole » : utilisable un nombre limité de fois par manche
// (le compteur est tenu par le jeu, partagé entre la réponse et l'échange oral).
export const EXTRA_SECONDS = 20;
export const EXTRA_MAX_PER_ROUND = 2;

export function ExtraTimeButton({ remaining, onUse }) {
  if (remaining <= 0) {
    return (
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
        Plus de rallonge pour cette manche : conclus !
      </p>
    );
  }
  return (
    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={onUse}>
      ⏱️ +{EXTRA_SECONDS} s de parole ({remaining} restant{remaining > 1 ? 's' : ''})
    </button>
  );
}

export default ExtraTimeButton;

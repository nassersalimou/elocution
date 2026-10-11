export function CoachBanner({ mode }) {
  if (mode === 'ai') {
    return (
      <div
        className="coach-banner coach-banner-ai animate-fade-in"
        style={{
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid var(--violet)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--violet-light)' }}>
          🤖 Mode Coach IA
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Le coach écoute, critique ton argumentation et te propose des formulations plus fortes.
        </div>
      </div>
    );
  }

  return (
    <div
      className="coach-banner coach-banner-manual"
      style={{
        border: '1px solid var(--card-border, var(--border))',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
        padding: '0.5rem 0.85rem',
        marginBottom: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}
    >
      ✍️ Mode Manuel — tu t'auto-évalues
    </div>
  );
}

export default CoachBanner;

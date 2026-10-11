import ReadAloudButton from './ReadAloudButton';

// Encadré de retour (mode manuel) avec bouton d'écoute discret en haut à droite.
// `speech` : texte à lire (par défaut, children s'il s'agit d'une chaîne).
export function FeedbackBox({ children, speech }) {
  const text = speech ?? (typeof children === 'string' ? children : '');
  return (
    <div className="feedback-box" style={{ position: 'relative', paddingRight: text ? '3rem' : undefined }}>
      {text && (
        <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem' }}>
          <ReadAloudButton text={text} compact title="Écouter ce retour" />
        </div>
      )}
      {children}
    </div>
  );
}

export default FeedbackBox;

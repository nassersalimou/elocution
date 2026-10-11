import { useState, useEffect } from 'react';
import { checkTopic, suggestTopic } from '../../services/aiCoachService';
import {
  shouldImposeTopic,
  drawCategory,
  buildProfileSummary,
  getRecentSubjects,
  getJokersLeft,
  consumeJoker,
} from '../../services/topicProfileService';

export function TopicPicker({ onSelect }) {
  const [view, setView] = useState(() => (shouldImposeTopic() ? 'checking' : 'free'));
  const [loading, setLoading] = useState(() => shouldImposeTopic());
  const [loadingMessage, setLoadingMessage] = useState(() =>
    shouldImposeTopic() ? 'Le coach sélectionne un sujet pour te challenger...' : ''
  );
  const [errorInfo, setErrorInfo] = useState(null);

  // Données sujet imposé
  const [imposedData, setImposedData] = useState(null);
  const [jokersCount, setJokersCount] = useState(() => getJokersLeft());

  // Mode libre
  const [inputText, setInputText] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [suggestResult, setSuggestResult] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (view === 'checking') {
      let cat = drawCategory();
      if (cat === 'liked') cat = 'disliked';

      suggestTopic({
        category: cat,
        profile: buildProfileSummary(),
        avoid: getRecentSubjects(),
      }).then((res) => {
        if (!isMounted) return;
        setLoading(false);
        if (res.ok) {
          setImposedData({
            theme: res.data.theme,
            subjects: res.data.subjects || [],
            reason: res.data.reason,
            category: cat,
          });
          setView('imposed');
        } else {
          setErrorInfo({ message: res.message });
          setView('free');
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [view]);

  const handleUseJoker = () => {
    const success = consumeJoker();
    if (success) {
      setJokersCount(getJokersLeft());
      setView('free');
      setErrorInfo(null);
    }
  };

  const handleValidateInput = async (valToValidate) => {
    const target = valToValidate !== undefined ? valToValidate : inputText;
    if (!target || !target.trim()) return;

    setLoading(true);
    setLoadingMessage('Vérification du sujet par le coach...');
    setErrorInfo(null);
    setSuggestResult(null);

    const res = await checkTopic({
      input: target.trim(),
      profile: buildProfileSummary(),
    });

    setLoading(false);
    if (res.ok) {
      setCheckResult(res.data);
    } else {
      setErrorInfo({ message: res.message });
    }
  };

  const handleLetCoachChoose = async () => {
    const cat = drawCategory();
    setLoading(true);
    setLoadingMessage('Le coach cherche des sujets inspirants...');
    setErrorInfo(null);
    setCheckResult(null);

    const res = await suggestTopic({
      category: cat,
      profile: buildProfileSummary(),
      avoid: getRecentSubjects(),
    });

    setLoading(false);
    if (res.ok) {
      setSuggestResult({
        ...res.data,
        category: cat,
      });
    } else {
      setErrorInfo({ message: res.message });
    }
  };

  if (view === 'checking' || loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--violet-light)', marginBottom: '0.5rem' }}>
          {loadingMessage || 'Préparation du coach...'}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Affichage d'erreur éventuelle */}
      {errorInfo && (
        <div
          style={{
            borderLeft: '4px solid var(--orange)',
            background: 'rgba(245, 158, 11, 0.08)',
            padding: '1rem',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--orange)' }}>
            {errorInfo.message}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Utilise le mode manuel en attendant.
          </div>
        </div>
      )}

      {/* MODE IMPOSÉ */}
      {view === 'imposed' && imposedData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--violet-light)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ⚡ Le coach t'impose un sujet
            </div>
            {imposedData.reason && (
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                « {imposedData.reason} »
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Choisis l'angle qui t'inspire :
            </span>
            {imposedData.subjects.map((sub, idx) => (
              <button
                key={idx}
                type="button"
                className="option-btn"
                style={{ textAlign: 'left', fontWeight: 500, padding: '0.85rem 1rem' }}
                onClick={() =>
                  onSelect({
                    subject: sub,
                    theme: imposedData.theme,
                    category: imposedData.category,
                    imposed: true,
                  })
                }
              >
                {sub}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleUseJoker}
              disabled={jokersCount === 0}
            >
              🃏 Utiliser mon joker ({jokersCount} restant{jokersCount > 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}

      {/* MODE LIBRE */}
      {view === 'free' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="label" htmlFor="topic-input">
              Un thème ou un sujet précis
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                id="topic-input"
                type="text"
                className="input"
                style={{ flex: 1, minWidth: '220px' }}
                placeholder="Ex : Le travail, Les réseaux sociaux, Faut-il..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleValidateInput();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleValidateInput()}
                disabled={!inputText.trim()}
              >
                Valider avec le coach
              </button>
            </div>
          </div>

          {/* Bouton alternatif : Laisse le coach choisir */}
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLetCoachChoose}
            >
              🎲 Laisse le coach choisir
            </button>
          </div>

          {/* RÉSULTAT DU CHECK DE SUJET */}
          {checkResult && (
            <div
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {checkResult.status === 'refused' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.95rem' }}>
                    Sujet non retenu : {checkResult.reason}
                  </div>
                  {checkResult.alternative && (
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setInputText(checkResult.alternative);
                          handleValidateInput(checkResult.alternative);
                        }}
                      >
                        Prendre : {checkResult.alternative}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {checkResult.status === 'accepted' && checkResult.kind === 'theme' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Questions de débat suggérées sur ce thème :
                  </span>
                  {checkResult.subjects.map((sub, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="option-btn"
                      style={{ textAlign: 'left', fontWeight: 500, padding: '0.85rem 1rem' }}
                      onClick={() =>
                        onSelect({
                          subject: sub,
                          theme: checkResult.theme || inputText.trim(),
                          category: 'liked',
                          imposed: false,
                        })
                      }
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {checkResult.status === 'accepted' && checkResult.kind === 'subject' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {checkResult.subjects?.[0] || inputText}
                  </div>
                  {checkResult.reason && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {checkResult.reason}
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        onSelect({
                          subject: checkResult.subjects?.[0] || inputText.trim(),
                          theme: checkResult.theme || inputText.trim(),
                          category: 'liked',
                          imposed: false,
                        })
                      }
                    >
                      Débattre ce sujet
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RÉSULTAT DE LA SUGGESTION ALÉATOIRE PAR LE COACH */}
          {suggestResult && (
            <div
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--violet-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Thème : {suggestResult.theme}
                </div>
                {suggestResult.reason && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                    « {suggestResult.reason} »
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Choisis un sujet :
                </span>
                {suggestResult.subjects.map((sub, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="option-btn"
                    style={{ textAlign: 'left', fontWeight: 500, padding: '0.85rem 1rem' }}
                    onClick={() =>
                      onSelect({
                        subject: sub,
                        theme: suggestResult.theme,
                        category: suggestResult.category,
                        imposed: false,
                      })
                    }
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TopicPicker;

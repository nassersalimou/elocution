import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEBATE_THEMES, DEBATE_DIFFICULTIES } from '../../data/debateQuestions';
import { getTimingsForSession } from '../../data/debateTiming';
import { formatTime } from '../../utils/dateUtils';
import Icon from '../../components/ui/Icon';
import CoachModeToggle from '../../components/ui/CoachModeToggle';
import TopicPicker from '../../components/ui/TopicPicker';
import { getCoachMode } from '../../services/aiCoachService';

const ROUND_OPTIONS = [3, 5, 8, 10];
const EXCHANGE_OPTIONS = [2, 4, 6];

export function DebateConfig({ onStart, quickMode = false }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => getCoachMode('debate'));
  const [topicSource, setTopicSource] = useState('app'); // 'app' | 'coach'
  const [customTopic, setCustomTopic] = useState(null);

  const [theme, setTheme] = useState('debat');
  const [difficulty, setDifficulty] = useState('normal');
  const [rounds, setRounds] = useState(quickMode ? 1 : 5);
  const [exchanges, setExchanges] = useState(4);

  const effectiveRounds = (mode === 'ai' && topicSource === 'coach') ? 1 : rounds;
  const timings = getTimingsForSession(difficulty, effectiveRounds);
  const first = timings[0];
  const last = timings[timings.length - 1];

  const isCustomCoachTopic = mode === 'ai' && topicSource === 'coach';
  const isStartDisabled = isCustomCoachTopic && !customTopic;

  const handleStart = () => {
    onStart?.({
      theme: customTopic?.theme || theme,
      difficulty,
      rounds: effectiveRounds,
      exchanges,
      coachMode: mode,
      customTopic: isCustomCoachTopic ? customTopic : null,
    });
  };

  return (
    <div className="page game-container">
      <div className="game-header">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} aria-label="Retour">
          <Icon name="back" size={20} />
        </button>
        <h1>Réflexe Débat</h1>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <CoachModeToggle gameId="debate" value={mode} onChange={setMode} />
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Réfléchis puis parle sous pression. Les timers diminuent à chaque manche.
      </p>

      {!quickMode && mode === 'ai' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">Sujet</label>
          <div className="option-grid" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className={`option-btn ${topicSource === 'app' ? 'selected' : ''}`}
              onClick={() => {
                setTopicSource('app');
                setCustomTopic(null);
              }}
            >
              Sujets de l'app
            </button>
            <button
              type="button"
              className={`option-btn ${topicSource === 'coach' ? 'selected' : ''}`}
              onClick={() => setTopicSource('coach')}
            >
              Mon sujet avec le coach
            </button>
          </div>

          {topicSource === 'coach' && (
            <div style={{ marginTop: '1rem' }}>
              {!customTopic ? (
                <TopicPicker onSelect={(selected) => setCustomTopic(selected)} />
              ) : (
                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--violet-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Sujet sélectionné {customTopic.imposed ? '(imposé par le coach)' : ''}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                        {customTopic.subject}
                      </div>
                      {customTopic.theme && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Thème : {customTopic.theme}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCustomTopic(null)}
                    >
                      Changer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!quickMode && !isCustomCoachTopic && (
        <>
          <label className="label">Thème</label>
          <div className="option-grid" style={{ marginBottom: '1.5rem' }}>
            {DEBATE_THEMES.map((t) => (
              <button key={t.id} type="button" className={`option-btn ${theme === t.id ? 'selected' : ''}`} onClick={() => setTheme(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {!quickMode && (
        <>
          <label className="label">Difficulté</label>
          <div className="option-grid" style={{ marginBottom: '1.5rem' }}>
            {DEBATE_DIFFICULTIES.map((d) => (
              <button key={d.id} type="button" className={`option-btn ${difficulty === d.id ? 'selected' : ''}`} onClick={() => setDifficulty(d.id)}>
                {d.label}
              </button>
            ))}
          </div>

          {mode === 'ai' && (
            <>
              <label className="label">Échanges oraux avec l'adversaire (par manche)</label>
              <div className="option-grid" style={{ marginBottom: '1.5rem' }}>
                {EXCHANGE_OPTIONS.map((n) => (
                  <button key={n} type="button" className={`option-btn ${exchanges === n ? 'selected' : ''}`} onClick={() => setExchanges(n)}>
                    {n} échanges
                  </button>
                ))}
              </div>
            </>
          )}

          {!isCustomCoachTopic && (
            <>
              <label className="label">Nombre de manches</label>
              <div className="option-grid" style={{ marginBottom: '1.5rem' }}>
                {ROUND_OPTIONS.map((r) => (
                  <button key={r} type="button" className={`option-btn ${rounds === r ? 'selected' : ''}`} onClick={() => setRounds(r)}>
                    {r} manches
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Aperçu des timers</h3>
        <div className="grid-2">
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Réflexion initiale → finale</p>
            <p style={{ fontWeight: 600 }}>{formatTime(first.reflection)} → {formatTime(last.reflection)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Réponse initiale → finale</p>
            <p style={{ fontWeight: 600 }}>{formatTime(first.response)} → {formatTime(last.response)}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        onClick={handleStart}
        disabled={isStartDisabled}
      >
        Lancer la session
      </button>
    </div>
  );
}

export default DebateConfig;

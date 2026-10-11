import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import CoachModeToggle from '../../components/ui/CoachModeToggle';
import TopicPicker from '../../components/ui/TopicPicker';
import { getCoachMode } from '../../services/aiCoachService';
import { DUEL_TOPICS, getRandomDuelTopic } from '../../data/duelArguments';

const TURNS_OPTIONS = [3, 4];
const TIME_OPTIONS = [
  { label: '45 s', value: 45 },
  { label: '60 s', value: 60 },
  { label: '90 s', value: 90 },
];
const DIFFICULTY_OPTIONS = [
  { id: 'debutant', label: 'Débutant' },
  { id: 'normal', label: 'Normal' },
  { id: 'difficile', label: 'Difficile' },
  { id: 'intense', label: 'Intense' },
];

export function DuelConfig({ onStart }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => getCoachMode('duel'));

  // Sujet
  const [manualTopic, setManualTopic] = useState(() => DUEL_TOPICS[0]);
  const [aiTopic, setAiTopic] = useState(null);

  // Options de partie
  const [sideChoice, setSideChoice] = useState('pour'); // 'pour' | 'contre' | 'random'
  const [maxTurns, setMaxTurns] = useState(3);
  const [timePerTurn, setTimePerTurn] = useState(60);
  const [difficulty, setDifficulty] = useState('normal');

  const handlePickRandomManual = () => {
    setManualTopic(getRandomDuelTopic());
  };

  const isStartDisabled = mode === 'ai' && !aiTopic;

  const handleStart = () => {
    const resolvedSide =
      sideChoice === 'random' ? (Math.random() < 0.5 ? 'pour' : 'contre') : sideChoice;

    let finalTopicObj;
    if (mode === 'ai') {
      finalTopicObj = {
        subject: aiTopic.subject,
        theme: aiTopic.theme || 'societe',
        category: aiTopic.category || 'liked',
        imposed: Boolean(aiTopic.imposed),
      };
    } else {
      finalTopicObj = {
        id: manualTopic.id,
        subject: manualTopic.subject,
        theme: manualTopic.theme,
        category: 'liked',
        imposed: false,
        pour: manualTopic.pour,
        contre: manualTopic.contre,
        pressure: manualTopic.pressure,
      };
    }

    onStart?.({
      mode,
      topic: finalTopicObj,
      userSide: resolvedSide,
      maxTurns,
      timePerTurn,
      difficulty,
    });
  };

  return (
    <div className="page game-container">
      <div className="game-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          aria-label="Retour"
        >
          <Icon name="back" size={20} />
        </button>
        <h1>Duel contradictoire</h1>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <CoachModeToggle gameId="duel" value={mode} onChange={setMode} />
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Défends ta position face à un contradicteur qui attaque directement tes arguments.
      </p>

      {/* CHOIX DU SUJET */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Sujet du duel</label>
        {mode === 'manual' ? (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePickRandomManual}
              >
                🎲 Au hasard
              </button>
            </div>
            <div className="option-grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              {DUEL_TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`option-btn ${manualTopic.id === t.id ? 'selected' : ''}`}
                  style={{ textAlign: 'left', padding: '0.75rem 1rem' }}
                  onClick={() => setManualTopic(t)}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--violet-light)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                    {t.theme}
                  </span>
                  <span style={{ fontWeight: 500 }}>{t.subject}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {!aiTopic ? (
              <TopicPicker onSelect={(selected) => setAiTopic(selected)} />
            ) : (
              <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--violet-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Sujet sélectionné {aiTopic.imposed ? '(imposé par le coach)' : ''}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {aiTopic.subject}
                    </div>
                    {aiTopic.theme && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Thème : {aiTopic.theme}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setAiTopic(null)}
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHOIX DU CAMP */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Ton camp</label>
        <div className="option-grid">
          <button
            type="button"
            className={`option-btn ${sideChoice === 'pour' ? 'selected' : ''}`}
            onClick={() => setSideChoice('pour')}
          >
            👍 Pour
          </button>
          <button
            type="button"
            className={`option-btn ${sideChoice === 'contre' ? 'selected' : ''}`}
            onClick={() => setSideChoice('contre')}
          >
            👎 Contre
          </button>
          <button
            type="button"
            className={`option-btn ${sideChoice === 'random' ? 'selected' : ''}`}
            onClick={() => setSideChoice('random')}
          >
            🎲 Au hasard
          </button>
        </div>
      </div>

      {/* NOMBRE DE TOURS */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Nombre de tours</label>
        <div className="option-grid">
          {TURNS_OPTIONS.map((num) => (
            <button
              key={num}
              type="button"
              className={`option-btn ${maxTurns === num ? 'selected' : ''}`}
              onClick={() => setMaxTurns(num)}
            >
              {num} tours
            </button>
          ))}
        </div>
      </div>

      {/* TEMPS DE PAROLE PAR TOUR */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Temps de parole par tour</label>
        <div className="option-grid">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-btn ${timePerTurn === opt.value ? 'selected' : ''}`}
              onClick={() => setTimePerTurn(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* DIFFICULTÉ */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Difficulté</label>
        <div className="option-grid">
          {DIFFICULTY_OPTIONS.map((diff) => (
            <button
              key={diff.id}
              type="button"
              className={`option-btn ${difficulty === diff.id ? 'selected' : ''}`}
              onClick={() => setDifficulty(diff.id)}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        onClick={handleStart}
        disabled={isStartDisabled}
      >
        Lancer le duel ⚔️
      </button>
    </div>
  );
}

export default DuelConfig;

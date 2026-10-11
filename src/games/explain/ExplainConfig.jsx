import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import CoachModeToggle from '../../components/ui/CoachModeToggle';
import { getCoachMode } from '../../services/aiCoachService';
import {
  EXPLAIN_CONCEPTS,
  AUDIENCE_PAIRS,
  getRandomConcept,
  getRandomAudiencePair,
} from '../../data/explainConcepts';

const TIME_OPTIONS = [
  { label: '45 s', value: 45 },
  { label: '60 s', value: 60 },
  { label: '90 s', value: 90 },
];

export function ExplainConfig({ onStart }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => getCoachMode('explain'));

  const [selectedConcept, setSelectedConcept] = useState(() => EXPLAIN_CONCEPTS[0]);
  const [customConcept, setCustomConcept] = useState('');
  const [selectedPair, setSelectedPair] = useState(() => AUDIENCE_PAIRS[0]);
  const [timePerAudience, setTimePerAudience] = useState(60);

  const handlePickRandomConcept = () => {
    setCustomConcept('');
    setSelectedConcept(getRandomConcept());
  };

  const handlePickRandomPair = () => {
    setSelectedPair(getRandomAudiencePair());
  };

  const handleStart = () => {
    const isCustom = mode === 'ai' && customConcept.trim().length > 0;
    const finalConceptObj = {
      id: isCustom ? 'custom' : selectedConcept.id,
      concept: isCustom ? customConcept.trim() : selectedConcept.concept,
      domain: isCustom ? 'Personnalisé' : selectedConcept.domain,
      keyPoints: isCustom ? [] : selectedConcept.keyPoints,
    };

    onStart?.({
      mode,
      concept: finalConceptObj,
      audiencePair: selectedPair,
      timePerAudience,
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
        <h1>Explique à deux publics</h1>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <CoachModeToggle gameId="explain" value={mode} onChange={setMode} />
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Explique un même concept complexe à deux publics très différents et teste ta capacité d’adaptation.
      </p>

      {/* CHOIX DU CONCEPT */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="label" style={{ marginBottom: 0 }}>Concept à vulgariser</label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePickRandomConcept}
          >
            🎲 Au hasard
          </button>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <select
            className="input"
            value={selectedConcept.id}
            onChange={(e) => {
              const found = EXPLAIN_CONCEPTS.find((c) => c.id === e.target.value);
              if (found) {
                setSelectedConcept(found);
                setCustomConcept('');
              }
            }}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            {EXPLAIN_CONCEPTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.concept} ({c.domain})
              </option>
            ))}
          </select>
        </div>

        {mode === 'ai' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Ou propose ton propre concept :
            </label>
            <input
              type="text"
              className="input"
              value={customConcept}
              onChange={(e) => setCustomConcept(e.target.value)}
              placeholder="Ex. L'effet placebo, la tectonique des plaques..."
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Aperçu du concept */}
        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--violet-light)', fontWeight: 700, textTransform: 'uppercase' }}>
            {customConcept.trim() ? 'Concept personnalisé' : selectedConcept.domain}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {customConcept.trim() || selectedConcept.concept}
          </div>
          {!customConcept.trim() && selectedConcept.keyPoints?.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Points clés à faire passer :
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {selectedConcept.keyPoints.map((pt, idx) => (
                  <li key={idx} style={{ marginTop: '0.15rem' }}>{pt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* CHOIX DE LA PAIRE DE PUBLICS */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="label" style={{ marginBottom: 0 }}>Paire de publics</label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePickRandomPair}
          >
            🎲 Au hasard
          </button>
        </div>

        <div className="option-grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
          {AUDIENCE_PAIRS.map((pair) => (
            <button
              key={pair.id}
              type="button"
              className={`option-btn ${selectedPair.id === pair.id ? 'selected' : ''}`}
              style={{ textAlign: 'left', padding: '0.75rem 1rem' }}
              onClick={() => setSelectedPair(pair)}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pair.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Public A : {pair.audienceA}
                <br />
                Public B : {pair.audienceB}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* TEMPS DE PAROLE PAR PUBLIC */}
      <div style={{ marginBottom: '2rem' }}>
        <label className="label">Temps de parole par public</label>
        <div className="option-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-btn ${timePerAudience === opt.value ? 'selected' : ''}`}
              onClick={() => setTimePerAudience(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
        onClick={handleStart}
      >
        Commencer l'exercice
      </button>
    </div>
  );
}

export default ExplainConfig;

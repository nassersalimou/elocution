import { useState, useEffect } from 'react';
import { useProfile } from '../hooks/useProfile';
import { resetProfile, updateProfile } from '../services/storageService';
import { checkVoiceAnalysisAvailability, unloadVoiceModel } from '../services/voiceAnalysis/voiceAnalysisService';
import { useNavigate } from 'react-router-dom';
import { getVoicePrefs, setVoicePrefs, speak, stopSpeaking } from '../services/speechService';
import { AI_BASE, aiHeaders, getAccessCode, setAccessCode } from '../services/apiConfig';

export function SettingsPage() {
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [voicePrefs, setVoicePrefsState] = useState(() => getVoicePrefs());
  const [ttsUsage, setTtsUsage] = useState(null);
  const [accessCode, setAccessCodeState] = useState(() => getAccessCode());
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    checkVoiceAnalysisAvailability().then(setVoiceAvailable);
    fetch(`${AI_BASE}/coach/tts/usage`, { headers: aiHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setTtsUsage(data))
      .catch(() => {});
  }, []);

  const updateVoice = (changes) => {
    stopSpeaking();
    setVoicePrefs(changes);
    setVoicePrefsState(getVoicePrefs());
  };

  const handleUnloadModel = async () => {
    setUnloading(true);
    await unloadVoiceModel();
    setUnloading(false);
    alert('Modèle déchargé de la mémoire vive avec succès.');
  };

  const handleReset = () => {
    if (window.confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) {
      resetProfile();
      refresh();
      navigate('/onboarding');
    }
  };

  const handleReplayOnboarding = () => {
    updateProfile((p) => ({ ...p, onboardingComplete: false }));
    navigate('/onboarding');
  };

  return (
    <div className="page">
      <h1 className="page-title">Réglages</h1>
      <p className="page-subtitle">Préférences et gestion des données locales.</p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Voix du coach et de l'adversaire</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          La voix HD de Google est bien plus claire que celle du navigateur. Elle est gratuite jusqu'à 900 000 caractères
          par mois ; au-delà, l'app repasse automatiquement sur la voix du navigateur.
        </p>
        <label className="label">Qualité</label>
        <div className="option-grid" style={{ marginBottom: '1rem' }}>
          <button type="button" className={`option-btn ${voicePrefs.hd ? 'selected' : ''}`} onClick={() => updateVoice({ hd: true })}>
            Voix HD Google
          </button>
          <button type="button" className={`option-btn ${!voicePrefs.hd ? 'selected' : ''}`} onClick={() => updateVoice({ hd: false })}>
            Voix du navigateur
          </button>
        </div>
        <label className="label">Voix</label>
        <div className="option-grid" style={{ marginBottom: '1rem' }}>
          <button type="button" className={`option-btn ${voicePrefs.gender === 'female' ? 'selected' : ''}`} onClick={() => updateVoice({ gender: 'female' })}>
            Femme
          </button>
          <button type="button" className={`option-btn ${voicePrefs.gender === 'male' ? 'selected' : ''}`} onClick={() => updateVoice({ gender: 'male' })}>
            Homme
          </button>
        </div>
        <label className="label" htmlFor="voice-rate">
          Vitesse : {voicePrefs.rate.toFixed(2)} {voicePrefs.rate < 0.9 ? '(lente)' : voicePrefs.rate > 1.05 ? '(rapide)' : '(posée)'}
        </label>
        <input
          id="voice-rate"
          type="range"
          min="0.7"
          max="1.2"
          step="0.02"
          value={voicePrefs.rate}
          onChange={(e) => updateVoice({ rate: Number(e.target.value) })}
          style={{ width: '100%', marginBottom: '1rem' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => speak("Ton argument est intéressant, mais il repose sur une généralisation. Sur quels faits précis t'appuies-tu ?")}
          >
            Tester la voix
          </button>
          {ttsUsage && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Ce mois-ci : {ttsUsage.chars.toLocaleString('fr-FR')} / {ttsUsage.limit.toLocaleString('fr-FR')} caractères gratuits
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Code d'accès IA</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          Le code d'accès est donné par la personne qui a partagé l'application.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label htmlFor="ai-access-code" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Code d'accès
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="ai-access-code"
                type={showCode ? 'text' : 'password'}
                className="input"
                style={{ flex: 1 }}
                value={accessCode}
                onChange={(e) => setAccessCodeState(e.target.value)}
                placeholder="Entre le code d'accès..."
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCode((s) => !s)}
                aria-label={showCode ? "Masquer le code d'accès" : "Afficher le code d'accès"}
              >
                {showCode ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setAccessCode(accessCode);
                window.location.reload();
              }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Analyse vocale locale</h3>
          <span className={`badge ${voiceAvailable ? 'badge-green' : 'badge-orange'}`}>
            {voiceAvailable ? 'Disponible' : 'Indisponible'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          Transcription et analyse du débit de parole 100 % sur cet ordinateur. Aucun envoi sur internet, aucun abonnement, respect absolu de votre vie privée.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Moteur :</span>
            <strong style={{ color: 'var(--text-primary)' }}>Whisper base (faster-whisper)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Calcul :</span>
            <strong style={{ color: 'var(--text-primary)' }}>CPU (quantification int8)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Serveur local :</span>
            <span style={{ fontFamily: 'monospace' }}>{AI_BASE}</span>
          </div>
        </div>
        {voiceAvailable && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleUnloadModel}
            disabled={unloading}
          >
            {unloading ? 'Libération...' : 'Libérer la mémoire (décharger le modèle)'}
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Données</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Toutes tes données sont stockées localement dans ton navigateur. Aucune information n'est envoyée à un serveur.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>XP total</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile.xp}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sessions</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile.sessionsCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Historique</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile.history.length} entrées</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Application</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReplayOnboarding}>
            Revoir l'introduction
          </button>
          <button type="button" className="btn btn-danger" onClick={handleReset}>
            Réinitialiser toutes les données
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.5rem' }}>À propos</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &amp;locution v1.0 — Application 100 % locale d'entraînement à l'expression orale.
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;

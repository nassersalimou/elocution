import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import useTimer from '../../hooks/useTimer';
import CircularTimer from '../../components/ui/CircularTimer';
import AudioPlayer from '../../components/ui/AudioPlayer';
import Icon from '../../components/ui/Icon';
import { transcribeRecording } from '../../services/voiceAnalysis/voiceAnalysisService';
import { stopSpeaking } from '../../services/speechService';
import { explainFeedback } from '../../services/aiCoachService';
import { awardXp } from '../../services/progressService';
import CoachBanner from '../../components/ui/CoachBanner';
import ReadAloudButton, { buildSpeech } from '../../components/ui/ReadAloudButton';

const CRITERIA_A = [
  { id: 'a_vocab', label: 'Vocabulaire adapté au premier public' },
  { id: 'a_analogy', label: 'Métaphore ou exemple concret pertinent' },
  { id: 'a_level', label: 'Niveau d’abstraction et de détail approprié' },
  { id: 'a_tone', label: 'Ton, rythme et posture convaincants' },
];

const CRITERIA_B = [
  { id: 'b_vocab', label: 'Vocabulaire adapté au second public' },
  { id: 'b_analogy', label: 'Métaphore ou exemple concret pertinent' },
  { id: 'b_level', label: 'Niveau d’abstraction et de rigueur approprié' },
  { id: 'b_tone', label: 'Ton, rythme et posture convaincants' },
];

export function ExplainGame({ config, onComplete, onRestart }) {
  const navigate = useNavigate();
  const { mode: initialMode, concept, audiencePair, timePerAudience } = config;

  const [gameMode, setGameMode] = useState(initialMode); // 'ai' | 'manual'
  const [currentStage, setCurrentStage] = useState('A'); // 'A' | 'B'
  const [stagePhase, setStagePhase] = useState('prep'); // 'prep' | 'recording' | 'transcribing' | 'review' | 'verdict'

  // Données Stage A
  const [audioUrlA, setAudioUrlA] = useState(null);
  const [textA, setTextA] = useState('');

  // Données Stage B
  const [audioUrlB, setAudioUrlB] = useState(null);
  const [textB, setTextB] = useState('');

  // Résultat IA
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Résultat Manuel
  const [manualChecks, setManualChecks] = useState({});
  const [manualValidated, setManualValidated] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const sessionRecordedRef = useRef(false);
  const sessionStartRef = useRef(0);
  const currentStageRef = useRef(currentStage);

  const {
    startRecording,
    stopRecording,
    error: micError,
    cleanup: cleanupMic,
  } = useAudioRecorder();

  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => {
      cleanupMic();
      stopSpeaking();
    };
  }, [cleanupMic]);

  const finalizeSession = useCallback(
    (score) => {
      if (sessionRecordedRef.current) return;
      sessionRecordedRef.current = true;

      const trainingSeconds = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));
      const xp = 25 + Math.round(score / 5);

      awardXp(xp, {
        stat: 'structure',
        trainingSeconds,
        historyEntry: {
          game: 'explain',
          details: `${concept.concept} (2 publics)`,
          duration: trainingSeconds,
        },
      });

      setFinalScore(score);
      onComplete?.({ score, concept: concept.concept });
    },
    [concept.concept, onComplete]
  );

  const handleStopSpeakingAction = useCallback(async () => {
    setStagePhase('transcribing');
    const result = await stopRecording();
    const stage = currentStageRef.current;

    if (result?.url) {
      if (stage === 'A') setAudioUrlA(result.url);
      else setAudioUrlB(result.url);
    }

    if (result?.blob) {
      const res = await transcribeRecording(result.blob);
      if (res?.success && res.data?.text) {
        const transcript = res.data.text.trim();
        if (stage === 'A') setTextA(transcript);
        else setTextB(transcript);
      }
    }

    setStagePhase('review');
  }, [stopRecording]);

  const prepTimer = useTimer(10, {
    autoStart: true,
    onComplete: () => {
      handleStartRecording();
    },
  });

  const recordTimer = useTimer(timePerAudience, {
    onComplete: () => {
      handleStopSpeakingAction();
    },
  });

  const handleStartRecording = async () => {
    prepTimer.pause();
    setStagePhase('recording');
    try {
      await startRecording();
    } catch {
      // Micro inaccessible : continue en mode texte
    }
    recordTimer.reset(timePerAudience);
    recordTimer.start();
  };

  const handleSkipPrep = () => {
    handleStartRecording();
  };

  const handleStopRecordingEarly = () => {
    recordTimer.pause();
    handleStopSpeakingAction();
  };

  const handleNextStage = () => {
    setCurrentStage('B');
    setStagePhase('prep');
    prepTimer.reset(10);
    prepTimer.start();
  };

  const triggerAiEvaluation = useCallback(
    async (txtA, txtB) => {
      setIsAiLoading(true);
      setAiError(null);

      const res = await explainFeedback({
        concept: concept.concept,
        audienceA: audiencePair.audienceA,
        textA: txtA.trim() || '(Aucune explication orale fournie)',
        audienceB: audiencePair.audienceB,
        textB: txtB.trim() || '(Aucune explication orale fournie)',
      });

      setIsAiLoading(false);
      if (res.ok && res.data) {
        setAiFeedback(res.data);
        const avgScore = Math.round(((res.data.scoreA ?? 70) + (res.data.scoreB ?? 70)) / 2);
        finalizeSession(avgScore);
      } else {
        setAiError(
          res.message || 'Le coach IA est indisponible. Utilise la grille d’auto-évaluation ci-dessous.'
        );
        setGameMode('manual');
      }
    },
    [concept.concept, audiencePair.audienceA, audiencePair.audienceB, finalizeSession]
  );

  const handleFinishToVerdict = () => {
    setStagePhase('verdict');
    if (gameMode === 'ai') {
      triggerAiEvaluation(textA, textB);
    }
  };

  const handleToggleManualCheck = (id) => {
    setManualChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentAudience = currentStage === 'A' ? audiencePair.audienceA : audiencePair.audienceB;
  const currentAudienceLabel = currentStage === 'A' ? 'Public A' : 'Public B';

  const checkedCount = [...CRITERIA_A, ...CRITERIA_B].filter((c) => manualChecks[c.id]).length;
  const calculatedManualScore = Math.round((checkedCount / 8) * 100);

  const handleValidateManual = () => {
    setManualValidated(true);
    finalizeSession(calculatedManualScore);
  };

  return (
    <div className="page game-container">
      {/* HEADER */}
      <div className="game-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          aria-label="Quitter l'exercice"
        >
          <Icon name="back" size={20} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{concept.concept}</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Étape {currentStage === 'A' ? '1 / 2' : '2 / 2'} — {currentAudienceLabel}
          </div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <CoachBanner mode={gameMode} />

      {micError && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
          <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>
            Microphone : {micError}. Tu peux taper directement ton texte au clavier ci-dessous.
          </p>
        </div>
      )}

      {/* PHASE 1: PRÉPARATION (10s) */}
      {stagePhase === 'prep' && (
        <div className="card text-center" style={{ padding: '2rem 1.5rem', animation: 'fadeIn 0.25s ease' }}>
          <span className="badge badge-violet" style={{ marginBottom: '1rem' }}>
            Temps de préparation
          </span>

          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0' }}>
            {concept.concept}
          </h3>

          <div style={{ margin: '1rem 0 1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--violet-light)', fontWeight: 700, textTransform: 'uppercase' }}>
              Public cible ({currentAudienceLabel})
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {currentAudience}
            </div>
          </div>

          {concept.keyPoints?.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: '1.5rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Points clés à transmettre :
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {concept.keyPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ margin: '1.5rem auto' }}>
            <CircularTimer
              seconds={prepTimer.seconds}
              total={10}
              label="Début de l'enregistrement dans"
              size={130}
              color="var(--violet-light)"
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}
            onClick={handleSkipPrep}
          >
            Je suis prêt(e) 🎙️
          </button>
        </div>
      )}

      {/* PHASE 2: ENREGISTREMENT */}
      {stagePhase === 'recording' && (
        <div className="card text-center" style={{ padding: '2rem 1.5rem', animation: 'fadeIn 0.25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>
              Enregistrement en direct
            </span>
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
            {concept.concept}
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Tu t'adresses à : <strong style={{ color: 'var(--text-primary)' }}>{currentAudience}</strong>
          </p>

          <div style={{ margin: '1.5rem auto' }}>
            <CircularTimer
              seconds={recordTimer.seconds}
              total={timePerAudience}
              label="Temps restant"
              size={160}
              color="#ef4444"
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}
            onClick={handleStopRecordingEarly}
          >
            Terminer la prise ⏹️
          </button>
        </div>
      )}

      {/* PHASE 3: TRANSCRIPTION EN COURS */}
      {stagePhase === 'transcribing' && (
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
          <h3>Analyse et transcription vocale...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Extraction du texte de ta prise de parole.
          </p>
        </div>
      )}

      {/* PHASE 4: REVIEW DE LA PRISE */}
      {stagePhase === 'review' && (
        <div className="card" style={{ padding: '1.5rem', animation: 'fadeIn 0.25s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className="badge badge-violet">{currentAudienceLabel}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prise validée</span>
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            {currentAudience}
          </h3>

          {(currentStage === 'A' ? audioUrlA : audioUrlB) && (
            <div style={{ marginBottom: '1rem' }}>
              <AudioPlayer
                src={currentStage === 'A' ? audioUrlA : audioUrlB}
                label="Réécouter ton enregistrement :"
              />
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <label className="label" style={{ marginBottom: '0.35rem' }}>
              Transcription (ajuste ou complète si nécessaire) :
            </label>
            <textarea
              className="input"
              rows={5}
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.5 }}
              value={currentStage === 'A' ? textA : textB}
              onChange={(e) => {
                if (currentStage === 'A') setTextA(e.target.value);
                else setTextB(e.target.value);
              }}
              placeholder="Si la transcription est incomplète ou si ton micro était coupé, rédige ton explication ici..."
            />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {currentStage === 'A' ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleNextStage}
              >
                Valider et passer au Public B 👉
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleFinishToVerdict}
              >
                Terminer et voir le bilan 🎉
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE 5: VERDICT & RÉSULTATS */}
      {stagePhase === 'verdict' && (
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
          <CoachBanner mode={gameMode} />
          {isAiLoading && (
            <div className="card text-center" style={{ padding: '3rem 1.5rem', marginBottom: '1.5rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
              <h3>Le coach IA analyse ton adaptation...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Comparaison de ton vocabulaire, du registre et des métaphores entre les deux publics.
              </p>
            </div>
          )}

          {aiError && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', marginBottom: '1.25rem' }}>
              <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>{aiError}</p>
            </div>
          )}

          {/* RÉÉCOUTER LES 2 AUDIOS CÔTE À CÔTE */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Tes deux prestations</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* CARTE PUBLIC A */}
              <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-violet">Public A</span>
                  {aiFeedback && (
                    <span style={{ fontWeight: 700, color: 'var(--violet-light)' }}>
                      {aiFeedback.scoreA} / 100
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0.5rem 0', fontSize: '1.05rem' }}>{audiencePair.audienceA}</h4>
                {audioUrlA ? (
                  <AudioPlayer src={audioUrlA} label="Prise audio Public A" />
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0.5rem 0' }}>
                    Aucun enregistrement audio
                  </p>
                )}
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
                  {textA || '(Aucun texte fourni)'}
                </div>
                {aiFeedback?.feedbackA && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <strong style={{ color: 'var(--violet-light)' }}>Retour Public A :</strong>
                    <div style={{ marginTop: '0.25rem' }}>{aiFeedback.feedbackA}</div>
                  </div>
                )}
              </div>

              {/* CARTE PUBLIC B */}
              <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-violet">Public B</span>
                  {aiFeedback && (
                    <span style={{ fontWeight: 700, color: 'var(--violet-light)' }}>
                      {aiFeedback.scoreB} / 100
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0.5rem 0', fontSize: '1.05rem' }}>{audiencePair.audienceB}</h4>
                {audioUrlB ? (
                  <AudioPlayer src={audioUrlB} label="Prise audio Public B" />
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0.5rem 0' }}>
                    Aucun enregistrement audio
                  </p>
                )}
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
                  {textB || '(Aucun texte fourni)'}
                </div>
                {aiFeedback?.feedbackB && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <strong style={{ color: 'var(--violet-light)' }}>Retour Public B :</strong>
                    <div style={{ marginTop: '0.25rem' }}>{aiFeedback.feedbackB}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RETOUR COACH IA */}
          {gameMode === 'ai' && aiFeedback && (
            <div className="card" style={{ border: '1px solid var(--violet-light)', marginBottom: '1.5rem', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-violet">Coach IA</span>
                  <ReadAloudButton
                    label="Tout écouter"
                    text={() =>
                      buildSpeech([
                        { title: `Pour ${audiencePair.audienceA}`, content: [`${aiFeedback.scoreA} sur 100`, aiFeedback.feedbackA] },
                        { title: `Pour ${audiencePair.audienceB}`, content: [`${aiFeedback.scoreB} sur 100`, aiFeedback.feedbackB] },
                        { title: 'Adaptation', content: aiFeedback.adaptation },
                        { title: 'Question pour creuser', content: aiFeedback.question },
                      ])
                    }
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--violet-light)' }}>
                    {Math.round(((aiFeedback.scoreA ?? 70) + (aiFeedback.scoreB ?? 70)) / 2)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}> / 100</span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--violet-light)', marginBottom: '0.35rem' }}>
                  Analyse de l'adaptation
                </h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {aiFeedback.adaptation}
                </p>
              </div>

              {aiFeedback.question && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--violet-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet-light)', textTransform: 'uppercase' }}>
                    Question de relance du coach
                  </div>
                  <div style={{ fontSize: '0.95rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    « {aiFeedback.question} »
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RETOUR MANUEL / AUTO-ÉVALUATION */}
          {gameMode === 'manual' && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Auto-évaluation de l'adaptation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Coche les critères validés pour chaque public pour calculer ton score d'adaptation.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--violet-light)', marginBottom: '0.5rem' }}>
                    Critères Public A ({audiencePair.audienceA})
                  </h4>
                  {CRITERIA_A.map((crit) => (
                    <label
                      key={crit.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(manualChecks[crit.id])}
                        onChange={() => handleToggleManualCheck(crit.id)}
                        disabled={manualValidated}
                      />
                      <span>{crit.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--violet-light)', marginBottom: '0.5rem' }}>
                    Critères Public B ({audiencePair.audienceB})
                  </h4>
                  {CRITERIA_B.map((crit) => (
                    <label
                      key={crit.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(manualChecks[crit.id])}
                        onChange={() => handleToggleManualCheck(crit.id)}
                        disabled={manualValidated}
                      />
                      <span>{crit.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Score calculé :</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--violet-light)' }}>
                    {calculatedManualScore} / 100
                  </div>
                </div>

                {!manualValidated ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleValidateManual}
                  >
                    Valider mon évaluation
                  </button>
                ) : (
                  <span className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>
                    Évaluation validée ✓
                  </span>
                )}
              </div>

              {manualValidated && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.9rem' }}>
                  {calculatedManualScore >= 80 ? (
                    <p style={{ margin: 0, color: 'var(--success)' }}>
                      🌟 Excellente adaptation ! Tu as su moduler ton registre, tes métaphores et ton niveau de complexité avec brio.
                    </p>
                  ) : calculatedManualScore >= 50 ? (
                    <p style={{ margin: 0, color: 'var(--violet-light)' }}>
                      👍 Bonne prestation ! L'effort d'adaptation est réel, veille à encore mieux calibrer les analogies selon chaque public.
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      💡 Entraînement formateur : pense à simplifier davantage pour les débutants et à approfondir les mécanismes pour les experts.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BILAN XP ET BOUTONS DE SORTIE */}
          {finalScore !== null && (
            <div className="card text-center" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Récompense de séance
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--violet-light)', marginTop: '0.25rem' }}>
                +{25 + Math.round(finalScore / 5)} XP
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onRestart}
            >
              Rejouer
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => navigate('/entrainement')}
            >
              Retour à l'entraînement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplainGame;

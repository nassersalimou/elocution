/**
 * Détection de la parole (début et fin) à partir du niveau sonore du micro.
 * Sert au jeu « Répète la phrase » : l'enregistrement s'arrête tout seul quand
 * l'utilisateur a fini de parler, et le dernier instant de voix décide du temps utilisé.
 */

/**
 * Suivi pur (sans navigateur) : on lui envoie régulièrement le niveau sonore (0 à 1)
 * et l'heure en ms ; il dit quand la parole a commencé et quand elle est finie.
 *
 * - Les premières `calibrationMs` mesurent le bruit de fond (percentile bas, donc robuste
 *   si l'utilisateur parle déjà), le seuil de voix vaut ~3,5 × ce bruit.
 * - La parole commence après `minSpeechMs` de voix continue (un claquement ne compte pas).
 * - Elle est finie après `silenceMs` sans voix (une courte hésitation ne coupe pas).
 */
export function createSpeechTracker({
  silenceMs = 1400,
  minSpeechMs = 350,
  calibrationMs = 400,
  minThreshold = 0.015,
  maxThreshold = 0.06,
  factor = 3.5,
} = {}) {
  let t0 = null;
  let samples = [];
  let threshold = null;
  let voicedSince = null;
  let speechStartAt = null;
  let lastVoiceAt = null;
  let ended = false;

  function calibrate() {
    const sorted = [...samples].sort((a, b) => a - b);
    const noise = sorted.length ? sorted[Math.floor(sorted.length * 0.2)] : 0;
    threshold = Math.min(maxThreshold, Math.max(minThreshold, noise * factor));
  }

  return {
    update(level, now) {
      if (t0 === null) t0 = now;
      if (threshold === null) {
        samples.push(level);
        if (now - t0 >= calibrationMs) {
          calibrate();
          samples = [];
        }
        return { speaking: false, speechEnded: false, speechStartAt, lastVoiceAt };
      }

      const voiced = level > threshold;
      if (voiced) {
        if (voicedSince === null) voicedSince = now;
        if (speechStartAt === null && now - voicedSince >= minSpeechMs) speechStartAt = voicedSince;
        if (speechStartAt !== null) lastVoiceAt = now;
      } else if (speechStartAt === null) {
        voicedSince = null;
      }

      let speechEnded = false;
      if (speechStartAt !== null && !ended && now - lastVoiceAt >= silenceMs) {
        ended = true;
        speechEnded = true;
      }
      return {
        speaking: speechStartAt !== null && !ended && voiced,
        speechEnded,
        speechStartAt,
        lastVoiceAt,
      };
    },
    getThreshold: () => threshold,
  };
}

/**
 * Branche le suivi sur un flux micro (MediaStream) et rappelle `onUpdate` ~20 fois par seconde.
 * Renvoie une fonction d'arrêt. Sans Web Audio, ne fait rien (le bouton « Terminer » reste là).
 */
export function createVoiceActivityMonitor(stream, onUpdate, options) {
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!stream || !AudioCtx) return () => {};
  let ctx;
  try {
    ctx = new AudioCtx();
  } catch {
    return () => {};
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const tracker = createSpeechTracker(options);

  const id = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const level = Math.sqrt(sum / buf.length);
    onUpdate(tracker.update(level, Date.now()));
  }, 50);

  return () => {
    clearInterval(id);
    try {
      source.disconnect();
      ctx.close();
    } catch {
      // Contexte déjà fermé
    }
  };
}

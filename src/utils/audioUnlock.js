/**
 * Son et micro sur mobile (iOS surtout, Android parfois) : un AudioContext ou un lecteur
 * audio créé hors d'un geste de l'utilisateur reste muet (« suspended », play() refusé).
 * Or les jeux enchaînent tout seuls (voix → micro → voix…). On « déverrouille » donc une
 * fois pour toutes, au premier toucher, UN contexte audio et UN lecteur réutilisés partout.
 */

// WAV vide (0 échantillon) : suffit à débloquer le lecteur pendant le geste.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let sharedCtx = null;
let playback = null;
let playbackUnlocked = false;
let synthUnlocked = false;
let installed = false;

function getAudioCtxClass() {
  return typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
}

/** Contexte Web Audio partagé (créé à la demande), ou null sans Web Audio. */
export function getSharedAudioContext() {
  const AudioCtx = getAudioCtxClass();
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    try {
      sharedCtx = new AudioCtx();
    } catch {
      sharedCtx = null;
    }
  }
  if (sharedCtx && sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

/** Lecteur audio partagé pour la voix HD (le même élément, débloqué au premier toucher). */
export function getPlaybackElement() {
  if (!playback && typeof Audio !== 'undefined') {
    playback = new Audio();
    playback.preload = 'auto';
    playback.setAttribute('playsinline', '');
  }
  return playback;
}

function unlock() {
  getSharedAudioContext();

  const el = getPlaybackElement();
  // Une seule fois, et jamais pendant une lecture en cours (on la couperait).
  if (el && !playbackUnlocked && (el.paused || !el.src)) {
    el.src = SILENT_WAV;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        playbackUnlocked = true;
      }).catch(() => {});
    }
  }

  // iOS : une première phrase (vide) dite pendant un geste autorise les suivantes.
  if (!synthUnlocked && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    synthUnlocked = true;
    try {
      if (!window.speechSynthesis.speaking) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
    } catch {
      // Voix du navigateur indisponible : rien à débloquer.
    }
  }
}

/** À appeler une fois au démarrage : déverrouille au premier toucher / clic / touche. */
export function installAudioUnlock() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  ['pointerdown', 'touchend', 'keydown'].forEach((type) => {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  });
  // Retour sur l'onglet : le système a pu suspendre le contexte.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sharedCtx?.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
  });
}

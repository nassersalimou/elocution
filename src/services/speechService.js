import { AI_BASE, aiHeaders, notifyCodeRejected } from './apiConfig.js';

// Lecture à voix haute : voix HD Google (serveur local /coach/tts, mise en cache)
// en priorité, voix du navigateur en secours (serveur éteint, quota gratuit atteint…).
const TTS_ENDPOINT = `${AI_BASE}/coach/tts`;
const VOICE_PREFS_KEY = 'elocution-voice';
const DEFAULT_VOICE_PREFS = { hd: true, gender: 'female', rate: 0.92 };

let currentUtterance = null;
let currentAudio = null;
let currentAudioUrl = null;
// Chaque appel à speak() incrémente ce compteur : une lecture annulée ou remplacée
// ne déclenche jamais son onEnd (sinon l'étape suivante d'un jeu partirait deux fois).
let speakId = 0;

// Qui parle en ce moment (identifiant libre fourni par l'appelant, ex. un bouton « Écouter »)
// et abonnés prévenus à chaque début/fin de lecture : permet aux boutons d'afficher « Arrêter ».
let currentOwner = null;
const listeners = new Set();

function setOwner(owner) {
  currentOwner = owner;
  listeners.forEach((cb) => {
    try {
      cb(currentOwner);
    } catch {
      // Un abonné défaillant ne doit pas bloquer la lecture.
    }
  });
}

export function onSpeechChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSpeechOwner() {
  return currentOwner;
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getVoicePrefs() {
  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY);
    return raw ? { ...DEFAULT_VOICE_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_VOICE_PREFS };
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
}

export function setVoicePrefs(prefs) {
  try {
    localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify({ ...getVoicePrefs(), ...prefs }));
  } catch {
    // Préférence non sauvegardée : la valeur par défaut reste utilisée.
  }
}

function speakWithBrowser(text, options, id) {
  if (!isSpeechSupported()) {
    if (options.onEnd) options.onEnd();
    return;
  }
  const prefs = getVoicePrefs();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang || 'fr-FR';
  utterance.rate = options.rate || prefs.rate || 1;
  utterance.pitch = options.pitch || 1;
  const voices = speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang.startsWith('fr'));
  if (frVoice) utterance.voice = frVoice;
  const finish = () => {
    if (id !== speakId) return;
    currentUtterance = null;
    if (options.onEnd) options.onEnd();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

async function fetchHdAudio(text, prefs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: aiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text: text.slice(0, 1500), gender: prefs.gender, rate: prefs.rate }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.status === 401) notifyCodeRejected();
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export function speak(text, options = {}) {
  stopSpeaking();
  const id = ++speakId;
  if (!text) {
    if (options.onEnd) options.onEnd();
    return;
  }
  setOwner(options.owner || 'app');
  const userOnEnd = options.onEnd;
  options = {
    ...options,
    onEnd: () => {
      if (id === speakId) setOwner(null);
      if (userOnEnd) userOnEnd();
    },
  };
  const prefs = getVoicePrefs();
  if (!prefs.hd) {
    speakWithBrowser(text, options, id);
    return;
  }
  // Marqueur « en cours » pendant le téléchargement de la voix HD (~1,5 s, instantané si en cache).
  currentAudio = { pending: true };
  fetchHdAudio(text, prefs).then((blob) => {
    if (id !== speakId) return; // arrêtée ou remplacée entre-temps
    currentAudio = null;
    if (!blob) {
      speakWithBrowser(text, options, id);
      return;
    }
    currentAudioUrl = URL.createObjectURL(blob);
    const audio = new Audio(currentAudioUrl);
    const fallback = () => {
      if (id !== speakId) return;
      currentAudio = null;
      speakWithBrowser(text, options, id);
    };
    audio.onended = () => {
      if (id !== speakId) return;
      stopSpeaking();
      if (options.onEnd) options.onEnd();
    };
    audio.onerror = fallback;
    // Garde-fou : Chrome peut retarder le son (onglet en arrière-plan…) et play() ne
    // jamais aboutir ; sans démarrage en 4 s, on bascule sur la voix du navigateur.
    // (audio.paused passe à false dès l'appel de play(), même si rien ne joue : on s'appuie
    // donc sur l'événement « playing » et sur currentTime.)
    let started = false;
    const watchdog = setTimeout(() => {
      if (id !== speakId || started || audio.currentTime > 0) return;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      fallback();
    }, 4000);
    audio.onplaying = () => {
      started = true;
      clearTimeout(watchdog);
    };
    currentAudio = audio;
    audio.play().catch(() => {
      clearTimeout(watchdog);
      fallback();
    });
  });
}

// Arrêt volontaire : n'appelle jamais onEnd (l'appelant passe lui-même à la suite).
export function stopSpeaking() {
  speakId++;
  if (currentOwner !== null) setOwner(null);
  if (currentAudio && typeof currentAudio.pause === 'function') {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
  }
  currentAudio = null;
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  if (isSpeechSupported()) {
    if (currentUtterance) {
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
    }
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  return (
    !!currentAudio ||
    (isSpeechSupported() && (speechSynthesis.speaking || !!currentUtterance))
  );
}

if (typeof window !== 'undefined' && isSpeechSupported()) {
  speechSynthesis.getVoices();
}

import { LocalVoiceAnalysisProvider } from './LocalVoiceAnalysisProvider.js';
import { AI_BASE, aiHeaders } from '../apiConfig.js';

let activeProvider = new LocalVoiceAnalysisProvider();

export function setVoiceAnalysisProvider(provider) {
  activeProvider = provider;
}

export function getVoiceAnalysisProvider() {
  return activeProvider;
}

export async function checkVoiceAnalysisAvailability() {
  try {
    return await activeProvider.isAvailable();
  } catch {
    return false;
  }
}

export async function analyzeVoiceRecording(audioBlob) {
  try {
    const isOnline = await activeProvider.isAvailable();
    if (!isOnline) {
      return {
        success: false,
        isAvailable: false,
        error: 'Le service d\'analyse vocale local n\'est pas démarré.',
      };
    }

    const data = await activeProvider.analyzeAudio(audioBlob);
    return {
      success: true,
      isAvailable: true,
      data,
    };
  } catch (err) {
    // Le serveur a répondu (isAvailable vérifié plus haut) : c'est l'analyse qui a échoué,
    // pas le serveur qui est éteint. Ne pas afficher « serveur non démarré ».
    return {
      success: false,
      isAvailable: true,
      error: err.message || 'Échec de l\'analyse vocale locale.',
    };
  }
}

const TRANSCRIBE_ENDPOINT = `${AI_BASE}/coach/transcribe`;

// Transcription rapide (Gemini, ~4 s) pour les échanges oraux ; Whisper local en secours
// (~0,6x le temps réel sur un petit processeur, donc ~30 s pour 45 s de parole).
export async function transcribeRecording(audioBlob) {
  if (!audioBlob || audioBlob.size < 1000) {
    return { success: false, error: 'Enregistrement vide.' };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const ext = (audioBlob.type || '').includes('mp4') ? 'mp4' : (audioBlob.type || '').includes('ogg') ? 'ogg' : 'webm';
    const formData = new FormData();
    formData.append('file', audioBlob, `reponse.${ext}`);
    const res = await fetch(TRANSCRIBE_ENDPOINT, { method: 'POST', headers: aiHeaders(), body: formData, signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.text && data.text.trim()) {
        return { success: true, data: { text: data.text.trim(), source: 'gemini' } };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return analyzeVoiceRecording(audioBlob);
}

export async function unloadVoiceModel() {
  try {
    return await activeProvider.unloadModel();
  } catch {
    return false;
  }
}

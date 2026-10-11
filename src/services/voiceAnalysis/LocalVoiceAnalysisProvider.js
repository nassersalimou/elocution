import { VoiceAnalysisProvider } from './VoiceAnalysisProvider.js';
import { AI_BASE, aiHeaders } from '../apiConfig.js';

const LOCAL_AI_ENDPOINT = AI_BASE;

export class LocalVoiceAnalysisProvider extends VoiceAnalysisProvider {
  constructor(endpoint = LOCAL_AI_ENDPOINT) {
    super();
    this.endpoint = endpoint;
  }

  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${this.endpoint}/health`, {
        headers: aiHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  async getCapabilities() {
    try {
      const res = await fetch(`${this.endpoint}/capabilities`, {
        headers: aiHeaders(),
      });
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }

  async analyzeAudio(audioBlob) {
    if (!audioBlob) {
      throw new Error('Aucun flux audio fourni pour l\'analyse.');
    }

    const formData = new FormData();
    const filename = audioBlob.type?.includes('mp4') ? 'recording.mp4' : 'recording.webm';
    formData.append('file', audioBlob, filename);

    const res = await fetch(`${this.endpoint}/analyze`, {
      method: 'POST',
      headers: aiHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const errDetail = await res.text().catch(() => '');
      throw new Error(`Erreur serveur vocal (${res.status}): ${errDetail || 'Échec de la transcription'}`);
    }

    return await res.json();
  }

  async unloadModel() {
    try {
      const res = await fetch(`${this.endpoint}/unload`, {
        method: 'POST',
        headers: aiHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export default LocalVoiceAnalysisProvider;

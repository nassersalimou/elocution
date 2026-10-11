class AudioRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.activeUrls = new Set();
    this.isSupported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async requestPermission() {
    if (!this.isSupported) {
      return { granted: false, error: 'Votre navigateur ne supporte pas l\'enregistrement audio.' };
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      return { granted: true };
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        return { granted: false, error: 'Permission microphone refusée. Autorisez l\'accès dans les paramètres du navigateur.' };
      }
      return { granted: false, error: 'Impossible d\'accéder au microphone.' };
    }
  }

  async start() {
    if (!this.isSupported) {
      throw new Error('Enregistrement non supporté');
    }
    // Arrêter tout enregistrement en cours sans révoquer les anciens URLs
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.mediaRecorder.start(100);
      return true;
    } catch {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
      }
      this.mediaRecorder = null;
      this.chunks = [];
      throw new Error('Impossible de démarrer l\'enregistrement');
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.activeUrls.add(url);
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }
        resolve({ blob, url });
      };
      this.mediaRecorder.stop();
    });
  }

  revokeUrl(url) {
    if (url && this.activeUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignorer si déjà révoqué
      }
      this.activeUrls.delete(url);
    }
  }

  cleanup() {
    for (const url of this.activeUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignorer si déjà révoqué
      }
    }
    this.activeUrls.clear();

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }

  get isRecording() {
    return this.mediaRecorder?.state === 'recording';
  }
}

export const audioRecorder = new AudioRecorderService();
export default audioRecorder;

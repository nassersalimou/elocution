/**
 * Interface de base pour les fournisseurs d'analyse vocale.
 * Permet d'interchanger le moteur (moteur local FastAPI/Whisper, Web Speech, etc.)
 */
export class VoiceAnalysisProvider {
  /**
   * Vérifie si le service d'analyse vocale est en ligne et accessible.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return false;
  }

  /**
   * Récupère les capacités du moteur.
   * @returns {Promise<Object>}
   */
  async getCapabilities() {
    return {};
  }

  /**
   * Transcrit et analyse un enregistrement audio.
   * @param {Blob} audioBlob - Fichier audio enregistré
   * @returns {Promise<Object>}
   */
  async analyzeAudio(_audioBlob) {
    throw new Error('La méthode analyzeAudio() doit être implémentée par le provider.');
  }

  /**
   * Décharge le modèle d'IA de la mémoire vive.
   * @returns {Promise<boolean>}
   */
  async unloadModel() {
    return false;
  }
}

export default VoiceAnalysisProvider;

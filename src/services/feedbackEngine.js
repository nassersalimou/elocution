import { getDebateRoundFeedback, getDebateSessionFeedback, getDebateNextGoal } from '../data/feedbackRules.js';

/**
 * Interface de base pour les fournisseurs de feedback.
 * Prépare l'application pour de futurs moteurs (LLM local, transcription, analyse de débit).
 */
export class FeedbackProvider {
  getDebateFeedback(_sessionData) {
    throw new Error('getDebateFeedback non implémenté');
  }
  getVocabularyFeedback(_results) {
    throw new Error('getVocabularyFeedback non implémenté');
  }
  getMirrorFeedback(_checklist) {
    throw new Error('getMirrorFeedback non implémenté');
  }
  getClarityFeedback(_analysis) {
    throw new Error('getClarityFeedback non implémenté');
  }
}

/**
 * Fournisseur local déterministe basé sur des règles expertes.
 * Ne nécessite aucune connexion externe ni modèle lourd.
 */
export class LocalRuleFeedbackProvider extends FeedbackProvider {
  getDebateFeedback(sessionData) {
    if (sessionData.type === 'round') {
      return getDebateRoundFeedback(sessionData.evaluation);
    }
    if (sessionData.type === 'session') {
      return {
        summary: getDebateSessionFeedback(sessionData),
        nextGoal: getDebateNextGoal(sessionData),
      };
    }
    return { message: "Continue à t'entraîner régulièrement." };
  }

  getVocabularyFeedback(results) {
    const { score, accuracy, bestCombo, totalAnswers } = results;
    const messages = [];

    if (accuracy >= 0.9) {
      messages.push('Excellente précision ! Ton vocabulaire actif est solide.');
    } else if (accuracy >= 0.7) {
      messages.push('Bonne session. Quelques hésitations, mais tu progresses.');
    } else if (accuracy >= 0.5) {
      messages.push('Des lacunes persistent. Revois les mots difficiles et réessaie.');
    } else {
      messages.push('Cette session était difficile. Commence par les modes synonymes et antonymes.');
    }

    if (bestCombo >= 5) {
      messages.push(`Combo x${bestCombo} — ta réactivité mentale s'améliore.`);
    }

    if (totalAnswers >= 15 && accuracy < 0.6) {
      messages.push('Ralentis légèrement : la précision compte plus que la vitesse.');
    }

    if (score > 1500) {
      messages.push('Score remarquable pour un sprint de 60 secondes.');
    }

    return messages.join(' ');
  }

  getMirrorFeedback(checklist) {
    const goals = [];
    const map = {
      euh: 'Remplace les "euh" par un court silence.',
      silences: 'Réduis les pauses trop longues en préparant ta phrase avant de parler.',
      repetitions: "Termine chaque idée avant d'en commencer une nouvelle.",
      rapide: 'Ralentis légèrement et articule davantage.',
      lent: 'Dynamise ton débit en variant le rythme.',
      phrases: 'Structure chaque phrase avec un début et une fin clairs.',
      energie: 'Monte légèrement le ton sur les mots importants.',
      monotone: "Varie l'intonation : monte sur les questions, descends sur les conclusions.",
      structure: 'Utilise la structure : idée → raison → exemple → conclusion.',
      conclusion: 'Termine toujours par une phrase de conclusion nette.',
    };

    const checked = Object.entries(checklist).filter(([, v]) => v).map(([k]) => k);
    for (const key of checked.slice(0, 2)) {
      if (map[key]) goals.push(map[key]);
    }

    if (goals.length === 0) {
      return ['Concentre-toi sur la clarté de ta voix et la fluidité de tes phrases.'];
    }
    return goals;
  }

  getClarityFeedback(analysis) {
    const parts = [];

    if (analysis.positives.includes('goodLength')) {
      parts.push(`Ta réponse comporte ${analysis.sentenceCount} phrases — bonne longueur.`);
    }
    if (analysis.positives.includes('hasConnectors')) {
      const c = analysis.connectors[0];
      parts.push(`Tu utilises un connecteur (${c}) : bonne structure générale.`);
    }
    if (analysis.positives.includes('variedVocab')) {
      parts.push('Ton vocabulaire est varié dans cette réponse.');
    }
    if (analysis.issues.includes('tooShort')) {
      parts.push('Ta réponse est courte. Développe avec un argument et un exemple.');
    }
    if (analysis.issues.includes('tooLong')) {
      parts.push('Ta réponse est longue. Essaie de condenser en 2 à 4 phrases percutantes.');
    }
    if (analysis.issues.includes('noPunctuation')) {
      parts.push('Ajoute de la ponctuation pour structurer tes idées.');
    }
    if (analysis.issues.includes('fewSentences')) {
      parts.push('Structure ta réponse en au moins 2 phrases distinctes.');
    }
    if (analysis.issues.includes('longSentences')) {
      parts.push('Certaines phrases sont trop longues. Coupe-les en deux.');
    }
    if (analysis.issues.includes('repetitions')) {
      parts.push('Tu répètes certains mots. Cherche des synonymes.');
    }

    if (parts.length === 0) {
      parts.push('Réponse correcte. Essaie maintenant de la dire à voix haute sans lire.');
    }

    return parts.join(' ');
  }
}

/**
 * Fournisseur réservé pour de futures intégrations locales (Whisper local, modèle LLM local).
 * Non activé pour le moment (respect de la contrainte 100% sans cloud / sans dépendance lourde).
 */
export class FutureLocalAIProvider extends FeedbackProvider {
  constructor(options = {}) {
    super();
    this.options = options;
    this.fallback = new LocalRuleFeedbackProvider();
  }

  async getDebateFeedback(sessionData) {
    return this.fallback.getDebateFeedback(sessionData);
  }

  async getVocabularyFeedback(results) {
    return this.fallback.getVocabularyFeedback(results);
  }

  async getMirrorFeedback(checklist) {
    return this.fallback.getMirrorFeedback(checklist);
  }

  async getClarityFeedback(analysis) {
    return this.fallback.getClarityFeedback(analysis);
  }
}

// Fournisseur actif courant
let activeProvider = new LocalRuleFeedbackProvider();

export function setFeedbackProvider(provider) {
  if (provider instanceof FeedbackProvider) {
    activeProvider = provider;
  } else {
    console.warn('Le fournisseur doit hériter de FeedbackProvider');
  }
}

export function getFeedbackProvider() {
  return activeProvider;
}

export function getDebateFeedback(sessionData) {
  return activeProvider.getDebateFeedback(sessionData);
}

export function getVocabularyFeedback(results) {
  return activeProvider.getVocabularyFeedback(results);
}

export function getMirrorFeedback(checklist) {
  return activeProvider.getMirrorFeedback(checklist);
}

export function getClarityFeedback(analysis) {
  return activeProvider.getClarityFeedback(analysis);
}

export default {
  getDebateFeedback,
  getVocabularyFeedback,
  getMirrorFeedback,
  getClarityFeedback,
  setFeedbackProvider,
  getFeedbackProvider,
  FeedbackProvider,
  LocalRuleFeedbackProvider,
  FutureLocalAIProvider,
};

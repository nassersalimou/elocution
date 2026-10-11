const ROUND_FEEDBACK = [
  {
    condition: (e) => !e.clearIdea && e.hesitated,
    messages: [
      'Pour la prochaine manche, ne cherche pas plusieurs arguments. Choisis une seule idée forte et développe-la immédiatement.',
      'Concentre-toi sur une seule idée. La clarté vaut mieux que la quantité.',
    ],
  },
  {
    condition: (e) => !e.gaveExample,
    messages: [
      'Ton argument gagnerait en force avec un exemple concret. À la prochaine manche, essaie : idée → raison → exemple.',
      'Un exemple concret rendra ta réponse plus convaincante. Pense à une situation réelle.',
    ],
  },
  {
    condition: (e) => !e.startedFast,
    messages: [
      'Tu as mis du temps à démarrer. Dès le "PARLE !", lance ta phrase d\'accroche sans attendre.',
      'Commence par une phrase simple qui pose ta position, même si elle n\'est pas parfaite.',
    ],
  },
  {
    condition: (e) => e.repeated,
    messages: [
      'Tu t\'es répété. Prépare 3 points maximum et avance sans revenir en arrière.',
      'Évite de reformuler la même idée. Passe à l\'argument suivant.',
    ],
  },
  {
    condition: (e) => !e.finishedWell,
    messages: [
      'Ta conclusion manquait de netteté. Termine par "En résumé..." ou "C\'est pourquoi je pense que...".',
      'Prépare ta dernière phrase pendant la réflexion pour conclure avec assurance.',
    ],
  },
  {
    condition: (e) => !e.gaveArgument,
    messages: [
      'Tu as donné une opinion mais pas d\'argument. Ajoute un "parce que" ou "car" à ta prochaine réponse.',
      'Une opinion sans justification reste fragile. Appuie-la d\'une raison claire.',
    ],
  },
  {
    condition: (e) => e.hesitated && e.gaveArgument,
    messages: [
      'Tu as les bonnes idées mais tu hésites trop. Fais confiance à ta première intuition.',
      'L\'hésitation ralentit ton impact. Parle avec conviction, même si ce n\'est pas parfait.',
    ],
  },
  {
    condition: (e) => e.clearIdea && e.gaveExample && e.finishedWell,
    messages: [
      'Excellente structure ! Idée claire, exemple concret et conclusion nette.',
      'Tu maîtrises la formule idée → argument → exemple → conclusion. Continue ainsi.',
    ],
  },
  {
    condition: (e) => e.startedFast && e.clearIdea,
    messages: [
      'Démarrage rapide et idée claire. C\'est exactement ce qu\'on cherche.',
      'Tu as su saisir l\'essentiel rapidement. La pression te convient.',
    ],
  },
  {
    condition: () => true,
    messages: [
      'Réécoute ta prise et note un point à améliorer pour la prochaine manche.',
      'Chaque manche est une occasion de progresser. Concentre-toi sur un seul objectif.',
      'L\'auto-évaluation honnête est ta meilleure alliée pour progresser.',
    ],
  },
];

export function getDebateRoundFeedback(evaluation) {
  for (const rule of ROUND_FEEDBACK) {
    if (rule.condition(evaluation)) {
      const msgs = rule.messages;
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }
  return 'Continue à t\'entraîner.';
}

export function getDebateSessionFeedback(sessionData) {
  const { avgSelfEval, rounds, firstEval, lastEval } = sessionData;
  const parts = [];

  if (avgSelfEval >= 0.75) {
    parts.push('Session solide. Tu gères bien la pression du temps.');
  } else if (avgSelfEval >= 0.5) {
    parts.push('Session correcte avec des axes d\'amélioration identifiés.');
  } else {
    parts.push('Session difficile, mais chaque effort compte. Recommence avec moins de manches.');
  }

  if (lastEval > firstEval) {
    parts.push('Tu t\'es amélioré entre la première et la dernière manche.');
  } else if (lastEval < firstEval) {
    parts.push('La fatigue a peut-être joué en fin de session. Fais des pauses entre les manches.');
  }

  parts.push(`${rounds} manches complétées. Continue à t'entraîner régulièrement.`);

  return parts.join(' ');
}

export function getDebateNextGoal(sessionData) {
  const { lastReflectionTime, avgSelfEval } = sessionData;

  if (avgSelfEval < 0.5) {
    return 'Concentre-toi sur une seule idée claire par manche, sans chercher la perfection.';
  }
  if (lastReflectionTime > 10) {
    return `Essaie de réduire ton temps de réflexion de 5 secondes à la prochaine session.`;
  }
  return 'Essaie de conserver le même niveau de clarté avec 5 secondes de réflexion en moins.';
}

export const DEBATE_SELF_EVAL_QUESTIONS = [
  { key: 'startedFast', label: 'Ai-je commencé rapidement ?' },
  { key: 'clearIdea', label: 'Mon idée principale était-elle claire ?' },
  { key: 'gaveArgument', label: 'Ai-je donné au moins un argument ?' },
  { key: 'gaveExample', label: 'Ai-je donné un exemple ?' },
  { key: 'hesitated', label: 'Ai-je beaucoup hésité ?', invert: true },
  { key: 'repeated', label: 'Me suis-je répété ?', invert: true },
  { key: 'finishedWell', label: 'Ai-je terminé ma pensée correctement ?' },
];

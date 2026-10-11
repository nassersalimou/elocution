export const MIRROR_MISSIONS = [
  'Explique en 45 secondes pourquoi tu aimerais apprendre une nouvelle compétence.',
  'Décris en 45 secondes une expérience qui t\'a marqué récemment.',
  'Présente-toi en 45 secondes comme si tu rencontrais quelqu\'un pour la première fois.',
  'Explique en 45 secondes pourquoi tu recommanderais ton hobby à un ami.',
  'Défends en 45 secondes l\'importance de la lecture au quotidien.',
  'Raconte en 45 secondes un défi que tu as surmonté.',
  'Explique en 45 secondes ce que signifie le succès pour toi.',
  'Décris en 45 secondes ta ville ou ton quartier idéal.',
  'Argumente en 45 secondes pour ou contre le télétravail.',
  'Explique en 45 secondes comment tu gères le stress.',
  'Présente en 45 secondes un projet qui te tient à cœur.',
  'Décris en 45 secondes une personne qui t\'inspire.',
  'Explique en 45 secondes pourquoi la communication est importante.',
  'Raconte en 45 secondes ce que tu ferais avec une journée libre.',
  'Défends en 45 secondes l\'idée que l\'échec est utile.',
];

export const MIRROR_CHECKLIST = [
  { key: 'euh', label: 'Des « euh »' },
  { key: 'silences', label: 'Des silences trop longs' },
  { key: 'repetitions', label: 'Des répétitions' },
  { key: 'rapide', label: 'Un débit trop rapide' },
  { key: 'lent', label: 'Un débit trop lent' },
  { key: 'phrases', label: 'Des phrases qui ne se terminent pas' },
  { key: 'energie', label: 'Un manque d\'énergie' },
  { key: 'monotone', label: 'Une voix monotone' },
  { key: 'structure', label: 'Un manque de structure' },
  { key: 'conclusion', label: 'Une conclusion faible' },
];

export function getRandomMirrorMission() {
  return MIRROR_MISSIONS[Math.floor(Math.random() * MIRROR_MISSIONS.length)];
}

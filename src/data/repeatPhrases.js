import { levelForRound } from '../utils/repeatScoring.js';
export const PHRASE_TYPES = [
  'virelangue',
  'longue',
  'chiffres',
  'noms_propres',
  'vocabulaire_soutenu',
  'liaisons',
  'sons_proches',
];

export const PHRASE_TYPE_LABELS = {
  virelangue: 'Virelangues',
  longue: 'Phrases longues',
  chiffres: 'Chiffres et dates',
  noms_propres: 'Noms propres',
  vocabulaire_soutenu: 'Vocabulaire soutenu',
  liaisons: 'Liaisons',
  sons_proches: 'Sons proches',
};

export const REPEAT_PHRASES = [
  // --- NIVEAU 1 (5 à 8 mots simples) ---
  { text: 'Cinq chiens chassent six chats sages.', type: 'virelangue', level: 1 },
  { text: 'Le soleil brille sur la colline verte.', type: 'longue', level: 1 },
  { text: 'Il arrive le douze mai à huit heures.', type: 'chiffres', level: 1 },
  { text: 'Thomas voyage souvent à Paris et Lyon.', type: 'noms_propres', level: 1 },
  { text: "Ce projet témoigne d'une grande perspicacité.", type: 'vocabulaire_soutenu', level: 1 },
  { text: 'Les enfants ont aperçu un vieil ami.', type: 'liaisons', level: 1 },
  { text: 'Le vent souffle sur les sentiers sombres.', type: 'sons_proches', level: 1 },

  // --- NIVEAU 2 (7 à 11 mots) ---
  { text: 'Un chasseur sachant chasser doit chasser sans son chien.', type: 'virelangue', level: 2 },
  { text: 'La petite barque en bois glisse doucement sur le lac calme.', type: 'longue', level: 2 },
  { text: 'Nous serons exactement vingt-cinq personnes le quatorze juillet prochain.', type: 'chiffres', level: 2 },
  { text: 'Claire et Julien préparent un voyage culturel en Italie du Nord.', type: 'noms_propres', level: 2 },
  { text: 'Cette démarche exige une rigueur et une probité intellectuelle irréprochables.', type: 'vocabulaire_soutenu', level: 2 },
  { text: 'Nous avons admiré les arbres anciens dans un grand espace vert.', type: 'liaisons', level: 2 },
  { text: 'Ces six sacs de sel sèchent au soleil sous le hangar.', type: 'sons_proches', level: 2 },

  // --- NIVEAU 3 (9 à 13 mots) ---
  { text: "Les chemises de l'archiduchesse sont-elles sèches ou archi-sèches dans cette pièce ?", type: 'virelangue', level: 3 },
  { text: "Le vieux train traverse la vallée brumeuse sous une pluie d'automne persistante.", type: 'longue', level: 3 },
  { text: 'La réunion de dix-sept heures rassemblera quarante participants pour le bilan trimestriel.', type: 'chiffres', level: 3 },
  { text: "Alexandre Dumas et Victor Hugo ont marqué l'histoire littéraire de la France.", type: 'noms_propres', level: 3 },
  { text: 'Son éloquence naturelle dissimule une argumentation aussi subtile que particulièrement redoutable.', type: 'vocabulaire_soutenu', level: 3 },
  { text: 'Ils ont invité de vieux amis pour un excellent dîner en terrasse.', type: 'liaisons', level: 3 },
  { text: "Gros gras grand grain d'orge quand te dégros-gras-grand-grain-d'orgeras-tu donc ?", type: 'sons_proches', level: 3 },

  // --- NIVEAU 4 (11 à 15 mots) ---
  { text: 'Papier panier piano panier papier piano trois fois de suite sans aucune erreur.', type: 'virelangue', level: 4 },
  { text: "Chaque matin d'hiver, une fine couche de givre recouvre les chemins menant à la forêt.", type: 'longue', level: 4 },
  { text: 'En deux mille vingt-quatre, plus de trois cent cinquante athlètes ont disputé cette finale.', type: 'chiffres', level: 4 },
  { text: 'Marie Curie et Louis Pasteur demeurent deux figures majeures de la recherche scientifique mondiale.', type: 'noms_propres', level: 4 },
  { text: "L'omniprésence du doute méthodique constitue le ferment indispensable à toute réflexion philosophique féconde.", type: 'vocabulaire_soutenu', level: 4 },
  { text: 'Les enfants et leurs amis ont attendu un instant sous un abri de fortune.', type: 'liaisons', level: 4 },
  { text: 'Si six scies scient six cyprès, six cents scies scient six cents cyprès.', type: 'sons_proches', level: 4 },

  // --- NIVEAU 5 (14 à 18 mots) ---
  { text: 'Fruits frais, fruits cuits, fruits crus, trois tortues trottaient sur un trottoir très étroit.', type: 'virelangue', level: 5 },
  { text: "Le silence matinal de la grande bibliothèque n'était troublé que par le froissement discret des pages.", type: 'longue', level: 5 },
  { text: 'Entre dix-neuf cent quatre-vingt-dix et deux mille vingt, les investissements ont progressé de quarante-deux pour cent.', type: 'chiffres', level: 5 },
  { text: 'De Saint-Malo à Perpignan, Jean de La Fontaine puisa son inspiration pour ses plus célèbres fables.', type: 'noms_propres', level: 5 },
  { text: 'Une telle péripétie ne saurait altérer la constante sérénité dont témoigne cet éminent magistrat réputé intègre.', type: 'vocabulaire_soutenu', level: 5 },
  { text: 'Les oiseaux ont quitté leurs anciens nids pour trouver un autre refuge dans les grands arbres.', type: 'liaisons', level: 5 },
  { text: 'Seize chaises sèches cherchent seize sorcières sages sous un saule sombre et solitaire.', type: 'sons_proches', level: 5 },

  // --- NIVEAU 6 (16 à 21 mots) ---
  { text: 'Tas de riz, tas de rats, tas de riz tentant, tas de rats tentés, le riz tenta les rats.', type: 'virelangue', level: 6 },
  { text: "Lorsque la lumière dorée du crépuscule illumine les toits d'ardoise, toute la vieille cité semble plongée dans un rêve immémorial.", type: 'longue', level: 6 },
  { text: 'Le traité signé le vingt-sept novembre mille neuf cent quatre-vingt-dix-neuf engageait vingt-trois nations pour une durée de trente ans.', type: 'chiffres', level: 6 },
  { text: 'Gustave Flaubert, Émile Zola et Honoré de Balzac ont dépeint les travers de la société bourgeoise du dix-neuvième siècle.', type: 'noms_propres', level: 6 },
  { text: 'La magnanimité du souverain contrastait singulièrement avec la vindicte opiniâtre que nourrissaient ses plus belliqueux conseillers de cour.', type: 'vocabulaire_soutenu', level: 6 },
  { text: "Vous avez sans doute appris que les experts ont analysé d'anciens manuscrits dans un profond recueillement intellectuel.", type: 'liaisons', level: 6 },
  { text: "Didon dîna, dit-on, du dos d'un dodu dindon, tandis que dix dindons dodus dormaient dehors.", type: 'sons_proches', level: 6 },

  // --- NIVEAU 7 (18 à 25 mots) ---
  { text: "Ciel, si c'est cinq sous ces six saucissons-ci, c'est cent sous ces six cents saucissons-ci, s'écria le charcutier surpris.", type: 'virelangue', level: 7 },
  { text: 'Au cœur des massifs alpins, les randonneurs chevronnés découvrent souvent des sentiers oubliés que seuls les bergers de jadis parcouraient au retour des estives.', type: 'longue', level: 7 },
  { text: 'Sur un échantillon de huit cent soixante-quinze personnes interrogées entre le premier et le dix-huit mars, soixante-deux pour cent privilégient cette option.', type: 'chiffres', level: 7 },
  { text: "De Chambord à Chenonceau, François Premier et Catherine de Médicis ont laissé une empreinte indélébile sur l'architecture de la Renaissance française.", type: 'noms_propres', level: 7 },
  { text: 'Cette dichotomie fallacieuse entre pragmatisme gestionnaire et idéalisme politique obscurcit le discernement des citoyens et affaiblit le débat démocratique contemporain.', type: 'vocabulaire_soutenu', level: 7 },
  { text: 'Les grands auteurs ont souvent exprimé un attachement sans égal aux nobles idéaux qui unissent les peuples par-delà leurs frontières.', type: 'liaisons', level: 7 },
  { text: "La pie niche haut, l'oie niche bas, où niche l'hibou ? L'hibou ne niche ni haut ni bas, l'hibou niche entre deux bois.", type: 'sons_proches', level: 7 },

  // --- NIVEAU 8 (21 à 28 mots) ---
  { text: 'Un pâtissier qui pâtissait chez un tapissier qui tapissait dit un jour au tapissier qui tapissait : pourquoi ne pas pâtisser ensemble ?', type: 'virelangue', level: 8 },
  { text: "Malgré l'âpreté des vents d'hiver et la montée continue des eaux côtières, les gardiens du phare maintenaient la lanterne allumée avec un courage admirable et constant.", type: 'longue', level: 8 },
  { text: "Le projet nécessitera un budget de quatorze millions sept cent mille euros répartis sur quatre tranches distinctes jusqu'au trente et un décembre deux mille vingt-sept.", type: 'chiffres', level: 8 },
  { text: 'Rostand composa pour Sarah Bernhardt et Coquelin des tirades flamboyantes que les comédiens du Théâtre de la Porte-Saint-Martin déclamaient avec ferveur.', type: 'noms_propres', level: 8 },
  { text: "L'herméneutique des textes fondateurs exige une circonspection philologique rigoureuse afin d'éviter toute interprétation anachronique susceptible de dénaturer la pensée originelle de l'auteur.", type: 'vocabulaire_soutenu', level: 8 },
  { text: "Des hommes illustres ont souvent laissé entendre qu'un accord tacite entre les nations pouvait prévenir les plus dramatiques erreurs du passé.", type: 'liaisons', level: 8 },
  { text: "Natacha n'attacha pas son chat Pacha qui s'échappa, ce qui fâcha Sacha qui chassa Natacha du chalet familial.", type: 'sons_proches', level: 8 },

  // --- NIVEAU 9 (23 à 30 mots) ---
  { text: "La cavale au Valaque avala l'eau du lac et le Valaque avala la cavale sans laisser la moindre trace de ce fantastique banquet aquatique.", type: 'virelangue', level: 9 },
  { text: "Après plusieurs semaines d'une navigation particulièrement rude au milieu d'icebergs menaçants, l'équipage exténué aperçut enfin la terre ferme dissimulée derrière un épais rideau de brume matinale.", type: 'longue', level: 9 },
  { text: 'Sur les trois mille deux cent quarante candidats inscrits au concours du quinze septembre deux mille vingt-trois, seuls quatre-vingt-huit ont été admis au second tour.', type: 'chiffres', level: 9 },
  { text: "Montesquieu, Jean-Jacques Rousseau et Denis Diderot partagèrent avec Voltaire une foi inébranlable dans le pouvoir émancipateur des Lumières à travers toute l'Europe occidentale.", type: 'noms_propres', level: 9 },
  { text: "L'obséquiosité coutumière de cette assemblée courtisane masquait à peine la pusillanimité collective face aux décisions péremptoires dictées par un exécutif devenu réfractaire à toute contradiction publique.", type: 'vocabulaire_soutenu', level: 9 },
  { text: 'Les anciens élèves ont unanimement affirmé que les excellents conseils de leurs professeurs avaient constitué une aide précieuse tout au long de leur parcours universitaire.', type: 'liaisons', level: 9 },
  { text: "Seize jacinthes sèches séchaient sur seize souches sombres sous le souffle sifflant d'un sévère blizzard septentrional.", type: 'sons_proches', level: 9 },

  // --- NIVEAU 10 (25 à 35 mots denses) ---
  { text: 'Six sous-préfets sur six cents surfaces sèches sucent six sangsues sans souci des soupçons formulés par six magistrats sévères qui surveillent chaque geste sous un soleil souverain.', type: 'virelangue', level: 10 },
  { text: "Tandis que la tempête redoublait d'intensité sur la crête rocheuse, les sauveteurs progressaient pas à pas dans l'obscurité totale, guidés uniquement par le signal intermittent d'une balise de détresse enfouie sous un monticule de neige durcie.", type: 'longue', level: 10 },
  { text: "Le rapport officiel dénombre deux mille huit cent soixante-quatre interventions maritimes au cours de l'année deux mille vingt-deux, mobilisant près de dix-sept mille bénévoles sur sept cent quarante kilomètres de côtes.", type: 'chiffres', level: 10 },
  { text: 'De Fontainebleau à Versailles, le cardinal de Richelieu et le cardinal Mazarin façonnèrent la diplomatie européenne sous les règnes successifs de Louis Treize et de Louis Quatorze.', type: 'noms_propres', level: 10 },
  { text: "La propension inextinguible à l'ergotage byzantin qui caractérise ce cénacle d'érudits désœuvrés paralyse irrémédiablement l'émergence d'un consensus épistémologique pourtant indispensable à l'aboutissement de leurs travaux scientifiques conjoints.", type: 'vocabulaire_soutenu', level: 10 },
  { text: "Les illustres invités ont enfin accédé aux étages supérieurs où les organisateurs avaient élégamment disposé les précieux objets d'art découverts lors des récentes fouilles archéologiques en Orient.", type: 'liaisons', level: 10 },
  { text: 'Le chasseur Sacho chuchota à Sacha : sache chasser ce chat chagrin qui cherche sans cesse à chiper sept saucisses sèches sous ce chapeau sombre !', type: 'sons_proches', level: 10 },
];

/**
 * Retourne une liste de phrases de secours par niveau croissant.
 * @param {number} startLevel Niveau de départ (1..10)
 * @param {number} count Nombre de phrases souhaité
 * @returns {Array<{ text: string, type: string, level: number }>}
 */
export function getFallbackPhrases(startLevel = 1, count = 10) {
  const safeStart = Math.max(1, Math.min(10, Number(startLevel) || 1));
  const safeCount = Math.max(1, Math.min(15, Number(count) || 10));

  const chosen = [];
  const usedTexts = new Set();

  for (let i = 0; i < safeCount; i++) {
    const targetLevel = levelForRound(safeStart, i);
    const pool = REPEAT_PHRASES.filter((p) => p.level === targetLevel && !usedTexts.has(p.text));

    let picked;
    if (pool.length > 0) {
      picked = pool[Math.floor(Math.random() * pool.length)];
    } else {
      // Fallback si tout est utilisé à ce niveau
      const generalPool = REPEAT_PHRASES.filter((p) => p.level === targetLevel);
      picked = generalPool[Math.floor(Math.random() * generalPool.length)] || REPEAT_PHRASES[0];
    }

    if (picked) {
      usedTexts.add(picked.text);
      chosen.push({ ...picked });
    }
  }

  return chosen;
}

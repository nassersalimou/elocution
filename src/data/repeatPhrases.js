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

  // --- NIVEAU 5 (17 à 22 mots, une vraie difficulté par phrase) ---
  { text: 'Trois gros rats gris grattaient trois grandes grappes grasses, pendant que trois grues grises grignotaient gravement trois grains gris.', type: 'virelangue', level: 5 },
  { text: "Dans la cour de la vieille ferme, le jardinier ramassait patiemment les feuilles mortes que l'automne avait dispersées pendant la nuit.", type: 'longue', level: 5 },
  { text: 'Entre mille neuf cent quatre-vingt-dix et deux mille vingt, la population de cette ville est passée de douze mille à quarante-sept mille habitants.', type: 'chiffres', level: 5 },
  { text: 'Pierre et Marie Curie ont découvert le radium à Paris, avant que Marie ne reçoive un second prix Nobel à Stockholm.', type: 'noms_propres', level: 5 },
  { text: "Cette équivoque persistante entre la rigueur affichée et la complaisance réelle nuit gravement à la crédibilité de l'institution tout entière.", type: 'vocabulaire_soutenu', level: 5 },
  { text: "Nous avons tous étudié ensemble ces anciens articles, et ils étaient plus intéressants qu'on ne l'avait imaginé hier.", type: 'liaisons', level: 5 },
  { text: 'Un chasseur sachant chasser sans son chien chasse six chevreuils chétifs chaque soir dans ces champs sombres.', type: 'sons_proches', level: 5 },

  // --- NIVEAU 6 (21 à 28 mots) ---
  { text: "Un généreux déjeuner régénérerait ces jeunes gens jonglant jusqu'à minuit, mais ces gens jeûnent justement chaque jeudi, jour de jeûne général dans la jungle.", type: 'virelangue', level: 6 },
  { text: 'Au sommet de la colline balayée par le vent, le vieil astronome ajustait lentement son télescope en attendant que les nuages découvrent enfin la comète annoncée depuis plusieurs semaines.', type: 'longue', level: 6 },
  { text: 'Le vingt-trois septembre deux mille dix-huit, trois cent quarante-sept bénévoles ont distribué mille deux cent soixante-quinze repas dans quatorze villages de la vallée.', type: 'chiffres', level: 6 },
  { text: 'Léonard de Vinci, Michel-Ange et Raphaël ont travaillé tour à tour à Florence, à Rome et à Milan pour les Médicis, les papes et les Sforza.', type: 'noms_propres', level: 6 },
  { text: "Son intransigeance doctrinale, loin de servir la cause qu'il prétendait défendre, finit par aliéner les plus fidèles de ses partisans et par discréditer son propos.", type: 'vocabulaire_soutenu', level: 6 },
  { text: "Les experts ont attentivement examiné ces anciens objets, et ils en ont conclu qu'ils étaient aussi authentiques qu'inestimables, ce qui a surpris tous les invités.", type: 'liaisons', level: 6 },
  { text: 'Six cent six chasseurs chassaient six cent six chamois sauvages sous six cent six sapins serrés, chacun cherchant sa chance sans sa sacoche.', type: 'sons_proches', level: 6 },

  // --- NIVEAU 7 (25 à 33 mots) ---
  { text: 'Pruneau de Perse, prune de Brignoles, prunelle prise dans la brume : prune par prune, prunier par prunier, prépare ta prune et prépare ton prunier.', type: 'virelangue', level: 7 },
  { text: 'Bien avant que le jour ne se lève sur le port endormi, les pêcheurs préparaient déjà leurs filets, vérifiaient les moteurs et chargeaient la glace nécessaire à la longue traversée qui les attendait.', type: 'longue', level: 7 },
  { text: 'Sur les neuf cent quatre-vingt-sept mille euros de subvention votés le douze février deux mille vingt et un, seulement trois cent soixante-dix-huit mille ont été effectivement versés avant juin.', type: 'chiffres', level: 7 },
  { text: 'Napoléon Bonaparte, né à Ajaccio, fut couronné à Notre-Dame de Paris, vaincu à Waterloo puis exilé à Sainte-Hélène, très loin de la Corse et de Fontainebleau.', type: 'noms_propres', level: 7 },
  { text: "L'ostentation avec laquelle ce ministre affichait sa probité contrastait cruellement avec les stratagèmes dilatoires qu'il employait pour éluder les investigations de la commission parlementaire.", type: 'vocabulaire_soutenu', level: 7 },
  { text: "Quand ils ont aperçu les anciens élèves arriver à huit heures et demie, ils en ont été tellement émus qu'ils ont oublié d'enlever leurs imperméables.", type: 'liaisons', level: 7 },
  { text: 'Cinq chats chassent six souris sournoises ; six souris sentent cinq chats et se cachent sous cinq sièges ; ces sièges sont si secs que six souris glissent.', type: 'sons_proches', level: 7 },

  // --- NIVEAU 8 (28 à 36 mots) ---
  { text: "Ton thé t'a-t-il ôté ta toux ? Ton tonton Théodore tond ton tout petit teckel tandis que tante Thérèse tamise trente-trois tonnes de tapioca tiède.", type: 'virelangue', level: 8 },
  { text: "Malgré la fatigue accumulée pendant ces dernières semaines de travail acharné, la petite équipe de chercheurs continuait d'espérer qu'une dernière série d'expériences leur révélerait enfin la clef du mystère qui occupait leurs nuits.", type: 'longue', level: 8 },
  { text: "Au terme de dix-huit mois de négociations, les deux cent trente-quatre délégués ont ratifié un accord de trois milliards deux cent cinquante millions d'euros, entré en vigueur le premier janvier deux mille vingt-cinq.", type: 'chiffres', level: 8 },
  { text: "Dostoïevski, Tolstoï et Tchekhov ont décrit l'âme russe, tandis que Cervantès, García Márquez et Borges ont exploré l'imaginaire hispanique, de Madrid à Buenos Aires.", type: 'noms_propres', level: 8 },
  { text: 'La pusillanimité des gouvernants, savamment dissimulée derrière une rhétorique de la prudence, a fini par engendrer une défiance généralisée dont les ressorts échappent encore aux analystes les plus perspicaces.', type: 'vocabulaire_soutenu', level: 8 },
  { text: "Ces hommes illustres n'ont jamais hésité à affirmer, en toute occasion et sans aucune arrière-pensée, qu'un enfant instruit est un atout inestimable pour une nation entière.", type: 'liaisons', level: 8 },
  { text: 'Le serpent sournois siffle sans cesse sous les saules, tandis que six cents sauterelles sautillent sur ces sentiers sablonneux sans jamais se soucier du soleil.', type: 'sons_proches', level: 8 },

  // --- NIVEAU 9 (33 à 44 mots) ---
  { text: "Quand un cordonnier cordant sa corde cordonne, tous les cordonniers qui cordent leur corde cordonnent comme lui ; mais celui qui corde mal sa corde corrompt le cordon que ses confrères cordaient.", type: 'virelangue', level: 9 },
  { text: "Lorsque les premiers rayons du soleil franchirent enfin la crête des montagnes, le village entier, jusque-là plongé dans un silence presque religieux, s'éveilla dans un joyeux tumulte de volets claquants, d'aboiements lointains et d'appels échangés d'une fenêtre à l'autre.", type: 'longue', level: 9 },
  { text: "Selon l'enquête menée du quatre au dix-neuf novembre mille neuf cent quatre-vingt-quinze auprès de vingt-deux mille six cent quarante-trois foyers, soixante-dix-huit pour cent des personnes interrogées jugeaient la situation préoccupante.", type: 'chiffres', level: 9 },
  { text: "Gabriel García Márquez, Pablo Neruda et Octavio Paz, nés en Colombie, au Chili et au Mexique, ont reçu le prix Nobel de littérature, tandis qu'Isabel Allende préférait vivre à San Francisco.", type: 'noms_propres', level: 9 },
  { text: "L'ambivalence structurelle de cette réforme, tour à tour célébrée comme un aggiornamento nécessaire et dénoncée comme une capitulation idéologique, illustre l'impossibilité d'un consensus que nul n'ose franchement appeler de ses vœux.", type: 'vocabulaire_soutenu', level: 9 },
  { text: "Les amis étrangers, accueillis à Orléans par un ancien ingénieur aussi élégant qu'affable, ont admiré ensemble les immenses allées ombragées où les écoliers s'amusaient à épeler à haute voix leurs exercices.", type: 'liaisons', level: 9 },
  { text: 'Ces six chevaux chauves chassent chacun six chats chétifs sur les chemins chauds, cherchant chaque jour sans cesse ce chaud chalet où sèchent six chemises sales.', type: 'sons_proches', level: 9 },

  // --- NIVEAU 10 (38 à 52 mots, très denses) ---
  { text: 'Le sixième sapeur-pompier de la sixième section cherche six cent six sacs de sel sous six sièges sales, sachant que ces six cents saucissons si savoureux sentaient sûrement ce sel sec que six sourciers sans soucis suçaient sans cesse.', type: 'virelangue', level: 10 },
  { text: "Alors que l'orage grondait au-dessus de la vallée et que la rivière, grossie par les pluies de la semaine, menaçait de déborder à chaque instant, les habitants du hameau, rassemblés dans la grange du vieux Marcel, s'organisaient en silence pour sauver ce qui pouvait encore l'être avant l'aube.", type: 'longue', level: 10 },
  { text: "En deux mille dix-neuf, les huit cent quarante-deux mille trois cent soixante-quinze visiteurs du musée ont payé un billet de quatorze euros, soit onze millions sept cent quatre-vingt-treize mille deux cent cinquante euros de recettes, en hausse de quarante pour cent sur l'année précédente.", type: 'chiffres', level: 10 },
  { text: 'De Jean-Sébastien Bach à Wolfgang Amadeus Mozart, puis de Ludwig van Beethoven à Frédéric Chopin, Franz Liszt et Claude Debussy, la musique européenne a traversé Leipzig, Vienne, Varsovie, Weimar et Paris.', type: 'noms_propres', level: 10 },
  { text: "La déliquescence progressive des corps intermédiaires, que d'aucuns attribuent à la défiance endémique envers toute forme de médiation institutionnelle, n'est peut-être que le symptôme d'une mutation anthropologique dont nous peinons encore à mesurer l'ampleur véritable.", type: 'vocabulaire_soutenu', level: 10 },
  { text: "Il est peu probable qu'ils aient pu entendre, à travers ces épais murs anciens, les échos affaiblis des appels aigus que leurs amis adressaient aux ouvriers occupés à l'étage supérieur.", type: 'liaisons', level: 10 },
  { text: "Ce serpent sifflant a surpris six cent soixante-six scorpions assoupis sous ces sept énormes souches sèches, si bien que ces sinistres sauriens ont sursauté sans savoir ce qui s'était passé.", type: 'sons_proches', level: 10 },

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

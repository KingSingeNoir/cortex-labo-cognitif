/**
 * 6 domaines (la plupart 4 jeux ; Logique formelle en a 3).
 * Chaque jeu porte sa fiche de présentation : `goal` (ce qu’il entraîne),
 * `howTo` (étapes), `scoring` (critère de réussite d’une manche).
 */

export const COGNITIVE_DOMAINS = Object.freeze([
  {
    id: 'imt',
    code: 'IMT',
    title: 'Mémoire de travail',
    expert: 'Neuropsychologie clinique — modèle de Baddeley',
    blurb:
      'La mémoire de travail est le « bloc-notes » du cerveau : elle garde une information en tête quelques secondes pendant que vous la manipulez. On l’entraîne en la sollicitant activement, pas en répétant.',
    slot: 'evening',
    exercises: [
      {
        id: 'imt-nback',
        title: 'N-back adaptatif',
        ui: 'nback',
        blurb: 'Repérer quand un élément est identique à celui vu quelques pas plus tôt.',
        goal:
          'Mettre à jour en continu ce que vous avez en tête : chaque nouvel élément chasse le plus ancien.',
        howTo: [
          'Des éléments (lettres ou cases) s’affichent un par un, à intervalle régulier.',
          'Comparez chaque élément à celui affiché N pas plus tôt (N est indiqué dans la consigne).',
          'S’ils sont identiques, touchez « Identique ». Sinon, ne faites rien et attendez le suivant.',
        ],
        scoring:
          'Manche réussie si vous repérez au moins 65 % des correspondances sans multiplier les fausses alertes.',
      },
      {
        id: 'imt-span',
        title: 'Empan inversé',
        ui: 'span',
        blurb: 'Retenir une séquence, puis la restituer à l’envers.',
        goal:
          'Retourner mentalement une séquence oblige à la tenir en mémoire tout en la réorganisant.',
        howTo: [
          'Une séquence de chiffres ou de lettres s’affiche, un élément à la fois.',
          'Retenez-la dans l’ordre d’apparition.',
          'À la fin, tapez-la en commençant par le dernier élément, puis validez.',
        ],
        scoring: 'Manche réussie si la séquence inversée est exacte.',
      },
      {
        id: 'imt-running',
        title: 'Mémoire de mise à jour',
        ui: 'running',
        blurb: 'Garder en tête les derniers éléments d’un flux qui s’arrête sans prévenir.',
        goal:
          'Remplacer sans cesse le contenu de votre mémoire, comme lorsqu’on suit une conversation qui avance.',
        howTo: [
          'Des lettres défilent une par une ; vous ne savez pas quand le flux s’arrêtera.',
          'Gardez toujours en tête les dernières lettres (leur nombre est indiqué dans la consigne).',
          'Quand le flux s’arrête, tapez ces dernières lettres dans leur ordre d’apparition.',
        ],
        scoring: 'Manche réussie si les dernières lettres sont exactes et dans le bon ordre.',
      },
      {
        id: 'imt-dual',
        title: 'Double tâche',
        ui: 'dual',
        blurb: 'Garder une information pendant qu’une autre tâche vous occupe.',
        goal:
          'Protéger une information contre l’interférence d’une tâche secondaire, comme retenir un code pendant qu’on vous parle.',
        howTo: [
          'Un mot, un code ou un chiffre s’affiche : mémorisez-le.',
          'Des nombres apparaissent ensuite : indiquez pour chacun s’il est pair ou impair.',
          'Enfin, tapez l’élément que vous deviez retenir.',
        ],
        scoring:
          'Manche réussie si l’élément restitué est exact et si au moins la moitié des réponses « pair / impair » sont justes.',
      },
    ],
  },
  {
    id: 'irp',
    code: 'IRP',
    title: 'Raisonnement perceptif',
    expert: 'Psychologie cognitive — intelligence fluide (matrices de Raven)',
    blurb:
      'C’est la partie du raisonnement que mesurent les tests de QI : découvrir une règle cachée sur un matériel jamais vu. Chaque essai est généré à neuf, impossible d’apprendre les réponses par cœur.',
    slot: 'morning',
    exercises: [
      {
        id: 'irp-matrix',
        title: 'Matrices progressives',
        ui: 'matrix',
        blurb: 'Trouver la figure qui complète une grille logique.',
        goal:
          'Dégager une ou plusieurs règles (rotation, couleur, nombre) à partir de quelques exemples.',
        howTo: [
          'Observez la grille : d’une case à l’autre, les figures changent selon une ou plusieurs règles.',
          'Repérez ce qui varie : l’orientation, la couleur, le nombre de formes.',
          'Choisissez, parmi les propositions, la figure qui remplace le point d’interrogation.',
        ],
        scoring: 'Manche réussie si vous choisissez la bonne figure.',
      },
      {
        id: 'irp-rotation',
        title: 'Rotation mentale',
        ui: 'rotation',
        blurb: 'Reconnaître un objet tourné, sans se laisser piéger par son reflet.',
        goal:
          'Faire tourner une image dans votre tête, une capacité utile pour lire une carte ou monter un meuble.',
        howTo: [
          'Observez l’objet de référence, composé de petits cubes colorés.',
          'Parmi les propositions, une seule montre ce même objet, simplement tourné.',
          'Attention : l’une des propositions est son reflet dans un miroir, ce n’est pas la bonne réponse.',
        ],
        scoring: 'Manche réussie si vous choisissez la vraie rotation.',
      },
      {
        id: 'irp-analogy',
        title: 'Analogies visuelles',
        ui: 'analogy',
        blurb: 'A est à B ce que C est à… quoi ?',
        goal:
          'Transférer une règle d’une situation à une autre, le cœur du raisonnement par analogie.',
        howTo: [
          'Comparez les figures A et B : qu’est-ce qui a changé entre les deux ?',
          'Appliquez exactement la même transformation à la figure C.',
          'Choisissez la proposition qui correspond au résultat.',
        ],
        scoring: 'Manche réussie si vous choisissez la bonne figure.',
      },
      {
        id: 'irp-series',
        title: 'Séries logiques',
        ui: 'series',
        blurb: 'Deviner l’élément suivant d’une progression.',
        goal: 'Repérer une progression régulière et la prolonger d’un cran.',
        howTo: [
          'Observez les quatre figures, de gauche à droite.',
          'Cherchez ce qui évolue d’une figure à la suivante (nombre, orientation, couleur, alternance).',
          'Choisissez la figure qui viendrait logiquement en cinquième position.',
        ],
        scoring: 'Manche réussie si vous choisissez la bonne figure.',
      },
    ],
  },
  {
    id: 'ivt',
    code: 'IVT',
    title: 'Vitesse de traitement',
    expert: 'Neurosciences cognitives — chronométrie et attention sélective',
    blurb:
      'La vitesse de traitement mesure la rapidité avec laquelle vous percevez et traitez une information simple. Ici, aller vite ne suffit pas : la justesse compte autant que la rapidité.',
    slot: 'morning',
    exercises: [
      {
        id: 'ivt-code',
        title: 'Code-symbole',
        ui: 'codeSymbol',
        blurb: 'Traduire des symboles en chiffres grâce à une clé.',
        goal: 'Associer rapidement deux informations à l’aide d’une table de correspondance.',
        howTo: [
          'Une clé en haut de l’écran associe chaque symbole à un chiffre.',
          'Un symbole s’affiche au centre : touchez le chiffre qui lui correspond.',
          'Enchaînez le plus vite possible, sans sacrifier la justesse.',
        ],
        scoring: 'Manche réussie si au moins 70 % de vos réponses sont justes.',
      },
      {
        id: 'ivt-barrage',
        title: 'Barrage d’attention',
        ui: 'barrage',
        blurb: 'Repérer toutes les occurrences d’une lettre dans une grille.',
        goal: 'Balayer une zone méthodiquement sans rien oublier, comme pour relire un document.',
        howTo: [
          'La lettre à chercher est indiquée dans la consigne.',
          'Touchez chaque case qui contient cette lettre ; touchez-la de nouveau pour la désélectionner.',
          'Quand vous pensez les avoir toutes trouvées, touchez « J’ai terminé ».',
        ],
        scoring:
          'Manche réussie si vous trouvez toutes les lettres cibles, avec au plus une erreur.',
      },
      {
        id: 'ivt-stroop',
        title: 'Stroop et interférence',
        ui: 'stroop',
        blurb: 'Répondre selon la couleur de l’encre, et non selon le mot écrit.',
        goal:
          'Freiner un automatisme (la lecture) pour suivre la consigne : c’est le contrôle inhibiteur.',
        howTo: [
          'Un nom de couleur s’affiche, écrit dans une encre de couleur parfois différente.',
          'Ignorez le sens du mot : regardez uniquement la couleur de l’encre.',
          'Touchez le bouton de cette couleur.',
        ],
        scoring: 'Manche réussie si au moins 70 % de vos réponses sont justes.',
      },
      {
        id: 'ivt-compare',
        title: 'Identique ou différent',
        ui: 'compare',
        blurb: 'Comparer deux paires de lettres affichées très brièvement.',
        goal: 'Saisir et comparer une information en une fraction de seconde.',
        howTo: [
          'Deux paires de lettres s’affichent côte à côte pendant un court instant, puis disparaissent.',
          'Décidez si les deux paires étaient exactement identiques.',
          'Touchez « Identiques » ou « Différentes ».',
        ],
        scoring: 'Manche réussie si au moins 70 % de vos réponses sont justes.',
      },
    ],
  },
  {
    id: 'att',
    code: 'ATT-MIX',
    title: 'Concentration et flux multiples',
    expert:
      'Attention (Posner) et coût de bascule (Pashler) — un entraînement fusionné',
    blurb:
      'Le « multitâche » n’existe pas vraiment : le cerveau bascule d’une tâche à l’autre, et chaque bascule coûte de l’attention. Ces jeux entraînent à rester concentré malgré les interruptions et à changer de règle sans se perdre.',
    slot: 'evening',
    exercises: [
      {
        id: 'att-mix-focus',
        title: 'Focus et bascule',
        ui: 'focusSwitch',
        blurb: 'Suivre une règle qui change, malgré de fausses notifications.',
        goal:
          'Changer de règle rapidement tout en résistant aux sollicitations, comme une alerte de message.',
        howTo: [
          'Un nom de couleur s’affiche, écrit dans une encre de couleur.',
          'La règle, affichée au-dessus, indique s’il faut répondre selon la couleur de l’encre ou selon le mot écrit ; elle peut changer à tout moment.',
          'Des notifications « Nouveau message » apparaissent : ne les touchez surtout pas.',
        ],
        scoring:
          'Manche réussie si au moins 70 % de vos réponses sont justes et si vous n’avez touché aucune notification.',
      },
      {
        id: 'att-mix-reading',
        title: 'Lecture et veille',
        ui: 'readingWatch',
        blurb: 'Comprendre un texte tout en surveillant un signal rare.',
        goal:
          'Partager l’attention entre une tâche principale (lire) et une surveillance de fond.',
        howTo: [
          'Lisez attentivement le court texte.',
          'Pendant ce temps, surveillez les cases sous le texte : dès qu’un « X » y apparaît, touchez-le.',
          'Répondez ensuite à la question sur le texte ; votre réponse clôt la manche.',
        ],
        scoring:
          'Manche réussie si la réponse est juste et si vous avez attrapé le « X » avant de répondre.',
      },
      {
        id: 'att-mix-watch',
        title: 'Veille et urgence',
        ui: 'watchPriority',
        blurb: 'Repérer un signal, puis traiter la tâche la plus urgente.',
        goal:
          'Passer d’une surveillance passive à une décision rapide, en jugeant ce qui est vraiment prioritaire.',
        howTo: [
          'Première phase : des lettres défilent dans plusieurs cases ; touchez la case dès qu’un « X » apparaît.',
          'Seconde phase : des jauges d’urgence bougent pendant quelques secondes.',
          'Touchez la tâche dont la jauge est la plus haute au moment où vous répondez.',
        ],
        scoring:
          'Manche réussie si vous attrapez le « X » et si vous choisissez la tâche la plus urgente.',
      },
      {
        id: 'att-mix-recall',
        title: 'Rappel sous bascule',
        ui: 'delayedSwitch',
        blurb: 'Retenir une information pendant que deux règles alternent.',
        goal:
          'Conserver une information pendant une activité qui mobilise l’attention et change de règle.',
        howTo: [
          'Un mot accompagné d’une lettre s’affiche (par exemple PHARE-K) : mémorisez-le.',
          'Triez ensuite des formes selon la règle affichée, par couleur ou par forme ; elle peut changer.',
          'Enfin, tapez le mot mémorisé au début, tiret et lettre compris.',
        ],
        scoring: 'Manche réussie si le mot restitué est exact.',
      },
    ],
  },
  {
    id: 'vis',
    code: 'VIS-YEUX',
    title: 'Yeux et écrans',
    expert:
      'Hygiène visuelle numérique (fatigue, sécheresse, vision de près) — ce n’est pas un traitement médical',
    blurb:
      'Fixer un écran de près pendant des heures fatigue les yeux : on cligne moins, le regard se fige. Ces exercices font travailler la mise au point, le suivi du regard et le clignement, en prévention.',
    slot: 'evening',
    tone: 'vision',
    exercises: [
      {
        id: 'vis-accom',
        title: 'Près et loin (20-20-20)',
        ui: 'visAccom',
        blurb: 'Regarder de près, puis au loin, puis refaire la mise au point.',
        goal:
          'Détendre le muscle qui fait la mise au point de près, sollicité en permanence devant un écran.',
        howTo: [
          'Fixez la lettre affichée à l’écran quelques secondes.',
          'Levez les yeux et regardez un point réel éloigné (une fenêtre, le fond de la pièce) jusqu’à la fin du compte à rebours.',
          'Revenez à l’écran et indiquez quelle lettre vous aviez fixée.',
        ],
        scoring: 'Manche réussie si vous retrouvez la bonne lettre.',
      },
      {
        id: 'vis-pursuit',
        title: 'Poursuite oculaire',
        ui: 'visPursuit',
        blurb: 'Suivre une cible mobile des yeux.',
        goal: 'Assouplir un regard resté figé longtemps sur le même point.',
        howTo: [
          'Un point lumineux se déplace dans la zone sombre : suivez-le des yeux, sans bouger la tête.',
          'De temps en temps, il devient orange pendant un bref instant.',
          'Touchez la zone à ce moment-là.',
        ],
        scoring: 'Manche réussie si vous réagissez à au moins 60 % des passages à l’orange.',
      },
      {
        id: 'vis-saccade',
        title: 'Saccades',
        ui: 'visSaccade',
        blurb: 'Sauter du regard d’un coin à l’autre.',
        goal:
          'Entraîner les sauts du regard (les saccades), que l’on utilise pour lire et explorer une page.',
        howTo: [
          'Une lettre apparaît dans l’un des quatre coins du cadre.',
          'Portez directement le regard sur elle, sans balayer tout le cadre.',
          'Touchez-la avant qu’elle ne disparaisse.',
        ],
        scoring: 'Manche réussie si vous touchez au moins 70 % des lettres à temps.',
      },
      {
        id: 'vis-blink',
        title: 'Clignement et repos',
        ui: 'visBlink',
        blurb: 'Cligner lentement, reposer les yeux, puis refaire la mise au point.',
        goal:
          'Lutter contre la sécheresse oculaire : devant un écran, on cligne jusqu’à trois fois moins souvent.',
        howTo: [
          'Clignez lentement et complètement, puis touchez le bouton après chaque clignement.',
          'Couvrez ensuite vos yeux avec les paumes, sans appuyer, pendant le compte à rebours (le « palming »).',
          'Rouvrez les yeux et fixez les lettres affichées jusqu’à les voir nettes.',
        ],
        scoring: 'Exercice de détente : la manche est réussie dès que vous allez au bout.',
      },
    ],
  },
  {
    id: 'log',
    code: 'LOG',
    title: 'Logique formelle',
    expert: 'Psychométrie — intelligence fluide, raisonnement quantitatif, déduction',
    blurb:
      'Ces épreuves viennent d’un laboratoire d’entraînement (matrices, suites, syllogismes). Chaque essai invente de nouvelles formes, de nouvelles lois et de nouveaux mots : on n’apprend pas les réponses par cœur, on entraîne la règle.',
    slot: 'morning',
    exercises: [
      {
        id: 'log-matrix',
        title: 'Matrices à axe',
        ui: 'svgMatrix',
        blurb: 'Compléter une grille 3 × 3 dont les figures, couleurs et orientations changent à chaque essai.',
        goal:
          'Dégager plusieurs règles à la fois (forme, nombre, orientation, couleur, remplissage), comme dans une matrice progressive.',
        howTo: [
          'Observez les huit cases remplies : chaque essai invente un nouveau jeu de formes (étoiles, flèches, anneaux, croissants…).',
          'Repérez ce qui change d’une ligne à l’autre et d’une colonne à l’autre : ce n’est jamais la même combinaison.',
          'Choisissez, parmi les quatre propositions, la figure qui occupe la case « ? ».',
        ],
        scoring: 'Manche réussie si vous choisissez la figure qui respecte toutes les règles.',
      },
      {
        id: 'log-sequence',
        title: 'Suites numériques',
        ui: 'numberSequence',
        blurb: 'Trouver le terme suivant d’une suite — nombres ou figures — dont la loi change à chaque essai.',
        goal:
          'Découvrir une loi de récurrence (écarts, multiplications, suites entrelacées, ou progression de figures).',
        howTo: [
          'Lisez la suite de gauche à droite : parfois des nombres, parfois des figures qui se transforment.',
          'Testez une hypothèse : écart constant, écart qui grandit, deux suites mélangées, somme des précédents, ou changement de forme / couleur.',
          'Choisissez le terme — nombre ou figure — qui prolonge correctement la suite.',
        ],
        scoring: 'Manche réussie si vous choisissez le terme exact.',
      },
      {
        id: 'log-syllogism',
        title: 'Déduction formelle',
        ui: 'syllogism',
        blurb: 'Tirer la seule conclusion forcée par des prémisses dont les mots et le schéma changent à chaque essai.',
        goal:
          'Raisonner par implication, exclusion et syllogisme, sans se laisser emporter par ce qui « a l’air vrai ».',
        howTo: [
          'Admettez les prémisses comme vraies, même si les catégories sont inventées ou inhabituelles.',
          'Demandez-vous ce qui est impossible si elles sont vraies — pas ce qui est seulement plausible.',
          'Si plusieurs conclusions restent possibles, choisissez « aucune conclusion nécessaire ».',
        ],
        scoring: 'Manche réussie si vous choisissez la conclusion (ou l’absence de conclusion) qui découle forcément des prémisses.',
      },
    ],
  },
]);

export const COGNITIVE_EXERCISES = Object.freeze(
  COGNITIVE_DOMAINS.flatMap((d) =>
    d.exercises.map((ex) => ({ ...ex, domainId: d.id, domainCode: d.code }))
  )
);

const EX_BY_ID = Object.fromEntries(COGNITIVE_EXERCISES.map((ex) => [ex.id, ex]));
const DOMAIN_BY_ID = Object.fromEntries(COGNITIVE_DOMAINS.map((d) => [d.id, d]));

export function getCognitiveExercise(id) {
  return EX_BY_ID[id] || null;
}

export function getCognitiveDomain(id) {
  return DOMAIN_BY_ID[id] || null;
}

export function exercisesForDomains(domainIds) {
  const set = new Set(domainIds);
  return COGNITIVE_EXERCISES.filter((ex) => set.has(ex.domainId));
}

/** Matin = IRP + logique ; soir = mémoire + yeux ; journée = concentration + vitesse. */
export function suggestDomainIds(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return ['irp', 'log'];
  if (h >= 18 || h < 5) return ['imt', 'vis'];
  return ['att', 'ivt'];
}

/** Suggestion courte : deux jeux par domaine suggéré. */
export function suggestExerciseIds(date = new Date()) {
  return suggestDomainIds(date).flatMap((id) =>
    (DOMAIN_BY_ID[id]?.exercises || []).slice(0, 2).map((ex) => ex.id)
  );
}

export function slotLabel(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'matin';
  if (h >= 18 || h < 5) return 'soir';
  return 'journée';
}

/** « du matin », « du soir », « de la journée ». */
export function slotPhrase(date = new Date()) {
  const slot = slotLabel(date);
  return slot === 'journée' ? 'de la journée' : `du ${slot}`;
}

export const ROUNDS_PER_GAME_OPTIONS = Object.freeze([2, 3, 5]);
export const DEFAULT_ROUNDS_PER_GAME = 3;
export const SESSION_MAX_MINUTES = 15;

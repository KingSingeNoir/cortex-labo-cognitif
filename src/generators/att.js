import { pick, randInt, shuffle } from '../rng.js';
import { LETTERS, randomWord, mapDifficulty } from '../glyphs.js';
import { generateStroop } from './ivt.js';

/* ------------------------------------------------------------------ */
/* Textes de lecture générés : modèles × tirages = variété illimitée   */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  'Anna', 'Louis', 'Inès', 'Hugo', 'Léa', 'Malik', 'Chloé', 'Samir', 'Jeanne', 'Tom',
  'Nora', 'Paul', 'Yasmine', 'Lucas', 'Camille', 'Bastien', 'Élise', 'Karim', 'Manon', 'Victor',
];
const FOLDER_COLORS = ['rouge', 'bleu', 'vert', 'jaune', 'gris', 'orange', 'violet', 'noir', 'blanc', 'rose'];
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const CITIES = ['Lyon', 'Nantes', 'Lille', 'Rennes', 'Dijon', 'Brest', 'Nice', 'Metz', 'Tours', 'Pau', 'Rouen', 'Caen'];
const DIRECTIONS = ['nord', 'sud', 'est', 'ouest'];
const DRAWERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PRODUCTS = ['pommes', 'œufs', 'citrons', 'yaourts', 'baguettes', 'tomates', 'carottes', 'oranges', 'poires', 'abricots'];
const PLACES = ['chez le dentiste', 'chez le médecin', 'à la banque', 'chez le coiffeur', 'à la mairie', 'chez le kinésithérapeute'];
const SIGNALS = ['un trait continu', 'un trait bref', 'trois éclats rapides', 'une lueur rouge'];

function takeDistinct(rng, pool, n) {
  return shuffle(rng, pool).slice(0, n);
}

/** Quatre propositions distinctes, dont la bonne. */
function optionsWith(rng, answer, pool) {
  const others = shuffle(rng, [...new Set(pool)].filter((x) => x !== answer)).slice(0, 3);
  return shuffle(rng, [answer, ...others]);
}

function hourLabel(rng) {
  const h = randInt(rng, 7, 19);
  const m = pick(rng, [0, 10, 15, 20, 30, 40, 45, 50]);
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

function distinctHours(rng, n) {
  const set = new Set();
  while (set.size < n) set.add(hourLabel(rng));
  return [...set];
}

/** « de » + élision devant voyelle ou « œ ». */
function de(word) {
  return /^[aeiouyéèêœhàâîôû]/iu.test(word) ? `d’${word}` : `de ${word}`;
}

const READING_TEMPLATES = [
  function folders(rng) {
    const name = pick(rng, FIRST_NAMES);
    const days = takeDistinct(rng, WEEKDAYS, 3).sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    const colors = takeDistinct(rng, FOLDER_COLORS, 3);
    const u = randInt(rng, 0, 2);
    const body = `${name} range les dossiers de la semaine : le ${colors[0]} le ${days[0]}, le ${colors[1]} le ${days[1]} et le ${colors[2]} le ${days[2]}. Les autres jours restent libres. Le cachet « urgent » n’apparaît que sur le dossier ${colors[u]}.`;
    if (rng() < 0.5) {
      return { body, q: 'Quel jour le dossier urgent est-il rangé ?', a: days[u], options: optionsWith(rng, days[u], WEEKDAYS) };
    }
    const k = randInt(rng, 0, 2);
    return {
      body,
      q: `De quelle couleur est le dossier rangé le ${days[k]} ?`,
      a: colors[k],
      options: optionsWith(rng, colors[k], FOLDER_COLORS),
    };
  },

  function keys(rng) {
    const [drawer, forbidden] = takeDistinct(rng, DRAWERS, 2);
    const key = randInt(rng, 1, 12);
    const [room, closed] = takeDistinct(rng, DIRECTIONS, 2);
    const body = `La consigne précise : ouvrir le tiroir ${drawer}, prendre la clé ${key} et ne surtout pas toucher au tiroir ${forbidden}. La clé ${key} ouvre le local ${room} ; le local ${closed} reste fermé.`;
    const variant = randInt(rng, 0, 2);
    if (variant === 0) {
      const nums = Array.from({ length: 12 }, (_, i) => String(i + 1));
      return { body, q: 'Quelle clé faut-il prendre ?', a: String(key), options: optionsWith(rng, String(key), nums) };
    }
    if (variant === 1) {
      return { body, q: 'Quel local la clé ouvre-t-elle ?', a: room, options: optionsWith(rng, room, DIRECTIONS) };
    }
    return { body, q: 'Quel tiroir faut-il ouvrir ?', a: drawer, options: optionsWith(rng, drawer, DRAWERS) };
  },

  function trains(rng) {
    const cities = takeDistinct(rng, CITIES, 3);
    const platforms = takeDistinct(rng, Array.from({ length: 12 }, (_, i) => String(i + 1)), 3);
    const hours = distinctHours(rng, 3);
    const late = randInt(rng, 0, 2);
    const delay = pick(rng, [5, 10, 15, 20, 25]);
    const body = `Au tableau des départs, le train pour ${cities[0]} part du quai ${platforms[0]} à ${hours[0]}, celui pour ${cities[1]} du quai ${platforms[1]} à ${hours[1]}, et celui pour ${cities[2]} du quai ${platforms[2]} à ${hours[2]}. Le train pour ${cities[late]} annonce ${delay} minutes de retard.`;
    if (rng() < 0.5) {
      const k = randInt(rng, 0, 2);
      const nums = Array.from({ length: 12 }, (_, i) => String(i + 1));
      return {
        body,
        q: `De quel quai part le train pour ${cities[k]} ?`,
        a: platforms[k],
        options: optionsWith(rng, platforms[k], nums),
      };
    }
    return {
      body,
      q: 'Quel train est en retard ?',
      a: `Celui pour ${cities[late]}`,
      options: optionsWith(
        rng,
        `Celui pour ${cities[late]}`,
        [...cities, pick(rng, CITIES.filter((c) => !cities.includes(c)))].map((c) => `Celui pour ${c}`)
      ),
    };
  },

  function shopping(rng) {
    const name = pick(rng, FIRST_NAMES);
    const products = takeDistinct(rng, PRODUCTS, 3);
    const counts = takeDistinct(rng, [2, 3, 4, 5, 6, 7, 8, 9], 3);
    const body = `Au marché, ${name} achète ${counts[0]} ${products[0]}, ${counts[1]} ${products[1]} et ${counts[2]} ${products[2]}. Avant de partir, le marchand ajoute une poignée de cerises offertes.`;
    const k = randInt(rng, 0, 2);
    const nums = ['2', '3', '4', '5', '6', '7', '8', '9'];
    return {
      body,
      q: `Combien ${de(products[k])} figurent dans les achats ?`,
      a: String(counts[k]),
      options: optionsWith(rng, String(counts[k]), nums),
    };
  },

  function appointments(rng) {
    const names = takeDistinct(rng, FIRST_NAMES, 3);
    const days = takeDistinct(rng, WEEKDAYS, 3).sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    const hours = distinctHours(rng, 3);
    const place = pick(rng, PLACES);
    const body = `Cette semaine, ${names[0]} a rendez-vous ${place} le ${days[0]} à ${hours[0]}, ${names[1]} le ${days[1]} à ${hours[1]} et ${names[2]} le ${days[2]} à ${hours[2]}.`;
    const k = randInt(rng, 0, 2);
    if (rng() < 0.5) {
      return {
        body,
        q: `Qui a rendez-vous le ${days[k]} ?`,
        a: names[k],
        options: optionsWith(rng, names[k], [...names, ...FIRST_NAMES]),
      };
    }
    return {
      body,
      q: `À quelle heure est le rendez-vous ${de(names[k])} ?`,
      a: hours[k],
      options: optionsWith(rng, hours[k], [...hours, ...distinctHours(rng, 4)]),
    };
  },

  function lighthouse(rng) {
    const flashes = randInt(rng, 2, 7);
    const signal = pick(rng, SIGNALS);
    const side = pick(rng, ['bâbord', 'tribord']);
    const third = pick(rng, ['court', 'long']);
    const body = `Le phare clignote ${flashes} fois, puis marque une pause. Le second signal est ${signal}. Le carnet de bord indique que le bateau doit virer à ${side} si le troisième signal est ${third}.`;
    if (rng() < 0.5) {
      const nums = ['1', '2', '3', '4', '5', '6', '7', '8'];
      return {
        body,
        q: 'Combien de clignotements précèdent la pause ?',
        a: String(flashes),
        options: optionsWith(rng, String(flashes), nums),
      };
    }
    return { body, q: 'Quel est le second signal ?', a: signal, options: optionsWith(rng, signal, SIGNALS) };
  },
];

export function generateReading(rng, difficulty) {
  const item = pick(rng, READING_TEMPLATES)(rng);
  let body = item.body;
  if (difficulty >= 5) {
    const extra = pick(rng, READING_TEMPLATES)(rng);
    body =
      difficulty >= 8
        ? `${item.body} Une note voisine, qui ne répond pas à la question, ajoute : ${extra.body}`
        : `${item.body} ${extra.body}`;
  }
  const distractor = pick(rng, ['visual', 'notif', difficulty >= 5 ? 'both' : 'visual']);
  return {
    ui: 'reading',
    prompt: 'Lisez, puis répondez — ignorez les distracteurs et les détails qui ne concernent pas la question.',
    timeLimitMs: mapDifficulty(difficulty, 38000, 18000),
    data: {
      body,
      q: item.q,
      options: item.options,
      distractor,
      intensity: mapDifficulty(difficulty, 1, 10),
    },
    expected: { answer: item.a },
  };
}

export function generateMot(rng, difficulty) {
  const objects = mapDifficulty(difficulty, 4, 12);
  const targets = difficulty >= 7 ? 2 : 1;
  const speed = 0.55 + difficulty * 0.14;
  const durationMs = mapDifficulty(difficulty, 5000, 11000);
  const seed = randInt(rng, 1, 1e9);
  return {
    ui: 'mot',
    prompt:
      targets === 1
        ? 'Suivez la cible mise en évidence, puis touchez-la.'
        : 'Suivez les deux cibles, puis touchez-les.',
    timeLimitMs: durationMs + 8000,
    data: { objects, targets, speed, durationMs, seed },
    expected: { targets },
  };
}

export function generateFocus(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 22);
  const stream = Array.from({ length: n }, () => randInt(rng, 1, 9));
  const interruptEvery = mapDifficulty(difficulty, 6, 2);
  return {
    ui: 'focus',
    prompt: 'Additionnez mentalement. Ignorez les fausses notifications.',
    timeLimitMs: n * 1600 + 8000,
    data: {
      stream,
      interruptEvery,
      isiMs: Math.max(700, 1400 - difficulty * 40),
    },
    expected: { sum: stream.reduce((a, b) => a + b, 0) },
  };
}

export function generateBreath(rng, difficulty) {
  const durationMs = mapDifficulty(difficulty, 30000, 60000);
  const nested = generateStroop(rng, Math.max(1, difficulty - 1));
  return {
    ui: 'breath',
    prompt: 'Ancrez-vous sur la respiration, puis enchaînez sans délai.',
    timeLimitMs: durationMs + (nested.timeLimitMs || 20000),
    data: { durationMs, nested },
    expected: nested.expected,
  };
}

export function generateDelayed(rng, difficulty) {
  const hold =
    difficulty >= 8
      ? `${randomWord(rng)}-${pick(rng, LETTERS)}${randInt(rng, 1, 9)}`
      : randomWord(rng) + '-' + pick(rng, LETTERS);
  const fillers = mapDifficulty(difficulty, 1, 4);
  const tasks = Array.from({ length: fillers }, () => ({
    a: randInt(rng, difficulty >= 6 ? 4 : 2, difficulty >= 6 ? 14 : 12),
    b: randInt(rng, 2, difficulty >= 6 ? 12 : 9),
  }));
  return {
    ui: 'delayed',
    prompt: 'Mémorisez, traitez les tâches intercalées, restituez quand on vous le demande.',
    timeLimitMs: 18000 + fillers * 8000,
    data: { hold, tasks },
    expected: { answer: hold },
  };
}

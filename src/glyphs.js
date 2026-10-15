import { pick, randInt, shuffle } from './rng.js';

export const GLYPH_SHAPES = Object.freeze([
  'circle',
  'square',
  'triangle',
  'diamond',
  'hex',
]);

export const GLYPH_COLORS = Object.freeze([
  '#1571B0',
  '#0d9488',
  '#d97706',
  '#7c3aed',
  '#e11d48',
  '#334155',
]);

export const LETTERS = 'BCDFGHJKLMNPRSTVWXZ'.split('');
export const DIGITS = '123456789'.split('');
export const COLOR_WORDS = Object.freeze([
  { word: 'BLEU', ink: '#1571B0' },
  { word: 'VERT', ink: '#0d9488' },
  { word: 'ORANGE', ink: '#d97706' },
  { word: 'VIOLET', ink: '#7c3aed' },
  { word: 'ROUGE', ink: '#e11d48' },
]);

export function randomGlyph(rng, extra = {}) {
  return {
    shape: pick(rng, GLYPH_SHAPES),
    color: pick(rng, GLYPH_COLORS),
    rotation: pick(rng, [0, 90, 180, 270]),
    count: randInt(rng, 1, 4),
    ...extra,
  };
}

export function glyphKey(g) {
  return `${g.shape}|${g.color}|${g.rotation}|${g.count}`;
}

/** Ordre de symétrie de rotation : un cercle tourné reste identique à l’œil. */
const ROTATION_PERIOD = Object.freeze({
  circle: 90,
  square: 90,
  diamond: 90,
  hex: 180,
  triangle: 360,
});

/** Clé de ce que l’on voit réellement : deux glyphes visuellement identiques ont la même clé. */
export function visualKey(g) {
  const period = ROTATION_PERIOD[g.shape] || 360;
  const rot = period >= 360 ? ((g.rotation || 0) % 360 + 360) % 360 : ((g.rotation || 0) % period + period) % period;
  const r = period === 90 ? 0 : rot;
  return `${g.shape}|${g.color}|${r}|${Math.max(1, Math.min(4, g.count || 1))}`;
}

/** Ajoute des glyphes produits par `make` jusqu’à `count` éléments visuellement distincts. */
export function uniqueGlyphs(seedList, make, count, maxTries = 200) {
  const out = [];
  const seen = new Set();
  const push = (g) => {
    const k = visualKey(g);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(g);
  };
  seedList.forEach(push);
  for (let i = 0; out.length < count && i < maxTries; i += 1) push(make());
  return out;
}

export function transformGlyph(g, kind, rng) {
  const next = { ...g };
  if (kind === 'color') next.color = pick(rng, GLYPH_COLORS.filter((c) => c !== g.color));
  if (kind === 'shape') next.shape = pick(rng, GLYPH_SHAPES.filter((s) => s !== g.shape));
  if (kind === 'size' || kind === 'count') {
    next.count = ((g.count || 1) % 4) + 1;
  }
  if (kind === 'orientation') {
    next.rotation = ((g.rotation || 0) + 90) % 360;
  }
  return next;
}

export function applyTransforms(g, kinds, rng) {
  return kinds.reduce((acc, k) => transformGlyph(acc, k, rng), { ...g });
}

/** Mots sans accent, pour une saisie simple au clavier. */
const WORD_POOL = Object.freeze(
  (
    'NORD SUD CODE RIVE LUNE PORT VENT SABLE PHARE SEUIL TRACE ANCRE ROCHE PLUME ' +
    'TOILE LAMPE FORGE GIVRE BRUME ORAGE SOURCE PIERRE CANAL PONT TOUR MUR PORTE ' +
    'CLOCHE MOULIN SENTIER FALAISE DUNE MARAIS ETANG RUISSEAU COLLINE VALLON PLAINE ' +
    'FORET CHENE SAULE TILLEUL ERABLE PIN SAPIN BOULEAU ROSEAU FOUGERE LIERRE MOUSSE ' +
    'RENARD LOUP OURS LYNX CERF BICHE LIEVRE HIBOU CORBEAU MOUETTE HERON CYGNE ' +
    'SAUMON TRUITE BALEINE PHOQUE CRABE ROBIN MERLE PINSON ABEILLE FOURMI ' +
    'MARTEAU CLOU VIS SCIE PINCE RABOT COMPAS BOUSSOLE CARTE GLOBE LOUPE ' +
    'VIOLON PIANO FLUTE HARPE TAMBOUR GUITARE ORGUE TROMPETTE ' +
    'PRUNE CERISE OLIVE CITRON ORANGE MANGUE MELON NOIX AMANDE FIGUE DATTE ' +
    'MIROIR ECHARPE MANTEAU BOTTE CHAPEAU GANT CEINTURE BOUTON RUBAN ' +
    'COMETE ORBITE PLANETE ETOILE NEBULEUSE ECLIPSE AURORE CREPUSCULE ZENITH ' +
    'CRISTAL QUARTZ AMBRE CUIVRE ETAIN ARGENT BRONZE GRANIT MARBRE ARGILE ' +
    'RADEAU VOILIER CANOT KAYAK BARQUE NAVIRE ESCALE QUAI BALISE BOUEE ' +
    'TUNNEL VIADUC JETEE DIGUE ECLUSE BARRAGE MOLE REMPART DONJON'
  ).split(' ')
);

export function randomWord(rng) {
  return pick(rng, WORD_POOL);
}

export function randomCode(rng, len = 3) {
  let s = '';
  for (let i = 0; i < len; i += 1) s += pick(rng, DIGITS);
  return s;
}

export function distractorChoices(rng, correct, pool, count = 5) {
  const others = shuffle(
    rng,
    pool.filter((x) => x !== correct)
  ).slice(0, count);
  return shuffle(rng, [correct, ...others]);
}

export function mapDifficulty(d, min, max) {
  const t = (Math.max(1, Math.min(10, d)) - 1) / 9;
  return min + Math.round(t * (max - min));
}

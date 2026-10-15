/**
 * Escalier 1–10, même esprit que la logique formelle :
 * plus on avance, plus ça charge en volume ET en subtilité.
 *
 * Volume  = longueur, nombre d’items, canaux, vitesse.
 * Subtilité = leurres, voisins visuels / phonologiques, règles combinées.
 *
 * Les tests psychotechniques (énigmes) ont leur propre progression : hors scope.
 */
import { pick, shuffle } from './rng.js';
import { mapDifficulty } from './glyphs.js';

export { mapDifficulty };

/** Lettres qui se confondent à l’œil ou à l’oreille (empan, barrage, n-back). */
export const LETTER_CLUSTERS = Object.freeze([
  ['B', 'D', 'P', 'R'],
  ['C', 'G', 'J'],
  ['M', 'N', 'W'],
  ['F', 'S', 'X', 'Z'],
  ['K', 'H'],
  ['T', 'V'],
]);

/** Familles de symboles proches — code-symbole de haut niveau. */
export const SYMBOL_CLUSTERS = Object.freeze([
  ['○', '◌', '●', '◐', '◑'],
  ['△', '▲', '▽'],
  ['□', '■', '▣', '⊞', '▤'],
  ['◇', '◆', '◈'],
  ['☆', '★', '✦', '✱'],
  ['⬡', '⬢'],
  ['✚', '⊕', '⊗'],
  ['☀', '✿', '❖'],
]);

export function clusterFor(letter) {
  return LETTER_CLUSTERS.find((c) => c.includes(letter)) || [letter];
}

export function similarLetters(rng, target, extra = 3) {
  const cluster = clusterFor(target);
  const rest = cluster.filter((l) => l !== target);
  const pool = rest.length ? rest : extraPool(target);
  return shuffle(rng, pool).slice(0, extra);
}

function extraPool(target) {
  return LETTER_CLUSTERS.flat().filter((l) => l !== target);
}

/** Alphabet restreint aux voisins — plus subtil qu’un tirage parmi 19 lettres. */
export function tightAlphabet(rng, difficulty) {
  if (difficulty < 5) {
    return LETTER_CLUSTERS.flat();
  }
  const cluster = pick(rng, LETTER_CLUSTERS);
  if (difficulty < 8) {
    const other = pick(rng, LETTER_CLUSTERS.filter((c) => c !== cluster));
    return [...cluster, ...other];
  }
  return cluster;
}

export function similarSymbols(rng, n, difficulty) {
  if (difficulty < 5) {
    return shuffle(rng, SYMBOL_CLUSTERS.flat()).slice(0, n);
  }
  const families = shuffle(rng, SYMBOL_CLUSTERS);
  const out = [];
  let i = 0;
  while (out.length < n && i < families.length * 4) {
    const fam = families[i % families.length];
    fam.forEach((s) => {
      if (out.length < n && !out.includes(s)) out.push(s);
    });
    i += 1;
  }
  return out.slice(0, n);
}

/** Leurres de veille : lettres qui ressemblent un peu à « X ». */
export const X_LURES = Object.freeze(['K', 'Y', 'Z', 'V', 'N']);

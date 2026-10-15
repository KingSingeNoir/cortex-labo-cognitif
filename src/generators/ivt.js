import { pick, randInt, shuffle } from '../rng.js';
import { COLOR_WORDS, LETTERS, mapDifficulty } from '../glyphs.js';
import { clusterFor, similarSymbols } from '../scale.js';

const SYMBOLS = [
  '△', '□', '◇', '○', '☆', '⬡', '✚', '◆', '▽', '◌', '▣', '✦',
  '▲', '■', '●', '★', '♦', '♣', '♠', '♥', '◐', '◑', '◒', '◓',
  '☀', '☂', '✿', '❖', '✱', '⊕', '⊗', '⊞', '◈', '▤', '▥', '⬢',
];

/**
 * Code-symbole (WAIS Digit Symbol).
 * Volume : clé 5 → 14, items 8 → 24.
 * Subtilité : symboles de la même famille (cercle plein / vide / coupé).
 */
export function generateCodeSymbol(rng, difficulty) {
  const keySize = mapDifficulty(difficulty, 5, 14);
  const symbols =
    difficulty >= 5
      ? similarSymbols(rng, keySize, difficulty)
      : shuffle(rng, SYMBOLS).slice(0, keySize);
  const key = symbols.map((sym, i) => ({ sym, digit: i + 1 }));
  const items = Array.from({ length: mapDifficulty(difficulty, 8, 24) }, () => pick(rng, key));
  const perItem = mapDifficulty(difficulty, 2800, 1050);
  return {
    ui: 'codeSymbol',
    prompt: `Pour chacun des ${items.length} symboles, touchez le chiffre que la clé lui associe. Allez vite, mais restez juste.`,
    timeLimitMs: items.length * perItem + 2000,
    data: { key, items },
    expected: { digits: items.map((it) => it.digit) },
  };
}

/**
 * Barrage (cancellation).
 * Volume : grille 5×4 → 12×10.
 * Subtilité : leurres de la même famille (B/P/R, M/N, V/W…).
 */
export function generateBarrage(rng, difficulty) {
  const cols = mapDifficulty(difficulty, 5, 12);
  const rows = mapDifficulty(difficulty, 4, 10);
  const target = pick(rng, LETTERS);
  const cluster = clusterFor(target);
  const foils =
    difficulty >= 5
      ? cluster.filter((l) => l !== target).concat(
          difficulty >= 8 ? [] : LETTERS.filter((l) => l !== target).slice(0, 4)
        )
      : LETTERS.filter((l) => l !== target);
  const foilPool = foils.length ? foils : LETTERS.filter((l) => l !== target);
  const targetRate = 0.11 + (difficulty >= 8 ? 0.02 : 0);
  const cells = [];
  const targets = [];
  for (let i = 0; i < rows * cols; i += 1) {
    const isT = rng() < targetRate;
    const ch = isT ? target : pick(rng, foilPool);
    cells.push(ch);
    if (ch === target) targets.push(i);
  }
  if (!targets.length) {
    cells[0] = target;
    targets.push(0);
  }
  const perCell = mapDifficulty(difficulty, 420, 160);
  return {
    ui: 'barrage',
    prompt: `Touchez toutes les cases qui contiennent la lettre « ${target} », puis touchez « J’ai terminé ».${
      difficulty >= 6
        ? ' Plusieurs lettres voisines cherchent à vous tromper : ne sélectionnez que la lettre demandée.'
        : ''
    }`,
    timeLimitMs: cells.length * perCell + 4000,
    data: { cols, rows, cells, target },
    expected: { targets },
  };
}

/**
 * Stroop.
 * Volume : 8 → 22 essais.
 * Subtilité : part d’essais incongruents 25 % → 90 %, rythme plus serré.
 */
export function generateStroop(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 22);
  const incongruentRatio = 0.22 + difficulty * 0.068;
  const trials = [];
  for (let i = 0; i < n; i += 1) {
    const word = pick(rng, COLOR_WORDS);
    const congruent = rng() > incongruentRatio;
    const ink = congruent ? word.ink : pick(rng, COLOR_WORDS.filter((c) => c.ink !== word.ink)).ink;
    trials.push({ word: word.word, ink, expectedInk: ink });
  }
  const isiMs = mapDifficulty(difficulty, 1900, 780);
  return {
    ui: 'stroop',
    prompt:
      'Ne lisez pas le mot : touchez le bouton de la couleur dans laquelle il est écrit.',
    timeLimitMs: n * isiMs + 2000,
    data: { trials, isiMs },
    expected: { inks: trials.map((t) => t.expectedInk) },
  };
}

/**
 * Identique / différent (chronométrie).
 * Volume : 8 → 20 paires, chaînes de 2 → 4 lettres.
 * Subtilité : une seule lettre change (au lieu de deux chaînes sans rapport).
 */
export function generateCompare(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 20);
  const len = mapDifficulty(difficulty, 2, 4);
  const expoMs = mapDifficulty(difficulty, 1000, 280);
  const trials = [];
  for (let i = 0; i < n; i += 1) {
    const a = Array.from({ length: len }, () => pick(rng, LETTERS)).join('');
    const same = rng() < 0.5;
    let b;
    if (same) {
      b = a;
    } else if (difficulty >= 6) {
      const idx = randInt(rng, 0, len - 1);
      const swap = pick(rng, LETTERS.filter((l) => l !== a[idx]));
      b = a.slice(0, idx) + swap + a.slice(idx + 1);
    } else {
      b = Array.from({ length: len }, () => pick(rng, LETTERS)).join('');
      if (b === a) b = a[0] + pick(rng, LETTERS.filter((l) => l !== a[0])) + a.slice(2);
    }
    trials.push({ a, b, same: a === b });
  }
  return {
    ui: 'compare',
    prompt:
      'Deux groupes de lettres s’affichent brièvement. Indiquez s’ils étaient exactement identiques.',
    timeLimitMs: n * (expoMs + 900) + 2000,
    data: { trials, expoMs },
    expected: { same: trials.map((t) => t.same) },
  };
}

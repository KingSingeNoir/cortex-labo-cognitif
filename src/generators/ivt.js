import { pick, randInt, shuffle } from '../rng.js';
import { COLOR_WORDS, LETTERS, mapDifficulty } from '../glyphs.js';

const SYMBOLS = [
  '△', '□', '◇', '○', '☆', '⬡', '✚', '◆', '▽', '◌', '▣', '✦',
  '▲', '■', '●', '★', '♦', '♣', '♠', '♥', '◐', '◑', '◒', '◓',
  '☀', '☂', '✿', '❖', '✱', '⊕', '⊗', '⊞', '◈', '▤', '▥', '⬢',
];

export function generateCodeSymbol(rng, difficulty) {
  const keySize = mapDifficulty(difficulty, 6, 12);
  const symbols = shuffle(rng, SYMBOLS).slice(0, keySize);
  const key = symbols.map((sym, i) => ({ sym, digit: i + 1 }));
  const items = Array.from({ length: 8 + difficulty }, () => pick(rng, key));
  return {
    ui: 'codeSymbol',
    prompt: `Pour chacun des ${items.length} symboles, touchez le chiffre que la clé lui associe. Allez vite, mais restez juste.`,
    timeLimitMs: mapDifficulty(difficulty, 28000, 16000),
    data: { key, items },
    expected: { digits: items.map((it) => it.digit) },
  };
}

export function generateBarrage(rng, difficulty) {
  const cols = mapDifficulty(difficulty, 6, 10);
  const rows = mapDifficulty(difficulty, 5, 8);
  const target = pick(rng, LETTERS);
  const similar = LETTERS.filter((l) => l !== target);
  const cells = [];
  const targets = [];
  for (let i = 0; i < rows * cols; i += 1) {
    const isT = rng() < 0.14;
    const ch = isT ? target : pick(rng, similar);
    cells.push(ch);
    if (ch === target) targets.push(i);
  }
  if (!targets.length) {
    cells[0] = target;
    targets.push(0);
  }
  return {
    ui: 'barrage',
    prompt: `Touchez toutes les cases qui contiennent la lettre « ${target} », puis touchez « J’ai terminé ».`,
    timeLimitMs: mapDifficulty(difficulty, 18000, 10000),
    data: { cols, rows, cells, target },
    expected: { targets },
  };
}

export function generateStroop(rng, difficulty) {
  const n = 8 + difficulty;
  const incongruentRatio = 0.3 + difficulty * 0.05;
  const trials = [];
  for (let i = 0; i < n; i += 1) {
    const word = pick(rng, COLOR_WORDS);
    const congruent = rng() > incongruentRatio;
    const ink = congruent ? word.ink : pick(rng, COLOR_WORDS.filter((c) => c.ink !== word.ink)).ink;
    trials.push({ word: word.word, ink, expectedInk: ink });
  }
  return {
    ui: 'stroop',
    prompt:
      'Ne lisez pas le mot : touchez le bouton de la couleur dans laquelle il est écrit.',
    timeLimitMs: n * Math.max(900, 1800 - difficulty * 70) + 2000,
    data: { trials, isiMs: Math.max(900, 1800 - difficulty * 70) },
    expected: { inks: trials.map((t) => t.expectedInk) },
  };
}

export function generateCompare(rng, difficulty) {
  const n = 8 + difficulty;
  const expoMs = mapDifficulty(difficulty, 900, 350);
  const trials = [];
  for (let i = 0; i < n; i += 1) {
    const a = pick(rng, LETTERS) + pick(rng, LETTERS);
    const same = rng() < 0.5;
    const b = same
      ? a
      : rng() < 0.5
        ? a[0] + pick(rng, LETTERS.filter((l) => l !== a[1]))
        : pick(rng, LETTERS) + pick(rng, LETTERS);
    trials.push({ a, b, same: a === b });
  }
  return {
    ui: 'compare',
    prompt:
      'Deux paires de lettres s’affichent brièvement. Indiquez si elles étaient exactement identiques.',
    timeLimitMs: n * (expoMs + 900) + 2000,
    data: { trials, expoMs },
    expected: { same: trials.map((t) => t.same) },
  };
}

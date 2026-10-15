import { pick, randInt } from '../rng.js';
import { DIGITS, LETTERS, randomCode, randomWord, mapDifficulty } from '../glyphs.js';
import { tightAlphabet } from '../scale.js';

function seqOf(rng, alphabet, n) {
  return Array.from({ length: n }, () => pick(rng, alphabet));
}

/**
 * N-back (Kirchner / Jaeggi).
 * Volume : N, longueur du flux, rythme.
 * Subtilité : leurres N±1, alphabet phonologique, modalité duale.
 */
export function generateNback(rng, difficulty) {
  const n = mapDifficulty(difficulty, 1, 4);
  const bag = ['visual'];
  if (difficulty >= 3) bag.push('spatial');
  if (difficulty >= 5) bag.push('audio');
  if (difficulty >= 7) bag.push('dual');
  const modality = pick(rng, bag);
  const len = 10 + n + mapDifficulty(difficulty, 3, 16);
  const alphabet =
    modality === 'spatial'
      ? ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']
      : difficulty >= 6
        ? tightAlphabet(rng, difficulty)
        : LETTERS;
  const matchRate = 0.34;
  const lureChance = difficulty >= 4 ? 0.06 + (difficulty - 4) * 0.035 : 0;
  const items = [];

  for (let i = 0; i < len; i += 1) {
    if (i < n) {
      items.push({
        vis: pick(rng, alphabet),
        pos: randInt(rng, 0, 8),
        audio: '',
      });
      items[i].audio = items[i].vis;
      continue;
    }
    const prev = items[i - n];
    const roll = rng();
    let vis;
    let pos;
    if (roll < matchRate) {
      vis = prev.vis;
      pos = modality === 'spatial' || modality === 'dual' ? prev.pos : randInt(rng, 0, 8);
    } else if (roll < matchRate + lureChance) {
      const lag = i >= n + 1 && rng() < 0.5 ? n + 1 : Math.max(1, n - 1);
      const lure = items[i - lag];
      vis = lure.vis;
      pos = modality === 'spatial' || modality === 'dual' ? lure.pos : randInt(rng, 0, 8);
      if (modality === 'spatial' && pos === prev.pos) pos = (pos + 1 + randInt(rng, 0, 7)) % 9;
      if (modality !== 'spatial' && vis === prev.vis) {
        vis = pick(rng, alphabet.filter((a) => a !== prev.vis)) || vis;
      }
      if (modality === 'dual' && vis === prev.vis && pos === prev.pos) {
        pos = (pos + 1) % 9;
      }
    } else {
      vis = pick(rng, alphabet.filter((a) => a !== prev.vis)) || pick(rng, alphabet);
      if (modality === 'spatial') {
        pos = pick(
          rng,
          [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((p) => p !== prev.pos)
        );
      } else {
        pos = randInt(rng, 0, 8);
      }
    }
    items.push({ vis, pos, audio: vis });
  }

  const matches = items.map((it, i) => {
    if (i < n) return false;
    if (modality === 'spatial') return it.pos === items[i - n].pos;
    if (modality === 'dual') {
      return it.vis === items[i - n].vis || it.pos === items[i - n].pos;
    }
    return it.vis === items[i - n].vis;
  });

  const back = n === 1 ? 'juste avant' : `${n} éléments plus tôt`;
  const lureHint =
    difficulty >= 6
      ? ' Attention : certains éléments ressemblent à une correspondance, mais sont décalés d’un cran.'
      : '';
  const prompts = {
    visual: `Touchez « Identique » quand la lettre affichée est la même que celle vue ${back}.${lureHint}`,
    audio: `Chaque lettre est accompagnée d’un son. Touchez « Identique » quand la lettre est la même que celle vue ${back}.${lureHint}`,
    spatial: `Touchez « Identique » quand la case allumée est à la même place que celle allumée ${back}.${lureHint}`,
    dual: `Touchez « Identique » quand la lettre ou la case allumée est la même que ${back}.${lureHint}`,
  };
  const isiMs = mapDifficulty(difficulty, 1800, 650);
  return {
    ui: 'nback',
    prompt: prompts[modality],
    timeLimitMs: len * isiMs + 2000,
    data: { n, modality, items, matches, isiMs },
    expected: { matches },
  };
}

/**
 * Empan inversé (WAIS Digit Span Backward).
 * Volume : longueur 3 → 10.
 * Subtilité : lettres voisines, mélange chiffres/lettres, interférence pair/impair.
 */
export function generateSpan(rng, difficulty) {
  const length = mapDifficulty(difficulty, 3, 10);
  let material;
  if (difficulty <= 3) material = 'digits';
  else if (difficulty <= 6) material = pick(rng, ['digits', 'letters']);
  else material = pick(rng, ['letters', 'mixed', 'positions']);

  let alphabet;
  if (material === 'digits') alphabet = DIGITS;
  else if (material === 'letters') alphabet = difficulty >= 6 ? tightAlphabet(rng, difficulty) : LETTERS;
  else alphabet = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const sequence =
    material === 'mixed'
      ? Array.from({ length }, () =>
          rng() < 0.5 ? pick(rng, DIGITS) : pick(rng, difficulty >= 7 ? tightAlphabet(rng, difficulty) : LETTERS)
        )
      : seqOf(rng, alphabet, length);

  const interference = difficulty >= 5 && sequence.some((x) => Number.isFinite(Number(x))) && rng() < 0.45 + difficulty * 0.05;
  const showMs = mapDifficulty(difficulty, 1200, 450);
  return {
    ui: 'span',
    prompt: interference
      ? `Retenez les ${length} éléments qui vont s’afficher. Pour chaque chiffre, indiquez au passage s’il est pair ou impair. À la fin, tapez la séquence à l’envers, en commençant par le dernier élément.`
      : `Retenez les ${length} éléments qui vont s’afficher, puis tapez-les à l’envers, en commençant par le dernier.`,
    timeLimitMs: 8000 + length * (showMs + 900) + (interference ? length * 400 : 0),
    data: {
      sequence,
      reverse: true,
      material,
      interference,
      showMs,
    },
    expected: { answer: sequence.slice().reverse().join('') },
  };
}

/**
 * Running memory (Broadway & Engle).
 * Volume : fenêtre 2 → 7, flux plus long.
 * Subtilité : alphabet serré, rythme plus vif, arrêt imprévisible.
 */
export function generateRunning(rng, difficulty) {
  const window = mapDifficulty(difficulty, 2, 7);
  const streamLen = window + mapDifficulty(difficulty, 5, 18);
  const alphabet = difficulty >= 6 ? tightAlphabet(rng, difficulty) : LETTERS;
  const stream = seqOf(rng, alphabet, streamLen);
  const isiMs = mapDifficulty(difficulty, 1300, 480);
  return {
    ui: 'running',
    prompt: `Des lettres vont défiler. Gardez toujours en tête les ${window} dernières : le flux s’arrêtera sans prévenir et vous devrez les taper dans leur ordre d’apparition.`,
    timeLimitMs: streamLen * isiMs + 12000,
    data: { window, stream, isiMs, probeAt: streamLen - 1 },
    expected: { answer: stream.slice(-window).join('') },
  };
}

/**
 * Double tâche (Baddeley : boucle phonologique + interférence).
 * Volume : tenue plus longue, plus de jugements pair/impair.
 * Subtilité : code plus long, mot + lettre, encodage plus bref.
 */
export function generateDual(rng, difficulty) {
  const holdKind =
    difficulty >= 8 ? pick(rng, ['compound', 'code']) : pick(rng, ['word', 'code', 'pos']);
  const hold =
    holdKind === 'word'
      ? randomWord(rng)
      : holdKind === 'code'
        ? randomCode(rng, mapDifficulty(difficulty, 3, 5))
        : holdKind === 'compound'
          ? `${randomWord(rng)}-${pick(rng, LETTERS)}${pick(rng, DIGITS)}`
          : String(randInt(rng, 0, 8));
  const secondaryCount = mapDifficulty(difficulty, 4, 14);
  const secondary = Array.from({ length: secondaryCount }, () =>
    difficulty >= 7 ? randInt(rng, 100, 999) : randInt(rng, 10, 99)
  );
  const encodeMs = mapDifficulty(difficulty, 2800, 1100);
  const durationMs = secondaryCount * 1600;
  const label =
    holdKind === 'word'
      ? 'le mot'
      : holdKind === 'code'
        ? 'le code'
        : holdKind === 'compound'
          ? 'le mot, le tiret et les signes qui suivent'
          : 'le chiffre';
  return {
    ui: 'dual',
    prompt: `Mémorisez ${label} qui va s’afficher. Indiquez ensuite si chaque nombre est pair ou impair, puis tapez ce que vous avez retenu.`,
    timeLimitMs: encodeMs + durationMs + 14000,
    data: { hold, holdKind, secondary, durationMs, encodeMs },
    expected: { answer: String(hold) },
  };
}

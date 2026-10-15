import { pick, randInt } from '../rng.js';
import {
  DIGITS,
  LETTERS,
  randomCode,
  randomWord,
  mapDifficulty,
} from '../glyphs.js';

function seqOf(rng, alphabet, n) {
  return Array.from({ length: n }, () => pick(rng, alphabet));
}

export function generateNback(rng, difficulty) {
  const n = mapDifficulty(difficulty, 1, 4);
  const modality = pick(rng, ['visual', 'spatial', 'audio', difficulty >= 7 ? 'dual' : 'visual']);
  const len = 8 + n + mapDifficulty(difficulty, 4, 10);
  const alphabet =
    modality === 'spatial' ? ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'] : LETTERS;
  const items = [];
  const matchRate = 0.32;
  for (let i = 0; i < len; i += 1) {
    const forceMatch = i >= n && rng() < matchRate;
    const vis = forceMatch ? items[i - n].vis : pick(rng, alphabet);
    const pos = forceMatch && modality === 'dual' ? items[i - n].pos : randInt(rng, 0, 8);
    const audio = vis;
    items.push({ vis, pos, audio });
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
  const prompts = {
    visual: `Touchez « Identique » quand la lettre affichée est la même que celle vue ${back}.`,
    audio: `Chaque lettre est accompagnée d’un son. Touchez « Identique » quand la lettre est la même que celle vue ${back}.`,
    spatial: `Touchez « Identique » quand la case allumée est à la même place que celle allumée ${back}.`,
    dual: `Touchez « Identique » quand la lettre ou la case allumée est la même que ${back}.`,
  };
  return {
    ui: 'nback',
    prompt: prompts[modality],
    timeLimitMs: len * Math.max(700, 1700 - difficulty * 70) + 2000,
    data: {
      n,
      modality,
      items,
      matches,
      isiMs: Math.max(700, 1700 - difficulty * 70),
    },
    expected: { matches },
  };
}

export function generateSpan(rng, difficulty) {
  const length = mapDifficulty(difficulty, 3, 9);
  const material = pick(rng, ['digits', 'letters', 'positions']);
  const alphabet =
    material === 'digits' ? DIGITS : material === 'letters' ? LETTERS : ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const sequence = seqOf(rng, alphabet, length);
  const interference = difficulty >= 6 && rng() < 0.7;
  return {
    ui: 'span',
    prompt: interference
      ? `Retenez les ${length} éléments qui vont s’afficher. Pour chaque chiffre, indiquez au passage s’il est pair ou impair. À la fin, tapez la séquence à l’envers, en commençant par le dernier élément.`
      : `Retenez les ${length} éléments qui vont s’afficher, puis tapez-les à l’envers, en commençant par le dernier.`,
    timeLimitMs: 8000 + length * 1800,
    data: {
      sequence,
      reverse: true,
      material,
      interference,
      showMs: Math.max(500, 1100 - difficulty * 40),
    },
    expected: { answer: sequence.slice().reverse().join('') },
  };
}

export function generateRunning(rng, difficulty) {
  const window = mapDifficulty(difficulty, 3, 6);
  const streamLen = window + mapDifficulty(difficulty, 6, 14);
  const stream = seqOf(rng, LETTERS, streamLen);
  return {
    ui: 'running',
    prompt: `Des lettres vont défiler. Gardez toujours en tête les ${window} dernières : le flux s’arrêtera sans prévenir et vous devrez les taper dans leur ordre d’apparition.`,
    timeLimitMs: streamLen * Math.max(500, 1200 - difficulty * 50) + 12000,
    data: {
      window,
      stream,
      isiMs: Math.max(500, 1200 - difficulty * 50),
      probeAt: streamLen - 1,
    },
    expected: { answer: stream.slice(-window).join('') },
  };
}

export function generateDual(rng, difficulty) {
  const holdKind = pick(rng, ['word', 'code', 'pos']);
  const hold =
    holdKind === 'word'
      ? randomWord(rng)
      : holdKind === 'code'
        ? randomCode(rng, 3)
        : String(randInt(rng, 0, 8));
  const durationMs = mapDifficulty(difficulty, 5000, 22000);
  const secondaryCount = Math.max(4, Math.round(durationMs / 1800));
  const secondary = Array.from({ length: secondaryCount }, () => randInt(rng, 10, 99));
  return {
    ui: 'dual',
    prompt: `Mémorisez ${
      holdKind === 'word' ? 'le mot' : holdKind === 'code' ? 'le code' : 'le chiffre'
    } qui va s’afficher. Indiquez ensuite si chaque nombre est pair ou impair, puis tapez ce que vous avez retenu.`,
    timeLimitMs: durationMs + 16000,
    data: { hold, holdKind, secondary, durationMs },
    expected: { answer: String(hold) },
  };
}

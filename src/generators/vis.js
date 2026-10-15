import { pick, randInt } from '../rng.js';
import { LETTERS, mapDifficulty } from '../glyphs.js';
import { similarLetters, tightAlphabet } from '../scale.js';

/**
 * Accommodation 20-20-20.
 * Le temps au loin reste une hygiène (environ 20 s), pas une punition.
 * Volume / subtilité : 1 → 3 lettres à retenir, voisines, encodage plus bref.
 */
export function generateAccom(rng, difficulty) {
  const n = mapDifficulty(difficulty, 1, 3);
  const alphabet = difficulty >= 5 ? tightAlphabet(rng, difficulty) : LETTERS;
  const letter = Array.from({ length: n }, () => pick(rng, alphabet)).join('');
  const decoys = new Set([letter]);
  let guard = 0;
  while (decoys.size < 4 && guard < 40) {
    guard += 1;
    if (n === 1) {
      const near = similarLetters(rng, letter, 3);
      decoys.add(pick(rng, near.length ? near : LETTERS.filter((l) => l !== letter)));
    } else {
      const chars = letter.split('');
      const i = randInt(rng, 0, n - 1);
      const swap = pick(rng, similarLetters(rng, chars[i], 3).concat(alphabet));
      const next = chars.map((c, k) => (k === i ? swap : c)).join('');
      if (next !== letter) decoys.add(next);
    }
  }
  const options = [...decoys];
  while (options.length < 4) options.push(pick(rng, LETTERS));
  const farMs = 20000;
  const nearMs = mapDifficulty(difficulty, 2800, 1300);
  return {
    ui: 'visAccom',
    prompt:
      n === 1
        ? 'Fixez la lettre à l’écran, puis regardez un point éloigné de la pièce pendant le compte à rebours. Revenez ensuite à l’écran pour retrouver la lettre.'
        : `Fixez les ${n} lettres à l’écran, puis regardez un point éloigné de la pièce. Revenez ensuite pour les retrouver, dans le même ordre.`,
    timeLimitMs: farMs + nearMs + 14000,
    data: { letter, options: options.slice(0, 4), farMs, nearMs },
    expected: { letter },
  };
}

/**
 * Poursuite oculaire.
 * Volume : durée, nombre de sondes.
 * Subtilité : fenêtre plus courte, trajectoire plus vive.
 */
export function generatePursuit(rng, difficulty) {
  const durationMs = mapDifficulty(difficulty, 12000, 26000);
  const nProbes = mapDifficulty(difficulty, 3, 8);
  const windowMs = mapDifficulty(difficulty, 1000, 400);
  const probes = [];
  for (let i = 0; i < nProbes; i += 1) {
    probes.push({
      atMs: 1800 + i * Math.floor((durationMs - 3600) / nProbes),
      windowMs,
    });
  }
  return {
    ui: 'visPursuit',
    prompt:
      'Suivez le point des yeux, sans bouger la tête. Touchez la zone dès qu’il devient orange.',
    timeLimitMs: durationMs + 4000,
    data: {
      durationMs,
      probes,
      speed: 0.55 + difficulty * 0.11,
      path: {
        fx: 0.7 + rng() * 0.9 + (difficulty >= 7 ? 0.4 : 0),
        fy: 1.1 + rng() * 1.5 + (difficulty >= 7 ? 0.3 : 0),
        px: rng() * Math.PI * 2,
        py: rng() * Math.PI * 2,
      },
      seed: randInt(rng, 1, 1e9),
    },
    expected: { probes: nProbes },
  };
}

/**
 * Saccades.
 * Volume : 8 → 18 sauts.
 * Subtilité : 4 coins puis 8 positions (bords), rythme plus vif, lettres voisines.
 */
export function generateSaccade(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 18);
  const posMax = difficulty >= 6 ? 7 : 3;
  const alphabet = difficulty >= 6 ? tightAlphabet(rng, difficulty) : LETTERS;
  const trials = Array.from({ length: n }, () => ({
    pos: randInt(rng, 0, posMax),
    letter: pick(rng, alphabet),
  }));
  const isiMs = mapDifficulty(difficulty, 1500, 520);
  return {
    ui: 'visSaccade',
    prompt:
      difficulty >= 6
        ? 'Une lettre apparaît dans un coin ou sur un bord du cadre : portez directement le regard sur elle, puis touchez-la avant qu’elle ne disparaisse.'
        : 'Une lettre apparaît dans un coin du cadre : portez directement le regard sur elle, puis touchez-la avant qu’elle ne disparaisse.',
    timeLimitMs: n * isiMs + 3000,
    data: { trials, isiMs },
    expected: { letters: trials.map((t) => t.letter) },
  };
}

/**
 * Clignement + palming.
 * Le repos sous les paumes reste une hygiène (~12–16 s).
 * Volume : plus de clignements, plus de lettres à refocaliser.
 */
export function generateBlink(rng, difficulty) {
  const blinks = mapDifficulty(difficulty, 5, 12);
  const palmMs = 14000;
  const nLetters = mapDifficulty(difficulty, 2, 5);
  const alphabet = difficulty >= 6 ? tightAlphabet(rng, difficulty) : LETTERS;
  const letter = Array.from({ length: nLetters }, () => pick(rng, alphabet)).join('');
  return {
    ui: 'visBlink',
    prompt: `Clignez lentement ${blinks} fois, reposez vos yeux sous vos paumes, puis refaites la mise au point sur les lettres.`,
    timeLimitMs: blinks * 1600 + palmMs + 14000,
    data: { blinks, palmMs, letter },
    expected: { letter },
  };
}

import { pick, randInt } from '../rng.js';
import { LETTERS, mapDifficulty } from '../glyphs.js';

/** Accommodation près / loin — hygiène 20-20-20 (pas un traitement médical). */
export function generateAccom(rng, difficulty) {
  const letter = pick(rng, LETTERS);
  const decoy = LETTERS.filter((l) => l !== letter);
  const options = [letter, pick(rng, decoy), pick(rng, decoy), pick(rng, decoy)];
  const uniq = [...new Set(options)];
  while (uniq.length < 4) uniq.push(pick(rng, LETTERS));
  const farMs = mapDifficulty(difficulty, 20000, 28000);
  return {
    ui: 'visAccom',
    prompt:
      'Fixez la lettre à l’écran, puis regardez un point éloigné de la pièce pendant le compte à rebours. Revenez ensuite à l’écran pour retrouver la lettre.',
    timeLimitMs: farMs + 18000,
    data: {
      letter,
      options: uniq.slice(0, 4),
      farMs,
      nearMs: 2500,
    },
    expected: { letter },
  };
}

/** Poursuite oculaire douce — muscler le suivi du regard (fatigue de fixation). */
export function generatePursuit(rng, difficulty) {
  const durationMs = mapDifficulty(difficulty, 14000, 22000);
  const nProbes = mapDifficulty(difficulty, 3, 6);
  const probes = [];
  for (let i = 0; i < nProbes; i += 1) {
    probes.push({
      atMs: 2200 + i * Math.floor((durationMs - 4000) / nProbes),
      windowMs: mapDifficulty(difficulty, 900, 550),
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
      speed: 0.7 + difficulty * 0.08,
      path: {
        fx: 0.7 + rng() * 0.7,
        fy: 1.2 + rng() * 1.3,
        px: rng() * Math.PI * 2,
        py: rng() * Math.PI * 2,
      },
      seed: randInt(rng, 1, 1e9),
    },
    expected: { probes: nProbes },
  };
}

/** Saccades — sauts de regard (coin à coin), utile contre la rigidité du regard écran. */
export function generateSaccade(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 14);
  const trials = Array.from({ length: n }, () => ({
    pos: randInt(rng, 0, 3),
    letter: pick(rng, LETTERS),
  }));
  return {
    ui: 'visSaccade',
    prompt:
      'Une lettre apparaît dans un coin du cadre : portez directement le regard sur elle, puis touchez-la avant qu’elle ne disparaisse.',
    timeLimitMs: n * Math.max(700, 1400 - difficulty * 50) + 3000,
    data: {
      trials,
      isiMs: Math.max(700, 1400 - difficulty * 50),
    },
    expected: { letters: trials.map((t) => t.letter) },
  };
}

/** Clignement + palming + convergence — sécheresse et vision de près prolongée. */
export function generateBlink(rng, difficulty) {
  const blinks = mapDifficulty(difficulty, 6, 10) + randInt(rng, -1, 2);
  const palmMs = mapDifficulty(difficulty, 12000, 18000) + randInt(rng, -2, 3) * 1000;
  const letter = Array.from({ length: randInt(rng, 2, 4) }, () => pick(rng, LETTERS)).join('');
  return {
    ui: 'visBlink',
    prompt: `Clignez lentement ${blinks} fois, reposez vos yeux sous vos paumes, puis refaites la mise au point sur quelques lettres.`,
    timeLimitMs: blinks * 1600 + palmMs + 14000,
    data: { blinks, palmMs, letter },
    expected: { letter },
  };
}

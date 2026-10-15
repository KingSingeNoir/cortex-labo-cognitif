import { generateReading, generateDelayed } from './att.js';
import { generateWatch, generateSwitch, generatePriority } from './basc.js';
import { COLOR_WORDS, mapDifficulty } from '../glyphs.js';
import { pick } from '../rng.js';

/**
 * Focus + bascule + fausses notifications.
 * Volume : 8 → 22 essais.
 * Subtilité : plus de changements de règle, plus d’incongruents, plus d’interruptions.
 */
export function generateFocusSwitch(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 22);
  let rule = pick(rng, ['ink', 'word']);
  const switchP = 0.14 + difficulty * 0.04;
  const incongruentRatio = 0.28 + difficulty * 0.055;
  const trials = [];
  for (let i = 0; i < n; i += 1) {
    if (i > 0 && rng() < switchP) rule = rule === 'ink' ? 'word' : 'ink';
    const word = pick(rng, COLOR_WORDS);
    const congruent = rng() > incongruentRatio;
    const ink = congruent
      ? word.ink
      : pick(rng, COLOR_WORDS.filter((c) => c.ink !== word.ink)).ink;
    trials.push({
      word: word.word,
      ink,
      rule,
      expected: rule === 'ink' ? ink : word.ink,
    });
  }
  const isi = mapDifficulty(difficulty, 1800, 850);
  return {
    ui: 'focusSwitch',
    prompt:
      'Répondez selon la règle affichée au-dessus du mot : la couleur de l’encre ou le mot écrit. La règle peut changer à tout moment. Ne touchez jamais les notifications.',
    timeLimitMs: n * isi + 4000,
    data: {
      trials,
      interruptEvery: mapDifficulty(difficulty, 6, 2),
    },
    expected: { inks: trials.map((t) => t.expected) },
  };
}

/** Lecture ciblée + surveillance d’un canal latéral. */
export function generateReadingWatch(rng, difficulty) {
  const reading = generateReading(rng, difficulty);
  const watch = generateWatch(rng, Math.max(1, difficulty - 1));
  return {
    ui: 'readingWatch',
    prompt:
      'Lisez le texte et répondez à la question. Pendant votre lecture, touchez la case où un « X » apparaît : faites-le avant de répondre.',
    timeLimitMs: (reading.timeLimitMs || 30000) + 4000,
    data: {
      ...reading.data,
      watch: watch.data,
    },
    expected: {
      answer: reading.expected.answer,
      channel: watch.expected.channel,
      step: watch.expected.step,
    },
  };
}

/** Multi-canal puis priorisation dynamique. */
export function generateWatchPriority(rng, difficulty) {
  const watch = generateWatch(rng, difficulty);
  const priority = generatePriority(rng, difficulty);
  return {
    ui: 'watchPriority',
    prompt:
      'D’abord, touchez la case où un « X » apparaît. Ensuite, touchez la tâche dont la jauge d’urgence est la plus haute.',
    timeLimitMs: (watch.timeLimitMs || 16000) + 12000,
    data: { watch: watch.data, priority: priority.data },
    expected: {
      channel: watch.expected.channel,
      step: watch.expected.step,
    },
  };
}

/**
 * Rappel différé pendant une bascule.
 * Volume : plus de tris intercalés, tenue plus longue.
 * Subtilité : encodage plus bref, bascules plus fréquentes.
 */
export function generateDelayedSwitch(rng, difficulty) {
  const delayed = generateDelayed(rng, difficulty);
  const sw = generateSwitch(rng, Math.max(2, difficulty));
  const fillers = (sw.data.trials || []).slice(0, mapDifficulty(difficulty, 4, 12));
  const encodeMs = mapDifficulty(difficulty, 2600, 1100);
  return {
    ui: 'delayedSwitch',
    prompt:
      'Mémorisez le mot qui va s’afficher. Triez ensuite les formes selon la règle indiquée, puis tapez le mot retenu.',
    timeLimitMs: encodeMs + 12000 + fillers.length * 1600,
    data: { hold: delayed.data.hold, fillers, encodeMs },
    expected: { answer: delayed.expected.answer },
  };
}

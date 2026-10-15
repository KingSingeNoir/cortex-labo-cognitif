import { createRng } from './rng.js';
import { clampDifficulty } from './staircase.js';
import { getCognitiveExercise } from './catalog.js';
import {
  generateNback,
  generateSpan,
  generateRunning,
  generateDual,
} from './generators/imt.js';
import {
  generateMatrix,
  generateRotation,
  generateAnalogy,
  generateSeries,
} from './generators/irp.js';
import {
  generateCodeSymbol,
  generateBarrage,
  generateStroop,
  generateCompare,
} from './generators/ivt.js';
import {
  generateFocusSwitch,
  generateReadingWatch,
  generateWatchPriority,
  generateDelayedSwitch,
} from './generators/attMix.js';
import {
  generateAccom,
  generatePursuit,
  generateSaccade,
  generateBlink,
} from './generators/vis.js';
import {
  generateCortexMatrix,
  generateCortexSequence,
  generateCortexSyllogism,
} from './generators/cortex.js';

const GENERATORS = {
  'imt-nback': generateNback,
  'imt-span': generateSpan,
  'imt-running': generateRunning,
  'imt-dual': generateDual,
  'irp-matrix': generateMatrix,
  'irp-rotation': generateRotation,
  'irp-analogy': generateAnalogy,
  'irp-series': generateSeries,
  'ivt-code': generateCodeSymbol,
  'ivt-barrage': generateBarrage,
  'ivt-stroop': generateStroop,
  'ivt-compare': generateCompare,
  'att-mix-focus': generateFocusSwitch,
  'att-mix-reading': generateReadingWatch,
  'att-mix-watch': generateWatchPriority,
  'att-mix-recall': generateDelayedSwitch,
  'vis-accom': generateAccom,
  'vis-pursuit': generatePursuit,
  'vis-saccade': generateSaccade,
  'vis-blink': generateBlink,
  'log-matrix': generateCortexMatrix,
  'log-sequence': generateCortexSequence,
  'log-syllogism': generateCortexSyllogism,
};

export function generateExercise(exerciseId, { difficulty = 3, seed } = {}) {
  const meta = getCognitiveExercise(exerciseId);
  const fn = GENERATORS[exerciseId];
  if (!meta || !fn) {
    throw new Error(`Générateur inconnu: ${exerciseId}`);
  }
  const d = clampDifficulty(difficulty);
  const rng = createRng(seed);
  const trial = fn(rng, d);
  return {
    type: exerciseId,
    domainId: meta.domainId,
    title: meta.title,
    seed,
    difficulty: d,
    ...trial,
  };
}

export { GENERATORS };

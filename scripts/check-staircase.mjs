/**
 * Tests du moteur cognitif (staircase 2-up/1-down + 23 générateurs).
 * Usage : npm run check
 */
import { applyStaircase, clampDifficulty, xpForTrial } from '../src/staircase.js';
import { COGNITIVE_EXERCISES } from '../src/catalog.js';
import { generateExercise } from '../src/generate.js';

const fails = [];
const proofs = [];

function assert(cond, msg) {
  if (cond) proofs.push(msg);
  else fails.push(msg);
}

let s = { difficulty: 3, streakUp: 0 };
s = applyStaircase(s, true);
assert(s.difficulty === 3 && s.streakUp === 1, '1 succès : palier inchangé, streak 1');
s = applyStaircase(s, true);
assert(s.difficulty === 4 && s.streakUp === 0, '2 succès : difficulté +1, streak reset');
s = applyStaircase(s, false);
assert(s.difficulty === 3 && s.streakUp === 0, '1 échec : difficulté -1');

let hi = { difficulty: 10, streakUp: 1 };
hi = applyStaircase(hi, true);
assert(hi.difficulty === 10, 'plafond 10');
let lo = { difficulty: 1, streakUp: 0 };
lo = applyStaircase(lo, false);
assert(lo.difficulty === 1, 'plancher 1');

assert(clampDifficulty(0) === 1, 'clamp bas');
assert(clampDifficulty(99) === 10, 'clamp haut');
assert(xpForTrial(false, 8) === 0, 'échec : pas de XP (non punitif, pas de loot)');
assert(xpForTrial(true, 3) === 14, 'succès : XP liée à la difficulté');

assert(COGNITIVE_EXERCISES.length === 23, '23 sous-points');

for (const ex of COGNITIVE_EXERCISES) {
  assert(
    typeof ex.goal === 'string' && ex.goal.length > 20,
    `${ex.id} fiche : objectif`
  );
  assert(
    Array.isArray(ex.howTo) && ex.howTo.length >= 2,
    `${ex.id} fiche : étapes « comment jouer »`
  );
  assert(
    typeof ex.scoring === 'string' && ex.scoring.length > 10,
    `${ex.id} fiche : critère de réussite`
  );
  const trial = generateExercise(ex.id, { difficulty: 5, seed: 42 });
  assert(
    typeof trial.prompt === 'string' && trial.prompt.length > 20,
    `${ex.id} consigne`
  );
  assert(trial.type === ex.id, `${ex.id} type`);
  assert(trial.ui === ex.ui, `${ex.id} ui=${trial.ui}`);
  assert(trial.data && typeof trial.data === 'object', `${ex.id} data`);
  assert(trial.expected && typeof trial.expected === 'object', `${ex.id} expected`);
  const replay = generateExercise(ex.id, { difficulty: 5, seed: 42 });
  assert(
    JSON.stringify(replay.data) === JSON.stringify(trial.data),
    `${ex.id} seed rejouable`
  );
}

/* Variété et validité : 500 essais par jeu, graines et niveaux variés. */
const { visualKey } = await import('../src/glyphs.js');
const { cellKey } = await import('../src/generators/cortex.js');
const voxelKey = (vs) =>
  vs.map((v) => `${v.x}${v.y}${v.z}${v.color}`).sort().join('|');
const SAMPLES = 500;
const variety = [];
for (const ex of COGNITIVE_EXERCISES) {
  const sigs = new Set();
  let invalid = 0;
  for (let i = 0; i < SAMPLES; i += 1) {
    const difficulty = 1 + (i % 10);
    const t = generateExercise(ex.id, { difficulty, seed: 1000 + i * 7919 });
    sigs.add(JSON.stringify(t.data));
    const opts = t.data.options;
    if (['matrix', 'analogy', 'series'].includes(t.ui)) {
      const keys = opts.map(visualKey);
      const correct = keys.filter((k) => k === t.expected.key).length;
      if (correct !== 1 || new Set(keys).size !== keys.length || opts.length < 4) invalid += 1;
    }
    if (t.ui === 'rotation') {
      const keys = opts.map((o) => voxelKey(o.voxels));
      if (opts.filter((o) => o.id === 'ok').length !== 1 || new Set(keys).size !== keys.length) invalid += 1;
    }
    if (t.ui === 'readingWatch') {
      if (!opts.includes(t.expected.answer) || new Set(opts).size !== 4) invalid += 1;
    }
    if (t.ui === 'svgMatrix') {
      const keys = opts.map(cellKey);
      const correct = keys.filter((k) => k === t.expected.key).length;
      if (correct !== 1 || new Set(keys).size !== keys.length || opts.length < 4) invalid += 1;
    }
    if (t.ui === 'numberSequence') {
      if (t.data.mode === 'figures') {
        const keys = (t.data.options || []).map(cellKey);
        const correct = keys.filter((k) => k === t.expected.key || k === t.expected.answer).length;
        if (correct !== 1 || new Set(keys).size !== keys.length || keys.length < 4) invalid += 1;
      } else if (!opts.includes(t.expected.answer) || new Set(opts).size !== 4) {
        invalid += 1;
      }
    }
    if (t.ui === 'syllogism') {
      if (!opts.includes(t.expected.answer) || new Set(opts).size !== 4) invalid += 1;
    }
  }
  const ratio = sigs.size / SAMPLES;
  variety.push(`${ex.id} : ${sigs.size}/${SAMPLES} essais distincts`);
  assert(invalid === 0, `${ex.id} : ${invalid} essai(s) invalide(s) sur ${SAMPLES}`);
  assert(ratio >= 0.9, `${ex.id} : variété ${Math.round(ratio * 100)} % (≥ 90 % attendu)`);
}
console.log('VARIÉTÉ');
variety.forEach((v) => console.log(' -', v));

if (fails.length) {
  console.error('COGNITIVE FAIL');
  fails.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log(`COGNITIVE OK (${proofs.length} preuves)`);
proofs.forEach((p) => console.log(' -', p));

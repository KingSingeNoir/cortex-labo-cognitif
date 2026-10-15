import { pick, randInt, shuffle } from '../rng.js';
import {
  GLYPH_COLORS,
  GLYPH_SHAPES,
  randomGlyph,
  transformGlyph,
  mapDifficulty,
  uniqueGlyphs,
  visualKey,
} from '../glyphs.js';

/* ------------------------------------------------------------------ */
/* Règles de progression combinables                                   */
/* ------------------------------------------------------------------ */

/**
 * Une règle transforme le glyphe de départ selon un rang `k` (0, 1, 2…).
 * Les pas et l’ordre des cycles sont tirés au hasard : chaque essai est neuf.
 */
function makeRule(rng, kind) {
  if (kind === 'rotate') {
    const step = pick(rng, [90, 270, 180]);
    return { kind, apply: (g, k) => ({ ...g, shape: 'triangle', rotation: (g.rotation + step * k) % 360 }) };
  }
  if (kind === 'color') {
    const order = shuffle(rng, GLYPH_COLORS);
    const step = pick(rng, [1, 1, 2]);
    return {
      kind,
      apply: (g, k) => ({ ...g, color: order[(order.indexOf(g.color) + step * k) % order.length] }),
    };
  }
  if (kind === 'shape') {
    const order = shuffle(rng, GLYPH_SHAPES.filter((s) => s !== 'triangle'));
    return { kind, apply: (g, k) => ({ ...g, shape: order[k % order.length] }) };
  }
  if (kind === 'count') {
    /* Progression sans retour à 1 : l’appelant garantit au plus 4 rangs. */
    const up = rng() < 0.5;
    return { kind, apply: (g, k) => ({ ...g, count: up ? 1 + k : 4 - k }) };
  }
  if (kind === 'countAlt') {
    const a = randInt(rng, 1, 4);
    const b = pick(rng, [1, 2, 3, 4].filter((n) => n !== a));
    return { kind, apply: (g, k) => ({ ...g, count: k % 2 === 0 ? a : b }) };
  }
  return { kind: 'none', apply: (g) => g };
}

function pickRules(rng, n, pool, maxRank) {
  let kinds = shuffle(rng, pool).slice(0, n);
  if (maxRank > 3) kinds = kinds.map((k) => (k === 'count' ? 'countAlt' : k));
  if (kinds.includes('rotate') && kinds.includes('shape')) {
    kinds = kinds.filter((k) => k !== 'shape');
  }
  if (kinds.includes('count') && kinds.includes('countAlt')) {
    kinds = kinds.filter((k) => k !== 'countAlt');
  }
  return kinds.map((k) => makeRule(rng, k));
}

function applyRules(rules, base, k) {
  return rules.reduce((g, r) => r.apply(g, k), { ...base });
}

/** Distracteurs crédibles : la bonne réponse avec une seule propriété faussée. */
function nearMisses(rng, correct) {
  const misses = [];
  misses.push({ ...correct, color: pick(rng, GLYPH_COLORS.filter((c) => c !== correct.color)) });
  misses.push({ ...correct, count: pick(rng, [1, 2, 3, 4].filter((n) => n !== correct.count)) });
  if (correct.shape === 'triangle') {
    misses.push({ ...correct, rotation: (correct.rotation + pick(rng, [90, 180, 270])) % 360 });
  } else {
    misses.push({ ...correct, shape: pick(rng, GLYPH_SHAPES.filter((s) => s !== correct.shape)) });
  }
  return shuffle(rng, misses);
}

function buildOptions(rng, correct, extra, total) {
  const list = uniqueGlyphs([correct, ...extra], () => randomGlyph(rng), total);
  return shuffle(rng, list);
}

/* ------------------------------------------------------------------ */
/* Matrices progressives                                               */
/* ------------------------------------------------------------------ */

export function generateMatrix(rng, difficulty) {
  const size = difficulty >= 6 ? 3 : 2;
  const ruleCount = mapDifficulty(difficulty, 1, 3);
  const axis = pick(rng, ['row', 'col', 'diag']);
  const maxRank = axis === 'diag' ? 2 * (size - 1) : size - 1;
  const rules = pickRules(rng, ruleCount, ['rotate', 'color', 'shape', 'count'], maxRank);
  const base = randomGlyph(rng, { count: 1, rotation: 0 });
  if (rules.some((r) => r.kind === 'rotate')) base.shape = 'triangle';
  const rank = (r, c) => (axis === 'row' ? c : axis === 'col' ? r : r + c);

  const cells = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) cells.push(applyRules(rules, base, rank(r, c)));
  }
  const missingIndex = size * size - 1;
  const correct = cells[missingIndex];
  const options = buildOptions(rng, correct, nearMisses(rng, correct), 6);

  return {
    ui: 'matrix',
    prompt:
      ruleCount === 1
        ? 'D’une case à l’autre, les figures suivent une règle. Trouvez-la, puis choisissez la figure qui remplace le point d’interrogation.'
        : `D’une case à l’autre, les figures suivent ${ruleCount} règles à la fois. Trouvez-les, puis choisissez la figure qui remplace le point d’interrogation.`,
    timeLimitMs: 35000 - difficulty * 1200,
    data: {
      size,
      rules: rules.map((r) => r.kind),
      axis,
      cells: cells.map((g, i) => (i === missingIndex ? null : g)),
      options,
    },
    expected: { key: visualKey(correct) },
  };
}

/* ------------------------------------------------------------------ */
/* Rotation mentale                                                    */
/* ------------------------------------------------------------------ */

function voxelSet(rng, n) {
  const used = new Set();
  const voxels = [];
  while (voxels.length < n) {
    const x = randInt(rng, 0, 1);
    const y = randInt(rng, 0, 1);
    const z = randInt(rng, 0, 1);
    const k = `${x}${y}${z}`;
    if (used.has(k)) continue;
    used.add(k);
    voxels.push({ x, y, z, color: pick(rng, GLYPH_COLORS) });
  }
  return voxels;
}

function rotateY(voxels, quarter) {
  const q = ((quarter % 4) + 4) % 4;
  return voxels.map((v) => {
    let { x, z } = v;
    for (let i = 0; i < q; i += 1) {
      const nx = z;
      const nz = 1 - x;
      x = nx;
      z = nz;
    }
    return { ...v, x, z };
  });
}

function mirrorX(voxels) {
  return voxels.map((v) => ({ ...v, x: 1 - v.x }));
}

function voxelKey(voxels) {
  return voxels
    .map((v) => `${v.x}${v.y}${v.z}${v.color}`)
    .sort()
    .join('|');
}

/** Objet dont les quatre rotations sont distinctes et dont le miroir n’est aucune d’elles. */
function asymmetricObject(rng, n) {
  for (let tries = 0; tries < 60; tries += 1) {
    const obj = voxelSet(rng, n);
    const rots = [0, 1, 2, 3].map((q) => voxelKey(rotateY(obj, q)));
    if (new Set(rots).size < 4) continue;
    const mirror = voxelKey(mirrorX(obj));
    if (rots.includes(mirror)) continue;
    return obj;
  }
  return voxelSet(rng, n);
}

export function generateRotation(rng, difficulty) {
  const n = mapDifficulty(difficulty, 3, 7);
  const obj = asymmetricObject(rng, n);
  const angle = pick(rng, [1, 2, 3]);
  const correct = rotateY(obj, angle);
  const okKey = voxelKey(correct);
  const pool = [
    { id: 'mirror', voxels: mirrorX(rotateY(obj, pick(rng, [0, 1, 2, 3]))) },
    { id: 'decoy', voxels: rotateY(asymmetricObject(rng, n), pick(rng, [0, 1, 2, 3])) },
    {
      id: 'decoy2',
      voxels: rotateY(
        obj.map((v, i) => (i === 0 ? { ...v, color: pick(rng, GLYPH_COLORS.filter((c) => c !== v.color)) } : v)),
        angle
      ),
    },
  ];
  const options = [{ id: 'ok', voxels: correct }];
  const seen = new Set([okKey]);
  pool.forEach((o) => {
    const k = voxelKey(o.voxels);
    if (seen.has(k)) return;
    seen.add(k);
    options.push(o);
  });
  for (let i = 0; options.length < 4 && i < 30; i += 1) {
    const v = rotateY(voxelSet(rng, n), randInt(rng, 0, 3));
    const k = voxelKey(v);
    if (seen.has(k)) continue;
    seen.add(k);
    options.push({ id: `decoy${options.length + 1}`, voxels: v });
  }
  return {
    ui: 'rotation',
    prompt:
      'Parmi les quatre vues, une seule montre l’objet de référence simplement tourné. Choisissez-la, en vous méfiant de son reflet dans un miroir.',
    timeLimitMs: 28000,
    data: { obj, options: shuffle(rng, options) },
    expected: { id: 'ok' },
  };
}

/* ------------------------------------------------------------------ */
/* Analogies visuelles                                                 */
/* ------------------------------------------------------------------ */

export function generateAnalogy(rng, difficulty) {
  let kinds = shuffle(rng, ['color', 'shape', 'orientation', 'count']).slice(
    0,
    mapDifficulty(difficulty, 1, 3)
  );
  const withOrientation = kinds.includes('orientation');
  if (withOrientation) kinds = kinds.filter((k) => k !== 'shape');

  /* Transformation explicite et identique pour A→B et C→D : « devient vert », « passe à 3 », « tourne d’un quart ». */
  const target = {
    color: pick(rng, GLYPH_COLORS),
    shape: pick(rng, GLYPH_SHAPES),
    count: randInt(rng, 1, 4),
    turn: pick(rng, [90, 180, 270]),
  };
  const transform = (g) => {
    const next = { ...g };
    if (kinds.includes('color')) next.color = target.color;
    if (kinds.includes('shape')) next.shape = target.shape;
    if (kinds.includes('count')) next.count = target.count;
    if (kinds.includes('orientation')) next.rotation = (g.rotation + target.turn) % 360;
    return next;
  };
  /* Le glyphe source ne doit pas déjà porter la valeur cible, sinon le changement est invisible. */
  const source = () => {
    const g = randomGlyph(rng);
    if (withOrientation) g.shape = 'triangle';
    if (kinds.includes('color') && g.color === target.color) {
      g.color = pick(rng, GLYPH_COLORS.filter((x) => x !== target.color));
    }
    if (kinds.includes('shape') && g.shape === target.shape) {
      g.shape = pick(rng, GLYPH_SHAPES.filter((x) => x !== target.shape));
    }
    if (kinds.includes('count') && g.count === target.count) {
      g.count = pick(rng, [1, 2, 3, 4].filter((x) => x !== target.count));
    }
    return g;
  };

  const a = source();
  const b = transform(a);
  let c = source();
  for (let i = 0; i < 20 && visualKey(c) === visualKey(a); i += 1) c = source();
  const d = transform(c);

  const misses = [
    ...nearMisses(rng, d),
    transformGlyph(c, pick(rng, ['color', 'count']), rng),
    c,
    b,
  ];
  const options = buildOptions(rng, d, misses, 5);
  return {
    ui: 'analogy',
    prompt:
      'Observez ce qui change entre A et B, appliquez la même transformation à C, puis choisissez le résultat.',
    timeLimitMs: 25000,
    data: { a, b, c, options },
    expected: { key: visualKey(d) },
  };
}

/* ------------------------------------------------------------------ */
/* Séries logiques                                                     */
/* ------------------------------------------------------------------ */

export function generateSeries(rng, difficulty) {
  const length = mapDifficulty(difficulty, 3, 5);
  const ruleCount = mapDifficulty(difficulty, 1, 2);
  const rules = pickRules(
    rng,
    ruleCount,
    ['rotate', 'color', 'shape', 'countAlt', 'count'],
    length
  );
  const base = randomGlyph(rng, { count: 1, rotation: 0 });
  if (rules.some((r) => r.kind === 'rotate')) base.shape = 'triangle';

  const series = Array.from({ length }, (_, k) => applyRules(rules, base, k));
  const next = applyRules(rules, base, length);
  const misses = [...nearMisses(rng, next), series[length - 1], series[length - 2]];
  const options = buildOptions(rng, next, misses, 4);

  return {
    ui: 'series',
    prompt:
      'Repérez ce qui évolue d’une figure à la suivante, puis choisissez celle qui prolonge la série.',
    timeLimitMs: 22000,
    data: { series, options, rules: rules.map((r) => r.kind) },
    expected: { key: visualKey(next) },
  };
}

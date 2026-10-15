import { pick, randInt, shuffle } from '../rng.js';
import { mapDifficulty } from '../glyphs.js';

export const CORTEX_SHAPES = Object.freeze([
  'circle',
  'square',
  'triangle',
  'diamond',
  'hex',
  'star',
  'plus',
  'cross',
  'ring',
  'pentagon',
  'arrow',
  'chevron',
  'hourglass',
  'teardrop',
  'leaf',
  'bolt',
  'heart',
  'bar',
  'pill',
  'crescent',
]);

export const CORTEX_COLORS = Object.freeze([
  '#38bdf8',
  '#f59e0b',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#22d3ee',
  '#fbbf24',
  '#4ade80',
  '#e879f9',
]);

export const CORTEX_FILLS = Object.freeze(['solid', 'outline', 'stripe']);
export const CORTEX_SIZES = Object.freeze(['s', 'm', 'l']);
export const CORTEX_LAYOUTS = Object.freeze(['row', 'orbit', 'stack', 'fan']);

const SHAPE_FAMILIES = Object.freeze([
  ['triangle', 'star', 'arrow', 'chevron', 'bolt'],
  ['square', 'diamond', 'hex', 'pentagon', 'plus', 'cross'],
  ['circle', 'ring', 'heart', 'teardrop', 'crescent'],
  ['bar', 'pill', 'leaf', 'hourglass'],
]);

function diverseShapes(rng, n) {
  const bags = SHAPE_FAMILIES.map((fam) => shuffle(rng, fam));
  const out = [];
  let i = 0;
  while (out.length < n) {
    const bag = bags[i % bags.length];
    const next = bag[Math.floor(out.length / bags.length) % bag.length];
    if (!out.includes(next)) out.push(next);
    else {
      const extra = pick(rng, CORTEX_SHAPES.filter((s) => !out.includes(s)));
      if (extra) out.push(extra);
      else break;
    }
    i += 1;
  }
  return shuffle(rng, out);
}

const ROT_PERIOD = Object.freeze({
  circle: 0,
  ring: 0,
  hex: 60,
  plus: 90,
  cross: 90,
  square: 90,
  diamond: 90,
  star: 72,
  pentagon: 72,
  bar: 180,
  pill: 180,
});

function visualAngle(shape, angle) {
  const period = ROT_PERIOD[shape] ?? 360;
  if (!period) return 0;
  const a = ((Number(angle) || 0) % 360 + 360) % 360;
  return a % period;
}

function legacyShape(c) {
  return CORTEX_SHAPES[c.shapeType] || ['circle', 'square', 'triangle'][c.shapeType] || 'circle';
}

export function cellKey(c) {
  if (!c || typeof c !== 'object') return '';
  const shape = c.shape || legacyShape(c);
  return [
    shape,
    Number(c.count) || 1,
    visualAngle(shape, c.angle),
    c.color || '',
    c.fill || 'solid',
    c.size || 'm',
  ].join('|');
}

function uniqueCells(seed, make, count, maxTries = 280) {
  const out = [];
  const seen = new Set();
  const push = (c) => {
    const k = cellKey(c);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  seed.forEach(push);
  for (let i = 0; out.length < count && i < maxTries; i += 1) push(make());
  return out.length >= count ? out.slice(0, count) : null;
}

function rankOn(axis, r, c) {
  if (axis === 'row') return r;
  if (axis === 'col') return c;
  if (axis === 'diag') return (r + c) % 3;
  return (r + 2 * c) % 3;
}

function axisLabel(axis) {
  if (axis === 'row') return 'la ligne';
  if (axis === 'col') return 'la colonne';
  if (axis === 'diag') return 'la diagonale (ligne + colonne)';
  return 'l’autre diagonale';
}

function dimLabel(dim) {
  return {
    shape: 'le type de forme',
    count: 'le nombre d’éléments',
    angle: 'l’orientation',
    color: 'la couleur',
    fill: 'le remplissage (plein, contour ou hachuré)',
    size: 'la taille',
  }[dim];
}

function randomCell(rng, palette) {
  return {
    shape: pick(rng, palette.shapes),
    count: randInt(rng, 1, 4),
    angle: pick(rng, palette.angles),
    color: pick(rng, palette.colors),
    fill: pick(rng, palette.fills),
    size: pick(rng, palette.sizes),
  };
}

function tryMatrix(rng, difficulty) {
  const layout = pick(rng, CORTEX_LAYOUTS);
  const showAxis = rng() < 0.68;
  const rotStep = pick(rng, difficulty >= 5 ? [30, 45, 60, 90, 135] : [45, 90, 120]);
  const baseAngle = pick(rng, [0, 30, 45, 60, 90, 120, 135, 180, 210, 225, 270]);
  const shapePool = diverseShapes(rng, pick(rng, [3, 4, 5, 6]));
  const colorPool = shuffle(rng, CORTEX_COLORS).slice(0, pick(rng, [3, 4, 5]));
  const fillPool = shuffle(rng, CORTEX_FILLS);
  const sizePool = shuffle(rng, CORTEX_SIZES);
  const countSeq = rng() < 0.5 ? [1, 2, 3] : [3, 2, 1];
  const angles = [0, 30, 45, 60, 90, 120, 135, 180, 210, 225, 270, 315];
  const palette = {
    shapes: shapePool,
    colors: colorPool,
    fills: fillPool,
    sizes: sizePool,
    angles,
  };

  const axes = ['row', 'col', 'diag', 'anti'];
  const dims = ['shape', 'count', 'angle', 'color'];
  if (difficulty >= 4) dims.push('fill');
  if (difficulty >= 7) dims.push('size');
  const nRules = mapDifficulty(difficulty, 2, Math.min(4, dims.length));
  const chosen = shuffle(rng, dims).slice(0, nRules);
  const rules = chosen.map((dim) => ({ dim, axis: pick(rng, axes) }));

  const cellAt = (r, c) => {
    const cell = {
      shape: shapePool[0],
      count: 2,
      angle: baseAngle,
      color: colorPool[0],
      fill: fillPool[0],
      size: 'm',
    };
    rules.forEach((rule) => {
      const k = rankOn(rule.axis, r, c);
      if (rule.dim === 'shape') cell.shape = shapePool[k % shapePool.length];
      if (rule.dim === 'count') cell.count = countSeq[k % 3];
      if (rule.dim === 'angle') cell.angle = (baseAngle + k * rotStep) % 360;
      if (rule.dim === 'color') cell.color = colorPool[k % colorPool.length];
      if (rule.dim === 'fill') cell.fill = fillPool[k % fillPool.length];
      if (rule.dim === 'size') cell.size = sizePool[k % 3];
    });
    return cell;
  };

  const cells = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) cells.push(cellAt(r, c));
  }
  const correct = cells[8];
  const near = rules.map((rule) => {
    const mut = { ...correct };
    if (rule.dim === 'shape') mut.shape = pick(rng, shapePool.filter((s) => s !== correct.shape));
    if (rule.dim === 'count') mut.count = pick(rng, [1, 2, 3, 4].filter((n) => n !== correct.count));
    if (rule.dim === 'angle') mut.angle = (correct.angle + rotStep * pick(rng, [1, 2, 3])) % 360;
    if (rule.dim === 'color') mut.color = pick(rng, colorPool.filter((x) => x !== correct.color));
    if (rule.dim === 'fill') mut.fill = pick(rng, fillPool.filter((x) => x !== correct.fill));
    if (rule.dim === 'size') mut.size = pick(rng, sizePool.filter((x) => x !== correct.size));
    return mut;
  });
  const options = uniqueCells([correct, ...near], () => randomCell(rng, palette), 4);
  if (!options) return null;

  const ruleText = rules
    .map((rule) => `${dimLabel(rule.dim)} suit ${axisLabel(rule.axis)}`)
    .join(' ; ');
  return {
    ui: 'svgMatrix',
    prompt:
      'Observez la grille 3 × 3. Plusieurs règles se combinent (forme, nombre, orientation, couleur, remplissage…). Choisissez la figure qui remplace le point d’interrogation.',
    timeLimitMs: 90000,
    data: {
      cells: cells.slice(0, 8),
      options: shuffle(rng, options),
      layout,
      showAxis,
    },
    expected: { key: cellKey(correct) },
    explanation: `Dans cette grille, ${ruleText}. La case manquante reprend donc exactement cette combinaison.`,
  };
}

/** Matrices 3×3 : formes, couleurs, remplissages et lois recombinés à chaque essai. */
export function generateCortexMatrix(rng, difficulty) {
  for (let i = 0; i < 16; i += 1) {
    const built = tryMatrix(rng, difficulty);
    if (built) return built;
  }
  const fallback = {
    shape: 'triangle',
    count: 2,
    angle: 45,
    color: '#38bdf8',
    fill: 'solid',
    size: 'm',
  };
  const options = uniqueCells(
    [fallback],
    () => ({
      ...fallback,
      shape: pick(rng, CORTEX_SHAPES),
      count: randInt(rng, 1, 3),
      angle: pick(rng, [0, 45, 90, 135]),
      color: pick(rng, CORTEX_COLORS),
    }),
    4
  );
  return {
    ui: 'svgMatrix',
    prompt:
      'Observez la grille 3 × 3. Choisissez la figure qui remplace le point d’interrogation.',
    timeLimitMs: 90000,
    data: {
      cells: Array.from({ length: 8 }, () => ({ ...fallback })),
      options: options || [fallback, fallback, fallback, fallback],
      layout: 'row',
      showAxis: true,
    },
    expected: { key: cellKey(fallback) },
    explanation: 'La figure manquante reprend la même combinaison que les autres cases de cette grille de secours.',
  };
}

function distractorNumbers(rng, answer) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard < 60) {
    guard += 1;
    const step = (randInt(rng, 1, 9) || 1) * (rng() < 0.5 ? 1 : -1);
    const v = answer + step * (rng() < 0.5 ? 1 : 3);
    if (v !== answer) set.add(v);
  }
  return shuffle(rng, [...set]);
}

function tryFigureSequence(rng, difficulty) {
  const nShow = mapDifficulty(difficulty, 5, 7);
  const layout = pick(rng, CORTEX_LAYOUTS);
  const showAxis = rng() < 0.5;
  const shapePool = diverseShapes(rng, pick(rng, [3, 4, 5]));
  const colorPool = shuffle(rng, CORTEX_COLORS).slice(0, pick(rng, [3, 4]));
  const fillPool = shuffle(rng, CORTEX_FILLS);
  const rotStep = pick(rng, [45, 60, 90, 120]);
  const base = {
    shape: shapePool[0],
    count: randInt(rng, 1, 2),
    angle: pick(rng, [0, 45, 90]),
    color: colorPool[0],
    fill: fillPool[0],
    size: 'm',
  };
  const dims = shuffle(rng, ['shape', 'count', 'angle', 'color', 'fill']).slice(
    0,
    mapDifficulty(difficulty, 1, 3)
  );
  const at = (k) => {
    const cell = { ...base };
    dims.forEach((dim) => {
      if (dim === 'shape') cell.shape = shapePool[k % shapePool.length];
      if (dim === 'count') cell.count = 1 + (k % 3);
      if (dim === 'angle') cell.angle = (base.angle + k * rotStep) % 360;
      if (dim === 'color') cell.color = colorPool[k % colorPool.length];
      if (dim === 'fill') cell.fill = fillPool[k % fillPool.length];
    });
    return cell;
  };
  const seq = [];
  for (let i = 0; i < nShow; i += 1) seq.push(at(i));
  const correct = at(nShow);
  const palette = {
    shapes: shapePool,
    colors: colorPool,
    fills: fillPool,
    sizes: CORTEX_SIZES,
    angles: [0, 45, 90, 135, 180, 225, 270],
  };
  const near = dims.map((dim) => {
    const mut = { ...correct };
    if (dim === 'shape') mut.shape = pick(rng, shapePool.filter((s) => s !== correct.shape));
    if (dim === 'count') mut.count = pick(rng, [1, 2, 3, 4].filter((n) => n !== correct.count));
    if (dim === 'angle') mut.angle = (correct.angle + rotStep) % 360;
    if (dim === 'color') mut.color = pick(rng, colorPool.filter((x) => x !== correct.color));
    if (dim === 'fill') mut.fill = pick(rng, fillPool.filter((x) => x !== correct.fill));
    return mut;
  });
  const options = uniqueCells([correct, ...near], () => randomCell(rng, palette), 4);
  if (!options) return null;
  const labels = {
    shape: 'le type de forme',
    count: 'le nombre d’éléments',
    angle: 'l’orientation',
    color: 'la couleur',
    fill: 'le remplissage',
  };
  return {
    ui: 'numberSequence',
    prompt:
      'Ces figures suivent une ou plusieurs lois (forme, nombre, orientation, couleur…). Choisissez la figure qui prolonge la suite.',
    timeLimitMs: 75000,
    data: {
      mode: 'figures',
      sequence: seq,
      options: shuffle(rng, options),
      layout,
      showAxis,
    },
    expected: { answer: cellKey(correct), key: cellKey(correct) },
    explanation: `À chaque pas, ${dims.map((d) => labels[d]).join(', ')} évolue${dims.length > 1 ? 'nt' : ''} selon une règle fixe. La figure suivante reprend cette progression.`,
  };
}

function generateNumberSequence(rng, difficulty) {
  const kinds = [
    'arithmetic',
    'second_order',
    'affine',
    'interleaved',
    'fibonacci',
    'alternating',
    'multiply',
    'two_step',
  ];
  if (difficulty >= 5) kinds.push('powers', 'paired', 'triangular', 'poly');
  if (difficulty >= 8) kinds.push('third_order', 'digit_mix');
  const kind = pick(rng, kinds);
  let seq = [];
  let answer = 0;
  let explanation = '';

  if (kind === 'arithmetic') {
    const start = randInt(rng, -8, 18);
    const step = pick(rng, [-7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
    const n = mapDifficulty(difficulty, 5, 7);
    for (let i = 0; i < n; i += 1) seq.push(start + i * step);
    answer = start + n * step;
    explanation = `On ajoute ${step} à chaque pas. Après ${seq[seq.length - 1]}, on obtient ${answer}.`;
  } else if (kind === 'second_order') {
    const start = randInt(rng, 2, 16);
    const d0 = randInt(rng, 1, 8);
    const dd = pick(rng, [1, 2, 3, 4, 5]);
    let curr = start;
    let diff = d0;
    const n = mapDifficulty(difficulty, 5, 7);
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr += diff;
      diff += dd;
    }
    answer = curr;
    explanation = `Les écarts augmentent de ${dd} à chaque pas (écart initial ${d0}). Le terme suivant vaut ${seq[seq.length - 1]} + ${diff - dd} = ${answer}.`;
  } else if (kind === 'third_order') {
    let curr = randInt(rng, 1, 8);
    let d1 = randInt(rng, 1, 4);
    let d2 = randInt(rng, 1, 3);
    const d3 = randInt(rng, 1, 2);
    const n = 6;
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr += d1;
      d1 += d2;
      d2 += d3;
    }
    answer = curr;
    explanation = `Les écarts eux-mêmes accélèrent (loi du troisième ordre). Le terme suivant est ${answer}.`;
  } else if (kind === 'affine') {
    const mult = pick(rng, [2, 3]);
    const offset = randInt(rng, -3, 6);
    let curr = randInt(rng, 1, 7);
    const n = mapDifficulty(difficulty, 4, 5);
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr = curr * mult + offset;
    }
    answer = curr;
    const signed = offset >= 0 ? `+ ${offset}` : `− ${-offset}`;
    explanation = `Chaque terme s’obtient en multipliant le précédent par ${mult}, puis ${signed}. Ainsi ${seq[seq.length - 1]} × ${mult} ${signed} = ${answer}.`;
  } else if (kind === 'multiply') {
    const mult = pick(rng, [2, 3, 4, 5]);
    let curr = randInt(rng, 1, 6);
    const n = mapDifficulty(difficulty, 4, 6);
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr *= mult;
    }
    answer = curr;
    explanation = `On multiplie par ${mult} à chaque pas. ${seq[seq.length - 1]} × ${mult} = ${answer}.`;
  } else if (kind === 'interleaved') {
    let a = randInt(rng, 2, 16);
    let b = randInt(rng, 12, 48);
    const stepA = pick(rng, [-6, -4, -3, 2, 3, 4, 5, 7]);
    const stepB = pick(rng, [-7, -5, -3, 2, 3, 4, 6]);
    const pairs = mapDifficulty(difficulty, 3, 4);
    for (let i = 0; i < pairs; i += 1) {
      seq.push(a, b);
      a += stepA;
      b += stepB;
    }
    answer = a;
    explanation = `Deux suites sont entrelacées : les rangs impairs avancent de ${stepA}, les rangs pairs de ${stepB}. Le prochain terme impair est ${answer}.`;
  } else if (kind === 'fibonacci') {
    let x = randInt(rng, 1, 8);
    let y = randInt(rng, 2, 11);
    const k = randInt(rng, -2, 4);
    seq.push(x, y);
    const extra = mapDifficulty(difficulty, 3, 5);
    for (let i = 0; i < extra; i += 1) {
      const next = y + x + k;
      seq.push(next);
      x = y;
      y = next;
    }
    answer = y + x + k;
    explanation =
      k === 0
        ? `Chaque terme est la somme des deux précédents. Donc ${seq[seq.length - 1]} + ${seq[seq.length - 2]} = ${answer}.`
        : `Chaque terme est la somme des deux précédents${k > 0 ? `, plus ${k}` : `, moins ${-k}`}. Donc ${answer}.`;
  } else if (kind === 'alternating') {
    const a = pick(rng, [-9, -6, -4, 3, 4, 5, 7, 8]);
    const b = pick(rng, [-8, -5, -3, 2, 4, 6, 9].filter((n) => n !== a));
    let curr = randInt(rng, 3, 20);
    const n = mapDifficulty(difficulty, 5, 7);
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr += i % 2 === 0 ? a : b;
    }
    answer = curr;
    explanation = `On alterne +${a} et +${b}. Après le dernier terme, on applique encore cette alternance : ${answer}.`;
  } else if (kind === 'two_step') {
    const add = randInt(rng, 1, 6);
    const mult = pick(rng, [2, 3]);
    let curr = randInt(rng, 2, 7);
    const n = 6;
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr = i % 2 === 0 ? curr + add : curr * mult;
    }
    answer = curr;
    explanation = `On alterne « ajouter ${add} » et « multiplier par ${mult} ». Le terme suivant est ${answer}.`;
  } else if (kind === 'powers') {
    const base = pick(rng, [2, 3, 4]);
    const add = randInt(rng, -2, 5);
    const start = randInt(rng, 1, 3);
    const n = 5;
    for (let i = 0; i < n; i += 1) seq.push(base ** (start + i) + add);
    answer = base ** (start + n) + add;
    explanation = `On reconnaît les puissances de ${base}${add ? `, décalées de ${add}` : ''}. Le terme suivant est ${answer}.`;
  } else if (kind === 'triangular') {
    const shift = randInt(rng, 0, 6);
    const start = randInt(rng, 2, 4);
    const n = 5;
    const tri = (k) => (k * (k + 1)) / 2;
    for (let i = 0; i < n; i += 1) seq.push(tri(start + i) + shift);
    answer = tri(start + n) + shift;
    explanation = `Ce sont les nombres triangulaires (1, 3, 6, 10…)${shift ? `, décalés de ${shift}` : ''}. Le suivant est ${answer}.`;
  } else if (kind === 'poly') {
    const a = randInt(rng, 1, 3);
    const b = randInt(rng, -2, 4);
    const c0 = randInt(rng, 0, 6);
    const start = randInt(rng, 1, 3);
    const n = 5;
    for (let i = 0; i < n; i += 1) {
      const x = start + i;
      seq.push(a * x * x + b * x + c0);
    }
    const x = start + n;
    answer = a * x * x + b * x + c0;
    explanation = `Chaque rang x donne ${a}x²${b >= 0 ? ` + ${b}x` : ` − ${-b}x`}${c0 ? ` + ${c0}` : ''}. Pour le rang suivant, on obtient ${answer}.`;
  } else if (kind === 'digit_mix') {
    let curr = randInt(rng, 14, 38);
    const n = 5;
    const nextOf = (v) => {
      const digits = String(Math.abs(v)).split('').map(Number);
      const sum = digits.reduce((s, d) => s + d, 0);
      return v + sum;
    };
    for (let i = 0; i < n; i += 1) {
      seq.push(curr);
      curr = nextOf(curr);
    }
    answer = curr;
    explanation = `On ajoute à chaque terme la somme de ses chiffres. Après ${seq[seq.length - 1]}, on obtient ${answer}.`;
  } else {
    const a0 = randInt(rng, 2, 12);
    const b0 = randInt(rng, 3, 14);
    const da = pick(rng, [1, 2, 3, 4, 5]);
    const db = pick(rng, [1, 2, 3, 4]);
    const pairs = 3;
    for (let i = 0; i < pairs; i += 1) seq.push(a0 + i * da, b0 + i * db);
    answer = a0 + pairs * da;
    explanation = `Les termes de rang impair avancent de ${da}, ceux de rang pair de ${db}. Le prochain terme de rang impair est ${answer}.`;
  }

  const options = distractorNumbers(rng, answer);
  return {
    ui: 'numberSequence',
    prompt:
      'Repérez la loi qui fait passer d’un nombre au suivant, puis choisissez le terme manquant. La loi change à chaque essai : écarts, multiplications, suites entrelacées, sommes…',
    timeLimitMs: 75000,
    data: { mode: 'numbers', sequence: seq, options },
    expected: { answer },
    explanation,
  };
}

/** Suites : lois numériques recombinées, ou parfois une suite de figures. */
export function generateCortexSequence(rng, difficulty) {
  if (rng() < 0.42) {
    const figures = tryFigureSequence(rng, difficulty);
    if (figures) return figures;
  }
  return generateNumberSequence(rng, difficulty);
}

const REAL_CATS = Object.freeze(
  [
    ['jardiniers', 'jardinier'],
    ['libraires', 'libraire'],
    ['cyclistes', 'cycliste'],
    ['boulangers', 'boulanger'],
    ['peintres', 'peintre'],
    ['marins', 'marin'],
    ['apiculteurs', 'apiculteur'],
    ['horlogers', 'horloger'],
    ['céramistes', 'céramiste'],
    ['viticulteurs', 'viticulteur'],
    ['archivistes', 'archiviste'],
    ['facteurs', 'facteur'],
    ['menuisiers', 'menuisier'],
    ['botanistes', 'botaniste'],
    ['cartographes', 'cartographe'],
    ['relieurs', 'relieur'],
    ['luthiers', 'luthier'],
    ['fromagers', 'fromager'],
    ['verriers', 'verrier'],
    ['sauveteurs', 'sauveteur'],
    ['guides', 'guide'],
    ['potiers', 'potier'],
    ['imprimeurs', 'imprimeur'],
    ['géologues', 'géologue'],
    ['astronomes', 'astronome'],
    ['cordonniers', 'cordonnier'],
    ['ébénistes', 'ébéniste'],
    ['forgerons', 'forgeron'],
    ['orfèvres', 'orfèvre'],
    ['typographes', 'typographe'],
    ['scribes', 'scribe'],
    ['pilotes', 'pilote'],
    ['meuniers', 'meunier'],
    ['vignerons', 'vigneron'],
    ['brasseurs', 'brasseur'],
    ['tanneurs', 'tanneur'],
    ['vanneurs', 'vanneur'],
    ['drakkariens', 'drakkarien'],
    ['funambules', 'funambule'],
    ['horlogistes', 'horlogiste'],
    ['mosaïstes', 'mosaïste'],
    ['tonneliers', 'tonnelier'],
    ['sélénologues', 'sélénologue'],
    ['paléographes', 'paléographe'],
    ['hydrologues', 'hydrologue'],
    ['mycologues', 'mycologue'],
    ['ornithologues', 'ornithologue'],
  ].map(([pl, sg]) => ({ pl, sg }))
);

const ONSETS = Object.freeze(
  'br cr dr fl fr gl gr kl kr pl pr sk sl sn tr vr zw'.split(' ')
);
const NUCLEI = Object.freeze('a e i o u ou an in on'.split(' '));
const CODAS = Object.freeze('k l n r s t m v'.split(' '));

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nonceCat(rng) {
  const syls = randInt(rng, 2, 3);
  let stem = '';
  for (let i = 0; i < syls; i += 1) {
    stem += pick(rng, ONSETS) + pick(rng, NUCLEI);
    if (rng() < 0.55) stem += pick(rng, CODAS);
  }
  const sg = cap(stem);
  return { pl: `${sg}s`, sg };
}

function takeCats(rng, n) {
  const pool = [];
  REAL_CATS.forEach((c) => pool.push(c));
  for (let i = 0; i < 12; i += 1) pool.push(nonceCat(rng));
  const unique = [];
  const seen = new Set();
  shuffle(rng, pool).forEach((c) => {
    if (seen.has(c.sg)) return;
    seen.add(c.sg);
    unique.push(c);
  });
  return unique.slice(0, n);
}

function un(cat) {
  const w = cat.sg;
  return /^[aeiouyhàâäéèêëïîôùûü]/i.test(w) ? `un ${w}` : `un ${w}`;
}

function allAre(A, B, style) {
  if (style === 1) return `Chaque ${A.sg} est ${un(B)}.`;
  if (style === 2) return `Quiconque est ${A.sg} est aussi ${B.sg}.`;
  return `Tous les ${A.pl} sont des ${B.pl}.`;
}

function noneAre(A, B, style) {
  if (style === 1) return `Pas un seul ${A.sg} n’est ${un(B)}.`;
  return `Aucun ${A.sg} n’est ${un(B)}.`;
}

function someAre(A, B) {
  return `Certains ${A.pl} sont des ${B.pl}.`;
}

function ifThen(A, B, style) {
  if (style === 1) return `Dès qu’une personne est ${un(A)}, c’est ${un(B)}.`;
  if (style === 2) return `Quand on est ${A.sg}, on est forcément ${B.sg}.`;
  return `Si quelqu’un est ${un(A)}, alors c’est ${un(B)}.`;
}

function noneNeeded() {
  return 'Aucune conclusion nécessaire ne découle de ces prémisses.';
}

/** Déduction : schémas, phrasés et catégories recombinés à chaque essai. */
export function generateCortexSyllogism(rng, difficulty) {
  const [A, B, C] = takeCats(rng, 3);
  const style = randInt(rng, 0, 2);
  const kinds = [
    'barbara',
    'celarent',
    'camestres',
    'modusPonens',
    'modusTollens',
    'disjunction',
    'darii',
    'chain',
  ];
  if (difficulty >= 4) kinds.push('undistributed', 'affirmConsequent', 'illicitConv', 'someTrap');
  if (difficulty >= 7) kinds.push('biconditional', 'exclusiveBoth');
  const kind = pick(rng, kinds);
  let premises = '';
  let correct = '';
  let distractors = [];
  let explanation = '';

  if (kind === 'barbara') {
    premises = `${allAre(A, B, style)}\n${allAre(C, A, style)}`;
    correct = `Tous les ${C.pl} sont des ${B.pl}.`;
    distractors = [
      `Aucun ${C.sg} n’est ${un(B)}.`,
      `Tous les ${B.pl} sont des ${C.pl}.`,
      `Certains ${B.pl} ne sont pas des ${A.pl}.`,
    ];
    explanation = `Si tous les ${A.pl} sont des ${B.pl}, et que tous les ${C.pl} sont des ${A.pl}, alors tous les ${C.pl} sont forcément des ${B.pl}.`;
  } else if (kind === 'celarent') {
    premises = `${noneAre(A, B, style)}\n${allAre(C, A, style)}`;
    correct = `Aucun ${C.sg} n’est ${un(B)}.`;
    distractors = [
      `Tous les ${C.pl} sont des ${B.pl}.`,
      someAre(C, B),
      noneAre(B, A, 0),
    ];
    explanation = `Aucun ${A.sg} n’appartient aux ${B.pl}. Or tous les ${C.pl} sont des ${A.pl}. Donc aucun ${C.sg} ne peut être ${un(B)}.`;
  } else if (kind === 'camestres') {
    premises = `${noneAre(A, B, style)}\n${allAre(C, B, style)}`;
    correct = `Aucun ${C.sg} n’est ${un(A)}.`;
    distractors = [
      `Tous les ${C.pl} sont des ${A.pl}.`,
      someAre(A, C),
      noneAre(B, C, 0),
    ];
    explanation = `Les ${A.pl} et les ${B.pl} n’ont aucun membre en commun. Les ${C.pl} sont tous des ${B.pl}. Ils ne peuvent donc pas être des ${A.pl}.`;
  } else if (kind === 'darii') {
    premises = `${allAre(A, B, style)}\n${someAre(C, A)}`;
    correct = someAre(C, B);
    distractors = [
      `Tous les ${C.pl} sont des ${B.pl}.`,
      `Aucun ${C.sg} n’est ${un(B)}.`,
      noneNeeded(),
    ];
    explanation = `Tous les ${A.pl} sont des ${B.pl}, et certains ${C.pl} sont des ${A.pl}. Ces ${C.pl}-là sont donc aussi des ${B.pl}.`;
  } else if (kind === 'chain') {
    premises = `${ifThen(A, B, style)}\n${ifThen(B, C, style)}\nCette personne est ${un(A)}.`;
    correct = `Cette personne est ${un(C)}.`;
    distractors = [
      `Cette personne n’est pas ${un(C)}.`,
      `Cette personne n’est pas ${un(B)}.`,
      noneNeeded(),
    ];
    explanation = `P entraîne Q, Q entraîne R, et P est vrai : R est forcé. Ici, être ${A.sg} force d’être ${C.sg}.`;
  } else if (kind === 'modusPonens') {
    premises = `${ifThen(A, B, style)}\nCette personne est ${un(A)}.`;
    correct = `Cette personne est ${un(B)}.`;
    distractors = [
      `Cette personne n’est pas ${un(B)}.`,
      `Cette personne n’est pas ${un(A)}.`,
      noneNeeded(),
    ];
    explanation = `« Si P, alors Q » et « P » entraînent « Q ». Ici P = « être ${un(A)} » et Q = « être ${un(B)} ».`;
  } else if (kind === 'modusTollens') {
    premises = `${ifThen(A, B, style)}\nCette personne n’est pas ${un(B)}.`;
    correct = `Cette personne n’est pas ${un(A)}.`;
    distractors = [
      `Cette personne est ${un(A)}.`,
      `Cette personne est ${un(B)}.`,
      noneNeeded(),
    ];
    explanation = `Si P entraînait Q, l’absence de Q interdit P. Ce n’est pas ${un(B)}, donc ce n’est pas ${un(A)}.`;
  } else if (kind === 'disjunction') {
    premises = `Soit cette personne est ${un(A)}, soit elle est ${un(B)} (pas les deux).\nCette personne n’est pas ${un(A)}.`;
    correct = `Cette personne est ${un(B)}.`;
    distractors = [
      `Cette personne est ${un(A)}.`,
      `Cette personne n’est ni ${un(A)} ni ${un(B)}.`,
      noneNeeded(),
    ];
    explanation = `Dans une alternative exclusive, écarter l’une des deux possibilités force l’autre.`;
  } else if (kind === 'biconditional') {
    premises = `On est ${A.sg} si et seulement si on est ${B.sg}.\nCette personne n’est pas ${un(A)}.`;
    correct = `Cette personne n’est pas ${un(B)}.`;
    distractors = [
      `Cette personne est ${un(B)}.`,
      `Cette personne est ${un(A)}.`,
      noneNeeded(),
    ];
    explanation = `« Si et seulement si » lie les deux côtés. Sans P, on n’a pas Q.`;
  } else if (kind === 'exclusiveBoth') {
    premises = `Soit cette personne est ${un(A)}, soit elle est ${un(B)} (pas les deux).\nCette personne est ${un(A)}.`;
    correct = `Cette personne n’est pas ${un(B)}.`;
    distractors = [
      `Cette personne est ${un(B)}.`,
      `Cette personne n’est pas ${un(A)}.`,
      noneNeeded(),
    ];
    explanation = `L’alternative exclusive interdit d’avoir les deux. Si c’est ${un(A)}, ce n’est pas ${un(B)}.`;
  } else if (kind === 'illicitConv') {
    premises = `${allAre(A, B, style)}`;
    correct = noneNeeded();
    distractors = [
      `Tous les ${B.pl} sont des ${A.pl}.`,
      `Aucun ${B.sg} n’est ${un(A)}.`,
      someAre(B, A),
    ];
    explanation = `« Tous les A sont des B » n’autorise pas à retourner la phrase. Des B peuvent n’être pas des A.`;
  } else if (kind === 'someTrap') {
    premises = `${someAre(A, B)}\n${someAre(B, C)}`;
    correct = noneNeeded();
    distractors = [
      someAre(A, C),
      `Tous les ${A.pl} sont des ${C.pl}.`,
      `Aucun ${A.sg} n’est ${un(C)}.`,
    ];
    explanation = `Deux « certains » ne se recoupent pas forcément. On ne peut pas enchaîner.`;
  } else if (kind === 'undistributed') {
    premises = `${allAre(A, B, style)}\n${someAre(C, B)}`;
    correct = noneNeeded();
    distractors = [
      someAre(C, A),
      `Tous les ${C.pl} sont des ${A.pl}.`,
      `Aucun ${C.sg} n’est ${un(A)}.`,
    ];
    explanation = `Les ${A.pl} et certains ${C.pl} sont tous dans le grand ensemble des ${B.pl}, mais ils peuvent ne jamais se recouper. On ne peut pas conclure.`;
  } else {
    premises = `${ifThen(A, B, style)}\nCette personne est ${un(B)}.`;
    correct = noneNeeded();
    distractors = [
      `Cette personne est ${un(A)}.`,
      `Cette personne n’est pas ${un(A)}.`,
      `Cette personne n’est pas ${un(B)}.`,
    ];
    explanation = `Avoir Q ne prouve pas P : d’autres causes peuvent donner Q. C’est le sophisme de l’affirmation du conséquent.`;
  }

  const options = shuffle(rng, [correct, ...distractors.slice(0, 3)]);
  return {
    ui: 'syllogism',
    prompt:
      'Lisez les prémisses comme des faits admis. Choisissez la seule conclusion qui en découle forcément — ou indiquez qu’aucune conclusion n’est forcée.',
    timeLimitMs: 90000,
    data: { premises, options },
    expected: { answer: correct },
    explanation,
  };
}

/**
 * Indexe le PDF « 914 énigmes de Âne à Zèbre » (public/enigmes/enonces.pdf).
 * Pages paysage à deux colonnes ; un titre d’énigme = police ~17 pt « N Titre (k) ».
 * Sortie : src/enigmes/enigmesIndex.json — zones à découper (page, colonne, y) + texte.
 * Usage : node scripts/index-enigmes.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const doc = await getDocument({ url: 'public/enigmes/enonces.pdf', verbosity: 0 }).promise;
const HEADING_MIN_HEIGHT = 15;

/** Chaque colonne de chaque page, dans l’ordre de lecture. */
const columns = [];
let pageSize = null;
for (let p = 1; p <= doc.numPages; p += 1) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  pageSize = { width: vp.width, height: vp.height };
  const half = vp.width / 2;
  const tc = await page.getTextContent();
  const cols = [
    { page: p, col: 0, x0: 0, x1: half, items: [] },
    { page: p, col: 1, x0: half, x1: vp.width, items: [] },
  ];
  tc.items.forEach((it) => {
    if (!it.str || !it.str.trim()) return;
    const x = it.transform[4];
    const y = it.transform[5];
    cols[x < half ? 0 : 1].items.push({ x, y, h: it.height, str: it.str, font: it.fontName });
  });
  cols.forEach((c) => {
    c.items.sort((a, b) => b.y - a.y || a.x - b.x);
    columns.push(c);
  });
}

/** Repère les titres dans chaque colonne. */
const headings = [];
/* Les titres sont en haut de colonne ; les grands chiffres des figures sont plus bas. */
const HEADING_MIN_Y = pageSize.height - 80;
columns.forEach((c, ci) => {
  if (c.page === 1) return;
  const big = c.items.filter((it) => it.h >= HEADING_MIN_HEIGHT && it.y >= HEADING_MIN_Y);
  const byLine = new Map();
  big.forEach((it) => {
    const key = Math.round(it.y);
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key).push(it);
  });
  [...byLine.entries()]
    .sort((a, b) => b[0] - a[0])
    .forEach(([y, parts]) => {
      const text = parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const m = text.match(/^(\d{1,4})\s+(.+)$/);
      if (!m || !/\p{L}/u.test(m[2])) return;
      headings.push({ ci, y, top: y + Math.max(...parts.map((p) => p.h)), num: Number(m[1]), title: m[2] });
    });
});

/** Une énigme = du titre jusqu’au titre suivant, en traversant colonnes et pages si besoin. */
const enigmes = headings.map((h, i) => {
  const next = headings[i + 1];
  const segments = [];
  const textParts = [];
  for (let ci = h.ci; ci < columns.length; ci += 1) {
    const c = columns[ci];
    const startY = ci === h.ci ? h.top + 6 : pageSize.height;
    const stopHere = next && next.ci === ci;
    const endY = stopHere ? next.top + 4 : 0;
    const inside = c.items.filter((it) => it.y <= startY && it.y > endY && !(ci === h.ci && it.y >= h.y - 1 && it.h >= HEADING_MIN_HEIGHT));
    if (ci !== h.ci && !inside.length && !stopHere) {
      /* Colonne sans texte : peut ne contenir qu’une illustration, on la garde. */
    }
    if (ci === h.ci || inside.length || !stopHere) {
      segments.push({
        page: c.page,
        x0: c.x0,
        x1: c.x1,
        yTop: Math.min(pageSize.height, startY),
        yBottom: Math.max(0, endY),
      });
    }
    inside.forEach((it) => textParts.push(it.str));
    if (stopHere || !next) {
      if (!next) break;
      break;
    }
    if (ci - h.ci > 6) break;
  }
  const theme = h.title.replace(/\s*\(\d+\)\s*$/, '').trim();
  return {
    id: h.num,
    title: h.title,
    theme,
    segments: segments.filter((s) => s.yTop - s.yBottom > 8),
    text: textParts.join(' ').replace(/\s+/g, ' ').trim(),
  };
});

/** Contrôles : numérotation continue, aucune énigme sans zone. */
const problems = [];
enigmes.forEach((e, i) => {
  if (e.id !== i + 1) problems.push(`rupture de numérotation : attendu ${i + 1}, trouvé ${e.id} (« ${e.title} »)`);
  if (!e.segments.length) problems.push(`énigme ${e.id} sans zone`);
});

mkdirSync('src/enigmes', { recursive: true });
writeFileSync(
  'src/enigmes/enigmesIndex.json',
  JSON.stringify({ source: 'enonces.pdf', pageSize, count: enigmes.length, enigmes })
);
console.log(`ÉNIGMES : ${enigmes.length} indexées sur ${doc.numPages} pages`);
const multi = enigmes.filter((e) => e.segments.length > 1).length;
console.log(`sur plusieurs colonnes : ${multi}`);
console.log(`thèmes : ${new Set(enigmes.map((e) => e.theme)).size}`);
if (problems.length) {
  console.log('PROBLÈMES');
  problems.slice(0, 40).forEach((p) => console.log(' -', p));
  console.log(`(${problems.length} au total)`);
}

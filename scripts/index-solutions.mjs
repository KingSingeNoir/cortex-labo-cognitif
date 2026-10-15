/**
 * Indexe les corrigés officiels (public/enigmes/solutions.pdf, IREM de Lyon, version complète).
 * Énigmes 1 à 690 : énoncé à droite, corrigé en colonne gauche de la page suivante.
 * Énigmes 691 à 914 : énoncé à gauche, corrigé en colonne droite de la même page.
 * Un titre = « N Titre » en ~14 pt, suivi de l’étiquette « Énigme » dans la même colonne.
 * Sortie : src/enigmes/solutionsIndex.json
 * Usage : node scripts/index-solutions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const doc = await getDocument({ url: 'public/enigmes/solutions.pdf', verbosity: 0 }).promise;
const enonces = JSON.parse(readFileSync('src/enigmes/enigmesIndex.json', 'utf8'));

const pages = [];
let size = null;
for (let p = 1; p <= doc.numPages; p += 1) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  size = { width: vp.width, height: vp.height };
  const half = vp.width / 2;
  const tc = await page.getTextContent();
  const cols = [[], []];
  tc.items.forEach((it) => {
    if (!it.str || !it.str.trim()) return;
    const x = it.transform[4];
    cols[x < half ? 0 : 1].push({ x, y: it.transform[5], h: it.height, str: it.str });
  });
  pages.push({ p, half, cols });
}

const headings = [];
pages.forEach(({ p, cols }) => {
  if (p === 1) return;
  cols.forEach((items, col) => {
    const lines = new Map();
    items
      .filter((it) => it.h >= 13)
      .forEach((it) => {
        const key = Math.round(it.y);
        if (!lines.has(key)) lines.set(key, []);
        lines.get(key).push(it);
      });
    lines.forEach((parts, y) => {
      const text = parts.sort((a, b) => a.x - b.x).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
      const m = text.match(/^(\d{1,4})\s+(.+)$/);
      if (!m || !/\p{L}/u.test(m[2])) return;
      const labelled = items.some((it) => it.str.trim() === 'Énigme' && it.y < y && it.y > y - 45);
      if (!labelled && y < size.height - 80) return;
      headings.push({ num: Number(m[1]), title: m[2], page: p, col, y, top: y + Math.max(...parts.map((it) => it.h)) });
    });
  });
});
headings.sort((a, b) => a.page - b.page || a.col - b.col || b.y - a.y);

const MARGIN = 6;
const solutions = headings.map((h) => {
  const solPage = h.col === 1 ? h.page + 1 : h.page;
  const solCol = h.col === 1 ? 0 : 1;
  const pg = pages[solPage - 1];
  const nextInCol = headings.find((o) => o.page === solPage && o.col === solCol);
  const yBottom = nextInCol ? nextInCol.top + MARGIN : 0;
  const x0 = solCol === 0 ? 0 : pg.half;
  const x1 = solCol === 0 ? pg.half : size.width;
  const text = pg.cols[solCol]
    .filter((it) => it.y > yBottom)
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((it) => it.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { id: h.num, title: h.title, segments: [{ page: solPage, x0, x1, yTop: size.height, yBottom }], text };
});

const problems = [];
solutions.forEach((s, i) => {
  if (s.id !== i + 1) problems.push(`numérotation : attendu ${i + 1}, trouvé ${s.id}`);
  const e = enonces.enigmes[i];
  if (!e || e.title.replace(/\s+/g, '') !== s.title.replace(/\s+/g, '')) {
    problems.push(`titre différent n° ${i + 1} : « ${e?.title} » / « ${s.title} »`);
  }
});
if (solutions.length !== enonces.count) problems.push(`${solutions.length} corrigés pour ${enonces.count} énoncés`);

writeFileSync(
  'src/enigmes/solutionsIndex.json',
  JSON.stringify({
    source: 'solutions.pdf',
    pageSize: size,
    count: solutions.length,
    solutions: solutions.map(({ id, segments, text }) => ({ id, segments, text })),
  })
);
console.log(`CORRIGÉS : ${solutions.length} indexés sur ${doc.numPages} pages`);
const short = solutions.filter((s) => s.text.length < 60);
console.log(`corrigés très courts (< 60 caractères de texte, souvent une figure) : ${short.length}`);
console.log(short.slice(0, 30).map((s) => `${s.id}:${JSON.stringify(s.text)}`).join('\n'));
if (problems.length) {
  console.log('PROBLÈMES');
  problems.slice(0, 40).forEach((p) => console.log(' -', p));
  console.log(`(${problems.length} au total)`);
} else {
  console.log('Concordance énoncés ↔ corrigés : 914 / 914');
}

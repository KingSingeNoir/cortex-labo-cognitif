/**
 * Une photo libre par jeu (Wikimedia Commons), incrustée dans public/games/.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'games');
const UA = 'CORTEX-LaboCognitif/1.0 (couvertures de jeux ; photos Commons)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GAMES = [
  { id: 'enigmes', q: 'jigsaw puzzle pieces table', file: 'Jigsaw puzzle in progress.jpg' },
  { id: 'log-matrix', q: 'geometric mosaic tiles pattern', file: 'Alhambra tiles.jpg' },
  { id: 'log-sequence', q: 'sudoku newspaper grid', file: 'Sudoku en periódico.jpg' },
  { id: 'log-syllogism', q: 'chess players thinking', file: 'Chess players.jpg' },
  { id: 'imt-nback', q: 'playing cards memory', file: 'Playing cards.jpg' },
  { id: 'imt-span', q: 'wooden number blocks', file: 'Number blocks.jpg' },
  { id: 'imt-running', q: 'letters alphabet wooden', file: 'Wooden alphabet letters.jpg' },
  { id: 'imt-dual', q: 'person juggling two balls', file: 'Juggling.jpg' },
  { id: 'irp-matrix', q: 'islamic geometric pattern', file: 'Islamic geometric pattern.jpg' },
  { id: 'irp-rotation', q: 'rubik cube', file: "Solved Rubik's cube.jpg" },
  { id: 'irp-analogy', q: 'tangram puzzle pieces', file: 'Tangram.jpg' },
  { id: 'irp-series', q: 'dominoes sequence', file: 'Dominoes.jpg' },
  { id: 'ivt-code', q: 'morse code telegraph key', file: 'Telegraph key.jpg' },
  { id: 'ivt-barrage', q: 'newspaper close up text', file: 'Newspaper.jpg' },
  { id: 'ivt-stroop', q: 'colored pencils crayons', file: 'Colored pencils.jpg' },
  { id: 'ivt-compare', q: 'two identical apples', file: 'Apples.jpg' },
  { id: 'att-mix-focus', q: 'traffic lights', file: 'Traffic lights.jpg' },
  { id: 'att-mix-reading', q: 'person reading book library', file: 'Reading.jpg' },
  { id: 'att-mix-watch', q: 'stopwatch analog', file: 'Stopwatch.jpg' },
  { id: 'att-mix-recall', q: 'notebook pencil desk', file: 'Notebook.jpg' },
  { id: 'vis-accom', q: 'window view distant landscape', file: 'Window view.jpg' },
  { id: 'vis-pursuit', q: 'bird in flight', file: 'Bird in flight.jpg' },
  { id: 'vis-saccade', q: 'human eye closeup', file: 'Human eye.jpg' },
  { id: 'vis-blink', q: 'closed eyes rest', file: 'Closed eyes.jpg' },
];

async function wikiJson(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(2800 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }
  throw new Error('API 429 persistante');
}

function fromPages(data) {
  const pages = Object.values(data.query?.pages || {});
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const page of pages) {
    if (page.missing != null) continue;
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = String(info.mime || '');
    if (!/^image\/(jpeg|png|webp)$/i.test(mime)) continue;
    const src = info.thumburl || info.url;
    if (!src) continue;
    return { title: page.title, src, mime };
  }
  return null;
}

async function pickByTitle(fileName) {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '1400',
    format: 'json',
    origin: '*',
  });
  return fromPages(await wikiJson(`https://commons.wikimedia.org/w/api.php?${params}`));
}

async function pickBySearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '1400',
    format: 'json',
    origin: '*',
  });
  return fromPages(await wikiJson(`https://commons.wikimedia.org/w/api.php?${params}`));
}

async function pickFile(entry) {
  const byTitle = await pickByTitle(entry.file);
  if (byTitle) return byTitle;
  const bySearch = await pickBySearch(entry.q);
  if (bySearch) return bySearch;
  throw new Error(`Aucune photo pour ${entry.id} « ${entry.q} »`);
}

async function download(src, dest) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(src, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(2500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`DL ${res.status} ${src}`);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error(`Pas une image : ${type}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 6000) throw new Error('Fichier trop petit');
    await writeFile(dest, buf);
    return buf.length;
  }
  throw new Error(`DL 429 ${src}`);
}

await mkdir(OUT, { recursive: true });
const manifest = [];
for (let i = 0; i < GAMES.length; i += 1) {
  const g = GAMES[i];
  const destJpg = join(OUT, `${g.id}.jpg`);
  try {
    await access(destJpg);
    console.log(`skip ${g.id}`);
    manifest.push({ id: g.id, file: `/games/${g.id}.jpg` });
    continue;
  } catch {
    /* télécharger */
  }
  if (i) await sleep(1400);
  const file = await pickFile(g);
  const ext = file.mime.includes('png') ? 'png' : file.mime.includes('webp') ? 'webp' : 'jpg';
  const name = `${g.id}.${ext}`;
  const bytes = await download(file.src, join(OUT, name));
  manifest.push({ id: g.id, file: `/games/${name}`, source: file.title, bytes });
  console.log(`${g.id} ← ${file.title} (${bytes})`);
}
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`OK ${manifest.length}`);

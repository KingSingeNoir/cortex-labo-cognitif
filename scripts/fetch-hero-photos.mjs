/**
 * Télécharge 15 photos libres (Wikimedia Commons) : logique, intelligence, concentration.
 */
import { access } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'hero');
const UA = 'CORTEX-LaboCognitif/1.0 (atelier cognitif local ; photos Commons incrustées)';

const QUERIES = [
  { q: 'chess staunton', file: 'Chess game Staunton No. 6 perfil view 8.jpg' },
  { q: 'go board stones', file: 'Go (13×13) -- 2021 -- 6741.jpg' },
  { q: 'jigsaw puzzle', file: 'Jigsaw puzzle in progress.jpg' },
  { q: 'trinity college long room', file: 'Long Room Interior, Trinity College Dublin, Ireland - Diliff.jpg' },
  { q: 'hampton court maze', file: 'Hampton Court hedge maze.jpg' },
  { q: 'rubik cube', file: "Solved Rubik's cube.jpg" },
  { q: 'japanese soroban', file: 'Soroban.jpg' },
  { q: 'paper origami crane', file: 'Paper crane.jpg' },
  { q: 'chess players', file: 'Chess players.jpg' },
  { q: 'alhambra tiles', file: 'Alhambra tiles.jpg' },
  { q: 'milky way', file: 'ESO - Milky Way.jpg' },
  { q: 'compass', file: 'Kompass.jpg' },
  { q: 'sudoku', file: 'Sudoku.png' },
  { q: 'telescope', file: 'Telescope.jpg' },
  { q: 'reading book', file: 'Reading.jpg' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikiJson(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(2500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`API ${res.status} ${url}`);
    return res.json();
  }
  throw new Error(`API 429 persistante ${url}`);
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
    iiurlwidth: '1600',
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
    gsrlimit: '16',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '1600',
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
  throw new Error(`Aucune photo pour « ${entry.q} »`);
}

async function download(src, dest) {
  const res = await fetch(src, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`DL ${res.status} ${src}`);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`Pas une image : ${type} ${src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`Fichier trop petit ${src}`);
  await writeFile(dest, buf);
  return { bytes: buf.length, type };
}

await mkdir(OUT, { recursive: true });
const manifest = [];
for (let i = 0; i < QUERIES.length; i += 1) {
  const q = QUERIES[i];
  const n = String(i + 1).padStart(2, '0');
  const already = join(OUT, `${n}.jpg`);
  try {
    await access(already);
    if (i < 8) {
      console.log(`${n} déjà là, on garde`);
      manifest.push({ id: i, file: `/hero/${n}.jpg`, query: q.q, source: '(existant)', bytes: 0 });
      continue;
    }
  } catch {
    /* à télécharger */
  }
  if (i) await sleep(1200);
  const file = await pickFile(q);
  const ext = file.mime.includes('png') ? 'png' : file.mime.includes('webp') ? 'webp' : 'jpg';
  const name = `${n}.${ext}`;
  const dest = join(OUT, name);
  const saved = await download(file.src, dest);
  manifest.push({
    id: i,
    file: `/hero/${name}`,
    query: q.q,
    source: file.title,
    bytes: saved.bytes,
  });
  console.log(`${n} ${file.title} → ${name} (${saved.bytes} o)`);
}
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`OK ${manifest.length} photos`);

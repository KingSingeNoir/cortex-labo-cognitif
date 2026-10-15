// Vérification hors navigateur : rend quelques zones d’énigmes en PNG (même recadrage que PdfRegion).
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D, DOMMatrix, ImageData } from '@napi-rs/canvas';

Object.assign(globalThis, { Path2D, DOMMatrix, ImageData });
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

const root = path.resolve(import.meta.dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/enigmes/enigmesIndex.json'), 'utf8'));
const ids = process.argv.slice(2).map(Number);
const outDir = path.join(root, '.render-check');
fs.mkdirSync(outDir, { recursive: true });

const data = new Uint8Array(fs.readFileSync(path.join(root, 'public/enigmes/enonces.pdf')));
const pdf = await getDocument({ data, verbosity: 0 }).promise;
const scale = 2;

for (const id of ids) {
  const e = index.enigmes.find((x) => x.id === id);
  const seg = e.segments[0];
  const page = await pdf.getPage(seg.page);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil((seg.x1 - seg.x0) * scale), Math.ceil((seg.yTop - seg.yBottom) * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: ctx,
    viewport,
    transform: [1, 0, 0, 1, -seg.x0 * scale, -(base.height - seg.yTop) * scale],
  }).promise;
  const file = path.join(outDir, `enigme-${id}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(file, e.title);
}

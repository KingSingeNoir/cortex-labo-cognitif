import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const doc = await getDocument({ url: 'public/enigmes/enonces.pdf', verbosity: 0 }).promise;
console.log('pages', doc.numPages);
for (const p of [2, 3, 6]) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  console.log(`--- page ${p} (${vp.width}x${vp.height})`);
  tc.items.slice(0, 40).forEach((it) => {
    if (!it.str.trim()) return;
    console.log(Math.round(it.transform[5]), Math.round(it.height * 10) / 10, it.fontName, JSON.stringify(it.str.slice(0, 50)));
  });
}

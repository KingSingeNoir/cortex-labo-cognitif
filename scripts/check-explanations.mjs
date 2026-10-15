/** Vérifie que chaque énigme a une explication utilisable. */
import { readFileSync } from 'node:fs';

const enigmes = JSON.parse(readFileSync(new URL('../src/enigmes/enigmesIndex.json', import.meta.url), 'utf8'));
const parts = [];
for (let i = 1; i <= 10; i += 1) {
  const name = `part-${String(i).padStart(2, '0')}.json`;
  const data = JSON.parse(readFileSync(new URL(`../src/enigmes/explications/${name}`, import.meta.url), 'utf8'));
  parts.push(data);
}
const all = Object.assign({}, ...parts);
const missing = [];
const thin = [];
for (const e of enigmes.enigmes) {
  const paras = all[e.id] || all[String(e.id)];
  if (!Array.isArray(paras) || !paras.length) missing.push(e.id);
  else if (paras.join(' ').length < 180) thin.push(e.id);
}
console.log(`explications : ${Object.keys(all).length} / ${enigmes.count}`);
console.log(`manquantes : ${missing.length}${missing.length ? ` → ${missing.slice(0, 20).join(',')}` : ''}`);
console.log(`trop courtes : ${thin.length}`);
if (missing.length) process.exitCode = 1;

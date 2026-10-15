/** Exporte un fichier compact énoncé + corrigé officiel, pour rédiger les explications. */
import { writeFileSync, mkdirSync } from 'node:fs';

const enigmes = JSON.parse(
  (await import('node:fs')).readFileSync(new URL('../src/enigmes/enigmesIndex.json', import.meta.url), 'utf8')
);
const sols = JSON.parse(
  (await import('node:fs')).readFileSync(new URL('../src/enigmes/solutionsIndex.json', import.meta.url), 'utf8')
);

const byId = new Map(sols.solutions.map((s) => [s.id, s]));
const rows = enigmes.enigmes.map((e) => {
  const s = byId.get(e.id) || {};
  return {
    id: e.id,
    title: e.title,
    theme: e.theme,
    statement: (e.text || '').slice(0, 900),
    official: (s.text || '').slice(0, 1400),
    figureOnly: !(s.text || '').trim(),
  };
});

mkdirSync(new URL('../.tmp-explications', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../.tmp-explications/source.json', import.meta.url),
  JSON.stringify(rows)
);
const empty = rows.filter((r) => r.figureOnly).map((r) => r.id);
console.log(`source: ${rows.length} ; figures seules : ${empty.length} → ${empty.join(',')}`);

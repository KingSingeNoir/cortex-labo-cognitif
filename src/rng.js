/** RNG seedable (mulberry32) — rejouer une session à l’identique. */

export function createRng(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(rng, arr) {
  if (!arr?.length) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

export function newSessionSeed() {
  const t = Date.now() >>> 0;
  const r = (Math.random() * 0xffffffff) >>> 0;
  return (t ^ r) >>> 0;
}

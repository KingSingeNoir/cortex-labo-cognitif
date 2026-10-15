/** 15 photos libres incrustées. Alternance stricte, une par heure, en boucle. */
export const HERO_HOUR_MS = 60 * 60 * 1000;

export const HERO_PHOTOS = Object.freeze([
  '/hero/01.jpg',
  '/hero/02.jpg',
  '/hero/03.jpg',
  '/hero/04.jpg',
  '/hero/05.jpg',
  '/hero/06.jpg',
  '/hero/07.jpg',
  '/hero/08.jpg',
  '/hero/09.jpg',
  '/hero/10.jpg',
  '/hero/11.jpg',
  '/hero/12.jpg',
  '/hero/13.jpg',
  '/hero/14.jpg',
  '/hero/15.jpg',
]);

export function heroSlotAt(now = Date.now()) {
  const n = HERO_PHOTOS.length;
  const slot = Math.floor(now / HERO_HOUR_MS) % n;
  return ((slot % n) + n) % n;
}

import { loadJSON, saveJSON } from '../storage.js';

/** Progression du test psychotechnique — séparée de l’atelier cognitif. */
const KEY = 'COG_enigmes_v1';

/** Taille du catalogue (enigmesIndex.json) — pour classer sans charger le JSON. */
export const ENIGME_CATALOG_SIZE = 914;

/** Temps de recherche avant que la réponse puisse être ouverte — elle ne s’affiche pas seule. */
export const REVEAL_AFTER_MS = 90 * 1000;

export const ENIGME_STATUS = Object.freeze({
  NEW: 'nouvelle',
  SEEN: 'vue',
  SOLVED: 'resolue',
  MISSED: 'non-trouvee',
});

export function loadEnigmesProgress() {
  const raw = loadJSON(KEY, null);
  return {
    items: raw && typeof raw.items === 'object' && raw.items ? raw.items : {},
    lastId: Number(raw?.lastId) || null,
    events: Array.isArray(raw?.events) ? raw.events : [],
  };
}

function pushEvent(progress, event) {
  return {
    ...progress,
    events: [...(progress.events || []), { at: Date.now(), ...event }],
  };
}

export function saveEnigmesProgress(progress) {
  saveJSON(KEY, progress);
}

export function itemOf(progress, id) {
  return progress.items[id] || null;
}

export function statusOf(progress, id) {
  return progress.items[id]?.status || ENIGME_STATUS.NEW;
}

export function markSeen(progress, id) {
  const cur = progress.items[id];
  const now = Date.now();
  const next = {
    ...progress,
    lastId: id,
    items: {
      ...progress.items,
      [id]: cur
        ? { ...cur, lastSeenAt: now }
        : { status: ENIGME_STATUS.SEEN, firstSeenAt: now, lastSeenAt: now, timeMs: 0, revealed: false },
    },
  };
  return cur ? next : pushEvent(next, { id, kind: 'seen' });
}

export function addTime(progress, id, ms) {
  const cur = progress.items[id];
  if (!cur || ms <= 0) return progress;
  return {
    ...progress,
    items: { ...progress.items, [id]: { ...cur, timeMs: (cur.timeMs || 0) + ms } },
  };
}

export function setStatus(progress, id, status) {
  const cur = progress.items[id];
  if (!cur) return progress;
  const next = { ...progress, items: { ...progress.items, [id]: { ...cur, status } } };
  if (cur.status === status) return next;
  return pushEvent(next, { id, kind: 'verdict', status });
}

export function markRevealed(progress, id) {
  const cur = progress.items[id];
  if (!cur) return progress;
  const next = { ...progress, items: { ...progress.items, [id]: { ...cur, revealed: true } } };
  if (cur.revealed) return next;
  return pushEvent(next, { id, kind: 'revealed' });
}

export function summarizeEnigmes(progress, catalogSize = 0) {
  const items = Object.values(progress.items || {});
  const counts = {
    [ENIGME_STATUS.NEW]: Math.max(0, catalogSize - items.length),
    [ENIGME_STATUS.SEEN]: 0,
    [ENIGME_STATUS.SOLVED]: 0,
    [ENIGME_STATUS.MISSED]: 0,
  };
  let timeMs = 0;
  let revealed = 0;
  let lastAt = null;
  items.forEach((it) => {
    const st = it.status || ENIGME_STATUS.SEEN;
    if (counts[st] != null) counts[st] += 1;
    else counts[ENIGME_STATUS.SEEN] += 1;
    timeMs += Number(it.timeMs) || 0;
    if (it.revealed) revealed += 1;
    const t = Number(it.lastSeenAt) || Number(it.firstSeenAt) || null;
    if (t && (!lastAt || t > lastAt)) lastAt = t;
  });
  return {
    catalog: catalogSize,
    opened: items.length,
    seen: counts[ENIGME_STATUS.SEEN],
    solved: counts[ENIGME_STATUS.SOLVED],
    missed: counts[ENIGME_STATUS.MISSED],
    fresh: counts[ENIGME_STATUS.NEW],
    revealed,
    timeMs,
    lastAt,
    events: (progress.events || []).length,
  };
}

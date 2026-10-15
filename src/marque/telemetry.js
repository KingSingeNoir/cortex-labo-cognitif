import { loadJSON, saveJSON } from '../storage.js';

const CLIENT_KEY = 'COG_brand_client_v1';
const LOCAL_KEY = 'COG_brand_events_v1';

export function brandClientId() {
  let id = null;
  try {
    id = localStorage.getItem(CLIENT_KEY);
  } catch {
    id = null;
  }
  if (!id) {
    id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      localStorage.setItem(CLIENT_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

export function loadLocalBrandEvents() {
  const raw = loadJSON(LOCAL_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

export function emitBrand(type, payload = {}) {
  const event = {
    type: String(type || 'ping'),
    at: Date.now(),
    clientId: brandClientId(),
    payload: payload && typeof payload === 'object' ? payload : {},
  };
  const next = [...loadLocalBrandEvents(), event];
  saveJSON(LOCAL_KEY, next);
  fetch('/api/marque/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {});
  return event;
}

export function summarizeBrandEvents(events) {
  const list = Array.isArray(events) ? events : [];
  const clients = new Set();
  const days = new Set();
  let visits = 0;
  let sessions = 0;
  let trials = 0;
  let enigmes = 0;
  let accuracySum = 0;
  let accuracyN = 0;
  const byDomain = {};
  const byDay = {};
  const recent = [...list].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 20);

  list.forEach((ev) => {
    if (ev.clientId) clients.add(ev.clientId);
    if (ev.at) days.add(new Date(ev.at).toISOString().slice(0, 10));
    const day = ev.at ? new Date(ev.at).toISOString().slice(0, 10) : null;
    if (day) {
      if (!byDay[day]) byDay[day] = { day, n: 0 };
      byDay[day].n += 1;
    }
    if (ev.type === 'visit') visits += 1;
    if (ev.type === 'session') {
      sessions += 1;
      const acc = Number(ev.payload?.accuracy);
      if (Number.isFinite(acc)) {
        accuracySum += acc;
        accuracyN += 1;
      }
      (ev.payload?.domains || []).forEach((id) => {
        byDomain[id] = (byDomain[id] || 0) + 1;
      });
    }
    if (ev.type === 'trial') trials += 1;
    if (ev.type === 'enigme') enigmes += 1;
  });

  return {
    source: 'local',
    events: list.length,
    clients: clients.size,
    days: days.size,
    visits,
    sessions,
    trials,
    enigmes,
    accuracy: accuracyN ? accuracySum / accuracyN : null,
    byDomain,
    byDay: Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)),
    recent,
  };
}

export async function fetchBrandSummary() {
  try {
    const res = await fetch('/api/marque/summary', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('offline');
    const data = await res.json();
    return { ...data, source: 'server' };
  } catch {
    return { ...summarizeBrandEvents(loadLocalBrandEvents()), source: 'local' };
  }
}

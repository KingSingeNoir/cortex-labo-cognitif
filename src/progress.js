/**
 * Classement et lecture de la progression — une vérité par jeu, jamais jetée.
 * Toute fonction ici est pure : elle lit le store, elle n’écrit rien.
 */

import {
  COGNITIVE_DOMAINS,
  COGNITIVE_EXERCISES,
  getCognitiveExercise,
} from './catalog.js';

export function dayKey(at = Date.now()) {
  return new Date(at).toISOString().slice(0, 10);
}

function avg(rows, key = 'accuracy') {
  if (!rows.length) return null;
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0) / rows.length;
}

function pct(v) {
  return v == null ? null : Math.round(v * 100);
}

/** Première moitié vs dernière moitié : hausse, baisse, ou stable. */
export function trendOf(trials) {
  if (!trials || trials.length < 4) return 'early';
  const cut = Math.max(2, Math.floor(trials.length / 2));
  const first = avg(trials.slice(0, cut));
  const last = avg(trials.slice(-cut));
  if (first == null || last == null) return 'early';
  const d = last - first;
  if (d >= 0.08) return 'up';
  if (d <= -0.08) return 'down';
  return 'flat';
}

export const TREND_LABEL = Object.freeze({
  early: 'Encore trop tôt',
  up: 'En hausse',
  down: 'En baisse',
  flat: 'Stable',
});

/** Palier lisible, à partir du niveau actuel et du volume joué. */
export function palierOf(level, n) {
  if (!n) return 'jamais';
  if (n < 3) return 'decouverte';
  if (level <= 3) return 'amorce';
  if (level <= 6) return 'en-route';
  if (level <= 8) return 'solide';
  return 'maitrise';
}

export const PALIER_LABEL = Object.freeze({
  jamais: 'Pas encore joué',
  decouverte: 'Découverte',
  amorce: 'Amorce',
  'en-route': 'En route',
  solide: 'Solide',
  maitrise: 'Maîtrise',
});

function sortedTrials(ex) {
  return [...(ex?.trials || [])].sort((a, b) => (a.at || 0) - (b.at || 0));
}

export function summarizeExercise(store, exerciseId) {
  const meta = getCognitiveExercise(exerciseId);
  const ex = store.exercises?.[exerciseId] || {};
  const trials = sortedTrials(ex);
  const n = trials.length;
  const successes = trials.filter((t) => t.success).length;
  const first = trials.slice(0, Math.min(8, n));
  const recent = trials.slice(-Math.min(8, n));
  const level = Number(ex.difficulty) || 3;
  return {
    id: exerciseId,
    title: meta?.title || exerciseId,
    domainId: meta?.domainId || null,
    n,
    successes,
    accuracy: avg(trials),
    accuracyFirst: avg(first),
    accuracyRecent: avg(recent),
    trend: trendOf(trials),
    level,
    palier: palierOf(level, n),
    xp: Math.max(0, Number(ex.xp) || 0),
    firstAt: Number(ex.firstPlayedAt) || trials[0]?.at || null,
    lastAt: Number(ex.lastPlayedAt) || trials[n - 1]?.at || null,
  };
}

export function summarizeDomain(store, domain) {
  const games = domain.exercises.map((ex) => summarizeExercise(store, ex.id));
  const played = games.filter((g) => g.n > 0);
  const trials = played.flatMap((g) => store.exercises?.[g.id]?.trials || []);
  const levels = played.map((g) => g.level);
  return {
    id: domain.id,
    title: domain.title,
    games,
    played: played.length,
    total: games.length,
    n: trials.length,
    accuracy: avg(trials),
    level: levels.length ? Math.round(levels.reduce((a, n) => a + n, 0) / levels.length) : 3,
    trend: trendOf(sortedTrials({ trials })),
    lastAt: played.reduce((max, g) => Math.max(max, g.lastAt || 0), 0) || null,
  };
}

export function summarizeGlobal(store) {
  const domains = COGNITIVE_DOMAINS.map((d) => summarizeDomain(store, d));
  const games = COGNITIVE_EXERCISES.map((ex) => summarizeExercise(store, ex.id));
  const played = games.filter((g) => g.n > 0);
  const allTrials = played.flatMap((g) => store.exercises?.[g.id]?.trials || []);
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  const visitDays = new Set((store.visits || []).map((v) => v.day));
  allTrials.forEach((t) => {
    if (t?.at) visitDays.add(dayKey(t.at));
  });
  sessions.forEach((s) => {
    if (s?.startedAt) visitDays.add(dayKey(s.startedAt));
    if (s?.day) visitDays.add(s.day);
  });

  const byDay = {};
  allTrials.forEach((t) => {
    if (!t?.at) return;
    const day = dayKey(t.at);
    if (!byDay[day]) byDay[day] = { day, n: 0, acc: 0, ok: 0 };
    byDay[day].n += 1;
    byDay[day].acc += Number(t.accuracy) || 0;
    if (t.success) byDay[day].ok += 1;
  });
  const days = Object.values(byDay)
    .map((d) => ({
      ...d,
      accuracy: d.n ? d.acc / d.n : null,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    domains,
    games,
    played: played.length,
    catalog: games.length,
    trials: allTrials.length,
    successes: allTrials.filter((t) => t.success).length,
    accuracy: avg(allTrials),
    trend: trendOf(sortedTrials({ trials: allTrials })),
    sessions: sessions.length,
    daysActive: visitDays.size,
    xp: played.reduce((a, g) => a + g.xp, 0),
    lastAt: played.reduce((max, g) => Math.max(max, g.lastAt || 0), 0) || null,
    days,
    recentSessions: [...sessions]
      .filter((s) => (s.trialCount || 0) > 0)
      .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
      .slice(0, 12),
  };
}

export function formatDay(iso, now = Date.now()) {
  if (!iso) return '—';
  const today = dayKey(now);
  const y = new Date(now - 86400000).toISOString().slice(0, 10);
  if (iso === today) return 'aujourd’hui';
  if (iso === y) return 'hier';
  const [Y, M, D] = iso.split('-');
  return `${Number(D)} ${['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][Number(M) - 1]} ${Y}`;
}

export function formatWhen(at, now = Date.now()) {
  if (!at) return '—';
  return formatDay(dayKey(at), now);
}

export function formatPct(v) {
  const p = pct(v);
  return p == null ? '—' : `${p} %`;
}

export function recentTrialsOf(store, limit = 24) {
  return Object.entries(store?.exercises || {})
    .flatMap(([exerciseId, ex]) =>
      (ex?.trials || []).map((t) => ({ ...t, exerciseId }))
    )
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, limit);
}

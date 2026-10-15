import { loadJSON, saveJSON } from './storage.js';
import { scopedKey } from './cloud/scope.js';
import {
  COGNITIVE_EXERCISES,
  DEFAULT_ROUNDS_PER_GAME,
  ROUNDS_PER_GAME_OPTIONS,
} from './catalog.js';
import { clampDifficulty } from './staircase.js';

export const COGNITIVE_STORE_VERSION = 3;
const STORE_KEY = 'COG_atelier_v1';

const LEGACY_FOLD = Object.freeze({
  'att-mix-focus': ['att-focus', 'basc-switch'],
  'att-mix-reading': ['att-reading', 'basc-watch'],
  'att-mix-watch': ['att-mot', 'basc-priority', 'basc-watch'],
  'att-mix-recall': ['att-breath', 'basc-recall'],
});

function foldLegacyExercise(rawExercises, id, current) {
  const legacyIds = LEGACY_FOLD[id];
  if (!legacyIds || (current.xp > 0 && current.trials.length)) return current;
  let difficulty = current.difficulty;
  let streakUp = current.streakUp;
  let xp = current.xp;
  let trials = [...current.trials];
  legacyIds.forEach((lid) => {
    const src = rawExercises?.[lid];
    if (!src || typeof src !== 'object') return;
    difficulty = Math.max(difficulty, clampDifficulty(src.difficulty));
    streakUp = Math.max(streakUp, Number(src.streakUp) || 0);
    xp += Math.max(0, Number(src.xp) || 0);
    if (Array.isArray(src.trials)) trials = trials.concat(src.trials);
  });
  return {
    difficulty: clampDifficulty(difficulty),
    streakUp,
    xp,
    firstPlayedAt: current.firstPlayedAt || null,
    lastPlayedAt: current.lastPlayedAt || null,
    trials,
  };
}

export function emptyElo() {
  return { global: 1000, byId: {} };
}

/** Indice interne calé sur 100 à 1000 points de cote — ce n’est pas un QI clinique. */
export function eloToIndex(elo) {
  return Math.max(70, Math.min(160, Math.round(100 + ((Number(elo) - 1000) / 200) * 15)));
}

export function applyElo(store, exerciseId, { success, rtMs, difficulty }) {
  const K = 32;
  const item = 800 + (Number(difficulty) || 3) * 40;
  const elo = store.elo?.global ?? 1000;
  const expected = 1 / (1 + 10 ** ((item - elo) / 400));
  const timeBonus = success && Number(rtMs) < 15000 ? 0.1 : 0;
  const actual = success ? Math.min(1, 1 + timeBonus) : 0;
  const delta = K * (actual - expected);
  const prevLocal = store.elo?.byId?.[exerciseId] ?? 1000;
  return {
    ...store,
    elo: {
      global: Math.max(600, elo + delta),
      byId: {
        ...(store.elo?.byId || {}),
        [exerciseId]: Math.max(600, prevLocal + delta),
      },
    },
  };
}

export function emptyCognitiveStore() {
  const exercises = {};
  COGNITIVE_EXERCISES.forEach((ex) => {
    exercises[ex.id] = {
      difficulty: 3,
      streakUp: 0,
      xp: 0,
      firstPlayedAt: null,
      lastPlayedAt: null,
      trials: [],
    };
  });
  return {
    version: COGNITIVE_STORE_VERSION,
    reduceStimuli: false,
    prefs: { plan: [], roundsPerGame: DEFAULT_ROUNDS_PER_GAME },
    elo: emptyElo(),
    exercises,
    sessions: [],
    visits: [],
    lastVisitAt: null,
  };
}

const KNOWN_IDS = new Set(COGNITIVE_EXERCISES.map((ex) => ex.id));

function sanitizePrefs(raw) {
  const plan = Array.isArray(raw?.plan)
    ? [...new Set(raw.plan.filter((id) => KNOWN_IDS.has(id)))]
    : [];
  const rounds = Number(raw?.roundsPerGame);
  return {
    plan,
    roundsPerGame: ROUNDS_PER_GAME_OPTIONS.includes(rounds)
      ? rounds
      : DEFAULT_ROUNDS_PER_GAME,
  };
}

export function hydrateCognitiveStore(raw) {
  const base = emptyCognitiveStore();
  if (!raw || typeof raw !== 'object' || !raw.exercises) return base;
  const exercises = { ...base.exercises };
  COGNITIVE_EXERCISES.forEach((ex) => {
    const src = raw.exercises?.[ex.id];
    exercises[ex.id] = foldLegacyExercise(raw.exercises, ex.id, {
      difficulty: clampDifficulty(src?.difficulty ?? 3),
      streakUp: Math.max(0, Number(src?.streakUp) || 0),
      xp: Math.max(0, Number(src?.xp) || 0),
      firstPlayedAt: Number(src?.firstPlayedAt) || null,
      lastPlayedAt: Number(src?.lastPlayedAt) || null,
      trials: Array.isArray(src?.trials) ? src.trials : [],
    });
  });
  const rawElo = raw.elo && typeof raw.elo === 'object' ? raw.elo : {};
  return {
    version: COGNITIVE_STORE_VERSION,
    reduceStimuli: Boolean(raw.reduceStimuli),
    prefs: sanitizePrefs(raw.prefs),
    elo: {
      global: Math.max(600, Number(rawElo.global) || 1000),
      byId: rawElo.byId && typeof rawElo.byId === 'object' ? rawElo.byId : {},
    },
    exercises,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    visits: Array.isArray(raw.visits) ? raw.visits : [],
    lastVisitAt: Number(raw.lastVisitAt) || null,
  };
}

export function loadCognitiveStore() {
  return hydrateCognitiveStore(loadJSON(scopedKey(STORE_KEY), null));
}

export function saveCognitiveStore(store, { skipFlush } = {}) {
  saveJSON(scopedKey(STORE_KEY), store);
  if (!skipFlush) {
    import('./cloud/sync.js').then((m) => m.scheduleCloudFlush()).catch(() => {});
  }
}

export function setCognitiveReduceStimuli(value) {
  const store = loadCognitiveStore();
  store.reduceStimuli = Boolean(value);
  saveCognitiveStore(store);
  return store;
}

export function setCognitivePrefs(patch) {
  const store = loadCognitiveStore();
  store.prefs = sanitizePrefs({ ...store.prefs, ...patch });
  saveCognitiveStore(store);
  return store;
}

export function recordCognitiveTrial(store, exerciseId, trial) {
  const next = {
    ...store,
    exercises: { ...store.exercises },
  };
  const cur = next.exercises[exerciseId] || {
    difficulty: 3,
    streakUp: 0,
    xp: 0,
    trials: [],
  };
  const at = Number(trial.at) || Date.now();
  next.exercises[exerciseId] = {
    ...cur,
    difficulty: trial.difficulty,
    streakUp: trial.streakUp,
    xp: (cur.xp || 0) + (trial.xp || 0),
    firstPlayedAt: cur.firstPlayedAt || at,
    lastPlayedAt: at,
    trials: [...(cur.trials || []), trial],
  };
  return applyElo(next, exerciseId, {
    success: trial.success,
    rtMs: trial.rtMs,
    difficulty: trial.levelBefore || trial.difficulty,
  });
}

export function recordCognitiveSession(store, session) {
  return {
    ...store,
    sessions: [...(store.sessions || []), session],
  };
}

export function touchCognitiveVisit(now = Date.now()) {
  const store = loadCognitiveStore();
  const day = new Date(now).toISOString().slice(0, 10);
  const visits = Array.isArray(store.visits) ? store.visits : [];
  if (visits.some((v) => v.day === day)) {
    return { ...store, lastVisitAt: now };
  }
  const next = {
    ...store,
    lastVisitAt: now,
    visits: [...visits, { day, at: now }],
  };
  saveCognitiveStore(next);
  return next;
}

export function exportCognitiveJson(store = loadCognitiveStore()) {
  return JSON.stringify(
    {
      kind: 'atelier_cognitif_export',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      ...store,
    },
    null,
    2
  );
}

export function personalAverageAccuracy(store, exerciseId) {
  const trials = store.exercises?.[exerciseId]?.trials || [];
  if (!trials.length) return null;
  const recent = trials.slice(-30);
  const sum = recent.reduce((acc, t) => acc + (Number(t.accuracy) || 0), 0);
  return sum / recent.length;
}

export function domainMastery30d(store, domainId, now = Date.now()) {
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const ids = COGNITIVE_EXERCISES.filter((ex) => ex.domainId === domainId).map(
    (ex) => ex.id
  );
  const byDay = {};
  ids.forEach((id) => {
    (store.exercises?.[id]?.trials || []).forEach((t) => {
      if (!t?.at || t.at < cutoff) return;
      const day = new Date(t.at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { n: 0, acc: 0 };
      byDay[day].n += 1;
      byDay[day].acc += Number(t.accuracy) || 0;
    });
  });
  const days = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const cell = byDay[d];
    days.push({
      day: d,
      accuracy: cell ? cell.acc / cell.n : null,
      n: cell?.n || 0,
    });
  }
  const filled = days.filter((d) => d.accuracy != null);
  const mean =
    filled.length === 0
      ? null
      : filled.reduce((a, d) => a + d.accuracy, 0) / filled.length;
  return { days, mean, trials: filled.reduce((a, d) => a + d.n, 0) };
}

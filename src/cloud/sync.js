import { api } from './api.js';
import { getActiveAccountId } from './scope.js';
import { loadCognitiveStore, saveCognitiveStore } from '../persist.js';
import { loadEnigmesProgress, saveEnigmesProgress } from '../enigmes/enigmesStore.js';

let timer = null;
let inflight = false;

function hasCloudPayload(state) {
  return Boolean(state?.cognitive || state?.enigmes);
}

export async function pullAccountCloud() {
  const remote = await api('/v1/account/state');
  const localCog = loadCognitiveStore();
  const localEni = loadEnigmesProgress();
  if (!hasCloudPayload(remote)) {
    await api('/v1/account/state', {
      method: 'PUT',
      body: { cognitive: localCog, enigmes: localEni },
    });
    return { cognitive: localCog, enigmes: localEni, updatedAt: Date.now() };
  }
  if (remote.cognitive) saveCognitiveStore(remote.cognitive, { skipFlush: true });
  if (remote.enigmes) saveEnigmesProgress(remote.enigmes, { skipFlush: true });
  return remote;
}

export async function flushAccountCloudNow() {
  if (!getActiveAccountId() || inflight) return;
  inflight = true;
  try {
    await api('/v1/account/state', {
      method: 'PUT',
      body: {
        cognitive: loadCognitiveStore(),
        enigmes: loadEnigmesProgress(),
      },
    });
  } catch {
    /* hors-ligne : le cache local reste la file d’attente */
  } finally {
    inflight = false;
  }
}

export function scheduleCloudFlush() {
  if (!getActiveAccountId()) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    flushAccountCloudNow();
  }, 400);
}

export async function pushAccountEvent(event) {
  if (!getActiveAccountId()) return;
  try {
    await api('/v1/account/event', { method: 'POST', body: event, silent: true });
  } catch {
    /* ignore */
  }
}

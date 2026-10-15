import { api, readToken, writeToken } from './api.js';
import { setActiveAccountId } from './scope.js';
import { pullAccountCloud } from './sync.js';
import { loadJSON, saveJSON } from '../storage.js';

const LEGACY_COG = 'COG_atelier_v1';
const LEGACY_ENI = 'COG_enigmes_v1';

function adoptLegacyIfNeeded(accountId) {
  if (!accountId) return;
  const scopedCog = loadJSON(`${LEGACY_COG}::${accountId}`, null);
  if (!scopedCog) {
    const orphan = loadJSON(LEGACY_COG, null);
    if (orphan && typeof orphan === 'object') {
      saveJSON(`${LEGACY_COG}::${accountId}`, orphan);
    }
  }
  const scopedEni = loadJSON(`${LEGACY_ENI}::${accountId}`, null);
  if (!scopedEni) {
    const orphanEni = loadJSON(LEGACY_ENI, null);
    if (orphanEni && typeof orphanEni === 'object') {
      saveJSON(`${LEGACY_ENI}::${accountId}`, orphanEni);
    }
  }
}

export async function hydrateSession() {
  if (!readToken()) return null;
  try {
    const me = await api('/v1/auth/me');
    setActiveAccountId(me.account.id);
    adoptLegacyIfNeeded(me.account.id);
    await pullAccountCloud();
    return me.account;
  } catch {
    writeToken('');
    setActiveAccountId(null);
    return null;
  }
}

export async function login({ email, password }) {
  const out = await api('/v1/auth/login', { method: 'POST', body: { email, password } });
  writeToken(out.token);
  setActiveAccountId(out.account.id);
  adoptLegacyIfNeeded(out.account.id);
  await pullAccountCloud();
  return out.account;
}

export async function register({ email, password, displayName }) {
  const out = await api('/v1/auth/register', {
    method: 'POST',
    body: { email, password, displayName },
  });
  writeToken(out.token);
  setActiveAccountId(out.account.id);
  adoptLegacyIfNeeded(out.account.id);
  await pullAccountCloud();
  return out.account;
}

export async function logout() {
  try {
    await api('/v1/auth/logout', { method: 'POST', silent: true });
  } catch {
    /* ignore */
  }
  writeToken('');
  setActiveAccountId(null);
}

export async function requestReset(email) {
  return api('/v1/auth/forgot', {
    method: 'POST',
    body: { email, origin: window.location.origin },
  });
}

export async function confirmReset({ token, password }) {
  return api('/v1/auth/reset', { method: 'POST', body: { token, password } });
}

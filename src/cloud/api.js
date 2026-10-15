const TOKEN_KEY = 'COG_session_v1';

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function api(path, { method = 'GET', body, silent } = {}) {
  const headers = { Accept: 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    if (!silent) throw err;
    return { error: err.message, status: res.status, data };
  }
  return data;
}

export function authHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

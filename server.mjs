/**
 * CORTEX — API + fichiers statiques.
 * Dev : API seule sur 4110 (Vite :4100 proxifie /v1).
 * Prod : npm run build && npm run server → :4100
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bootPlatform,
  registerAccount,
  loginAccount,
  logoutToken,
  sessionFromToken,
  tokenFromRequest,
  loadAccountState,
  saveAccountState,
  appendAccountEvent,
  listAccounts,
  listAccountsWithState,
  getAccount,
  patchAccount,
  queueMail,
  listMail,
  health,
  exportAccount,
  requestPasswordReset,
  resetPassword,
} from './server/platform.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(DIR, 'dist');
const API_ONLY = process.env.CORTEX_API_ONLY === '1' || process.argv.includes('--api');
const PORT = Number(process.env.PORT || (API_ONLY ? 4110 : 4100));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

bootPlatform();

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORTEX_CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    ...corsHeaders(),
  });
  res.end(payload);
}

function setSessionCookie(res, token) {
  const parts = [
    `cortex_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 3600}`,
  ];
  if (process.env.CORTEX_SECURE_COOKIE === '1' || process.env.VERCEL) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'cortex_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function readBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string' && req.body) {
    return Promise.resolve(JSON.parse(req.body));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON invalide'));
      }
    });
    req.on('error', reject);
  });
}

function requireAuth(req) {
  return sessionFromToken(tokenFromRequest(req));
}

function requireAdmin(req) {
  const auth = requireAuth(req);
  if (!auth) return { error: 'Connectez-vous.', code: 401 };
  if (auth.account.role !== 'admin') return { error: 'Réservé à l’administrateur.', code: 403 };
  return auth;
}

async function handleApi(req, res, urlPath) {
  const method = req.method || 'GET';

  if (method === 'GET' && urlPath === '/v1/health') {
    send(res, 200, health());
    return;
  }

  if (method === 'POST' && urlPath === '/v1/auth/register') {
    const body = await readBody(req);
    const out = registerAccount(body);
    if (out.error) {
      send(res, out.code, { error: out.error });
      return;
    }
    setSessionCookie(res, out.token);
    send(res, 200, out);
    return;
  }

  if (method === 'POST' && urlPath === '/v1/auth/login') {
    const body = await readBody(req);
    const out = loginAccount(body);
    if (out.error) {
      send(res, out.code, { error: out.error });
      return;
    }
    setSessionCookie(res, out.token);
    send(res, 200, out);
    return;
  }

  if (method === 'POST' && urlPath === '/v1/auth/logout') {
    logoutToken(tokenFromRequest(req));
    clearSessionCookie(res);
    send(res, 200, { ok: true });
    return;
  }

  if (method === 'POST' && urlPath === '/v1/auth/forgot') {
    const body = await readBody(req);
    const origin = body.origin || req.headers.origin || '';
    send(res, 200, await requestPasswordReset(body.email, origin));
    return;
  }

  if (method === 'POST' && urlPath === '/v1/auth/reset') {
    const body = await readBody(req);
    const out = await resetPassword(body);
    if (out.error) {
      send(res, out.code, { error: out.error });
      return;
    }
    send(res, 200, out);
    return;
  }

  if (method === 'GET' && urlPath === '/v1/auth/me') {
    const auth = requireAuth(req);
    if (!auth) {
      send(res, 401, { error: 'Session absente.' });
      return;
    }
    send(res, 200, { account: auth.account });
    return;
  }

  if (urlPath === '/v1/account/state') {
    const auth = requireAuth(req);
    if (!auth) {
      send(res, 401, { error: 'Connectez-vous.' });
      return;
    }
    if (method === 'GET') {
      send(res, 200, loadAccountState(auth.account.id));
      return;
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      send(res, 200, saveAccountState(auth.account.id, body));
      return;
    }
  }

  if (method === 'POST' && urlPath === '/v1/account/event') {
    const auth = requireAuth(req);
    if (!auth) {
      send(res, 401, { error: 'Connectez-vous.' });
      return;
    }
    const body = await readBody(req);
    send(res, 200, appendAccountEvent(auth.account.id, body || {}));
    return;
  }

  if (method === 'GET' && urlPath === '/v1/admin/accounts') {
    const admin = requireAdmin(req);
    if (admin.error) {
      send(res, admin.code, { error: admin.error });
      return;
    }
    send(res, 200, { accounts: listAccounts() });
    return;
  }

  if (method === 'GET' && urlPath === '/v1/admin/suivi') {
    const admin = requireAdmin(req);
    if (admin.error) {
      send(res, admin.code, { error: admin.error });
      return;
    }
    send(res, 200, { accounts: listAccountsWithState() });
    return;
  }

  const accMatch = urlPath.match(/^\/v1\/admin\/accounts\/([^/]+)$/);
  if (accMatch) {
    const admin = requireAdmin(req);
    if (admin.error) {
      send(res, admin.code, { error: admin.error });
      return;
    }
    const id = decodeURIComponent(accMatch[1]);
    if (method === 'GET') {
      const account = getAccount(id);
      if (!account) {
        send(res, 404, { error: 'Compte introuvable.' });
        return;
      }
      send(res, 200, { account, state: loadAccountState(id), archive: exportAccount(id).archive });
      return;
    }
    if (method === 'PATCH') {
      const body = await readBody(req);
      const out = patchAccount(id, body);
      if (out.error) {
        send(res, out.code, { error: out.error });
        return;
      }
      send(res, 200, out);
      return;
    }
  }

  const exportMatch = urlPath.match(/^\/v1\/admin\/accounts\/([^/]+)\/export$/);
  if (method === 'GET' && exportMatch) {
    const admin = requireAdmin(req);
    if (admin.error) {
      send(res, admin.code, { error: admin.error });
      return;
    }
    send(res, 200, exportAccount(decodeURIComponent(exportMatch[1])));
    return;
  }

  if (urlPath === '/v1/admin/mail') {
    const admin = requireAdmin(req);
    if (admin.error) {
      send(res, admin.code, { error: admin.error });
      return;
    }
    if (method === 'GET') {
      send(res, 200, { messages: listMail() });
      return;
    }
    if (method === 'POST') {
      const body = await readBody(req);
      if (!body.to || !body.subject) {
        send(res, 400, { error: 'Destinataire et objet sont requis.' });
        return;
      }
      const rec = await queueMail(body);
      send(res, 200, rec);
      return;
    }
  }

  send(res, 404, { error: 'Route inconnue.' });
}

function serveStatic(req, res, urlPath) {
  if (!fs.existsSync(DIST)) {
    send(res, 503, { error: 'Build manquant. Lancez npm run build.' });
    return;
  }
  let file = path.normalize(path.join(DIST, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(DIST)) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  const ext = path.extname(file);
  send(res, 200, fs.readFileSync(file), TYPES[ext] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }
    if (urlPath.startsWith('/v1/')) {
      await handleApi(req, res, urlPath);
      return;
    }
    if (API_ONLY) {
      send(res, 404, { error: 'API seule — l’interface est sur le port 4100.' });
      return;
    }
    serveStatic(req, res, urlPath);
  } catch (err) {
    send(res, 500, { error: String(err?.message || err) });
  }
});

export { handleApi, corsHeaders };

if (!process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    const mode = API_ONLY ? 'API' : 'API + interface';
    console.log(`CORTEX ${mode} → http://localhost:${PORT}`);
  });
}

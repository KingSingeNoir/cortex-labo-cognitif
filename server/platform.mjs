/**
 * Plateforme CORTEX — indépendante de T3US.
 * Un compte = son archive. Sync temps réel = sauvegarde indéfinie.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'cortex-data')
  : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.cortex-data');
const ROOT = process.env.CORTEX_DATA_DIR || DEFAULT_ROOT;
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');
const SESSIONS_FILE = path.join(ROOT, 'sessions.json');
const MAIL_FILE = path.join(ROOT, 'mail.json');
const RESETS_FILE = path.join(ROOT, 'resets.json');
const STATES_DIR = path.join(ROOT, 'states');
const ARCHIVES_DIR = path.join(ROOT, 'archives');

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 8;

function ensureDirs() {
  [ROOT, STATES_DIR, ARCHIVES_DIR].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function now() {
  return Date.now();
}

function newId(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, hash) {
  const next = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(next, 'hex'), Buffer.from(hash, 'hex'));
}

function loadAccounts() {
  ensureDirs();
  const raw = readJson(ACCOUNTS_FILE, { accounts: [] });
  return Array.isArray(raw.accounts) ? raw.accounts : [];
}

function saveAccounts(accounts) {
  writeJson(ACCOUNTS_FILE, { accounts });
}

function loadSessions() {
  const raw = readJson(SESSIONS_FILE, { sessions: [] });
  const sessions = (Array.isArray(raw.sessions) ? raw.sessions : []).filter(
    (s) => s.expiresAt > now()
  );
  return sessions;
}

function saveSessions(sessions) {
  writeJson(SESSIONS_FILE, { sessions });
}

function loadResets() {
  const raw = readJson(RESETS_FILE, { tokens: [] });
  return (Array.isArray(raw.tokens) ? raw.tokens : []).filter((t) => t.expiresAt > now());
}

function saveResets(tokens) {
  writeJson(RESETS_FILE, { tokens });
}

function loadMail() {
  const raw = readJson(MAIL_FILE, { messages: [] });
  return Array.isArray(raw.messages) ? raw.messages : [];
}

function saveMail(messages) {
  writeJson(MAIL_FILE, { messages });
}

function publicAccount(acc) {
  if (!acc) return null;
  return {
    id: acc.id,
    email: acc.email,
    displayName: acc.displayName,
    role: acc.role,
    status: acc.status,
    createdAt: acc.createdAt,
    lastLoginAt: acc.lastLoginAt,
    lastSeenAt: acc.lastSeenAt,
  };
}

function seedAdmin() {
  const accounts = loadAccounts();
  if (accounts.some((a) => a.role === 'admin')) return;
  const email = normalizeEmail(process.env.CORTEX_ADMIN_EMAIL || 'admin@cortex.local');
  const password = process.env.CORTEX_ADMIN_PASSWORD || 'cortex-admin';
  const { hash, salt } = hashPassword(password);
  accounts.push({
    id: 'acc-admin',
    email,
    displayName: 'Administrateur CORTEX',
    role: 'admin',
    status: 'active',
    passwordHash: hash,
    salt,
    createdAt: now(),
    lastLoginAt: null,
    lastSeenAt: null,
  });
  saveAccounts(accounts);
}

export function bootPlatform() {
  ensureDirs();
  seedAdmin();
}

const loginFails = new Map();

function locked(email) {
  const row = loginFails.get(email);
  if (!row) return false;
  if (now() - row.at > LOGIN_WINDOW_MS) {
    loginFails.delete(email);
    return false;
  }
  return row.n >= LOGIN_MAX;
}

function noteFail(email) {
  const row = loginFails.get(email) || { n: 0, at: now() };
  row.n += 1;
  row.at = now();
  loginFails.set(email, row);
}

function noteOk(email) {
  loginFails.delete(email);
}

export function registerAccount({ email, password, displayName }) {
  const mail = normalizeEmail(email);
  if (!validEmail(mail)) return { error: 'Indiquez une adresse e-mail valide.', code: 400 };
  if (String(password || '').length < 8) {
    return { error: 'Le mot de passe doit faire au moins 8 caractères.', code: 400 };
  }
  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === mail)) {
    return { error: 'Un compte existe déjà avec cette adresse.', code: 409 };
  }
  const { hash, salt } = hashPassword(password);
  const acc = {
    id: newId('acc'),
    email: mail,
    displayName: String(displayName || mail.split('@')[0]).slice(0, 80),
    role: 'apprenant',
    status: 'active',
    passwordHash: hash,
    salt,
    createdAt: now(),
    lastLoginAt: now(),
    lastSeenAt: now(),
  };
  accounts.push(acc);
  saveAccounts(accounts);
  const session = createSession(acc);
  queueMail({
    to: mail,
    subject: 'Bienvenue sur CORTEX',
    text: `Bonjour ${acc.displayName},\n\nVotre compte CORTEX est créé. Vos entraînements sont sauvegardés sur ce compte, sans limite de durée.\n\nÀ bientôt.`,
    accountId: acc.id,
    kind: 'welcome',
  });
  return { account: publicAccount(acc), token: session.token };
}

export function loginAccount({ email, password }) {
  const mail = normalizeEmail(email);
  if (locked(mail)) {
    return { error: 'Trop de tentatives. Réessayez dans quelques minutes.', code: 429 };
  }
  const acc = loadAccounts().find((a) => a.email === mail);
  if (!acc || !verifyPassword(password, acc.salt, acc.passwordHash)) {
    noteFail(mail);
    return { error: 'Adresse ou mot de passe incorrect.', code: 401 };
  }
  if (acc.status === 'disabled') {
    return { error: 'Ce compte a été désactivé par l’administrateur.', code: 403 };
  }
  noteOk(mail);
  acc.lastLoginAt = now();
  acc.lastSeenAt = now();
  saveAccounts(loadAccounts().map((a) => (a.id === acc.id ? acc : a)));
  const session = createSession(acc);
  return { account: publicAccount(acc), token: session.token };
}

function createSession(acc) {
  const sessions = loadSessions();
  const token = crypto.randomBytes(24).toString('hex');
  const session = {
    token,
    accountId: acc.id,
    role: acc.role,
    createdAt: now(),
    expiresAt: now() + SESSION_MS,
  };
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

export function logoutToken(token) {
  if (!token) return;
  saveSessions(loadSessions().filter((s) => s.token !== token));
}

export function sessionFromToken(token) {
  if (!token) return null;
  const session = loadSessions().find((s) => s.token === token);
  if (!session) return null;
  const acc = loadAccounts().find((a) => a.id === session.accountId);
  if (!acc || acc.status === 'disabled') return null;
  acc.lastSeenAt = now();
  saveAccounts(loadAccounts().map((a) => (a.id === acc.id ? acc : a)));
  return { session, account: publicAccount(acc) };
}

export function tokenFromRequest(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const cookie = String(req.headers.cookie || '');
  const m = cookie.match(/(?:^|;\s*)cortex_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function statePath(accountId) {
  return path.join(STATES_DIR, `${accountId}.json`);
}

function archivePath(accountId) {
  return path.join(ARCHIVES_DIR, `${accountId}.json`);
}

export function loadAccountState(accountId) {
  return readJson(statePath(accountId), {
    accountId,
    cognitive: null,
    enigmes: null,
    updatedAt: null,
  });
}

export function saveAccountState(accountId, payload) {
  const prev = loadAccountState(accountId);
  const next = {
    accountId,
    cognitive: payload.cognitive ?? prev.cognitive,
    enigmes: payload.enigmes ?? prev.enigmes,
    updatedAt: now(),
  };
  writeJson(statePath(accountId), next);
  const archive = readJson(archivePath(accountId), { accountId, events: [] });
  archive.events = [
    ...(archive.events || []),
    { at: next.updatedAt, kind: 'state', bytes: JSON.stringify(next).length },
  ];
  writeJson(archivePath(accountId), archive);
  return next;
}

export function appendAccountEvent(accountId, event) {
  const archive = readJson(archivePath(accountId), { accountId, events: [] });
  archive.events = [...(archive.events || []), { at: now(), ...event }];
  writeJson(archivePath(accountId), archive);
  return archive;
}

export function loadArchive(accountId) {
  return readJson(archivePath(accountId), { accountId, events: [] });
}

export function listAccounts() {
  return loadAccounts().map(publicAccount);
}

export function listAccountsWithState() {
  return loadAccounts().map((acc) => ({
    account: publicAccount(acc),
    state: loadAccountState(acc.id),
  }));
}

export function getAccount(id) {
  return publicAccount(loadAccounts().find((a) => a.id === id));
}

export function patchAccount(id, patch) {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx < 0) return { error: 'Compte introuvable.', code: 404 };
  const acc = accounts[idx];
  if (patch.displayName) acc.displayName = String(patch.displayName).slice(0, 80);
  if (patch.status === 'active' || patch.status === 'disabled') acc.status = patch.status;
  if (patch.role === 'admin' || patch.role === 'apprenant') acc.role = patch.role;
  if (patch.password && String(patch.password).length >= 8) {
    const { hash, salt } = hashPassword(patch.password);
    acc.passwordHash = hash;
    acc.salt = salt;
  }
  accounts[idx] = acc;
  saveAccounts(accounts);
  return { account: publicAccount(acc) };
}

export async function queueMail({ to, subject, text, accountId = null, kind = 'manual' }) {
  const messages = loadMail();
  const rec = {
    id: newId('mail'),
    at: now(),
    to: normalizeEmail(to),
    subject: String(subject || '').slice(0, 200),
    text: String(text || ''),
    accountId,
    kind,
    status: 'logged',
  };
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === '1',
        auth:
          process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
            : undefined,
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || 'CORTEX <noreply@cortex.local>',
        to: rec.to,
        subject: rec.subject,
        text: rec.text,
      });
      rec.status = 'sent';
    } catch (err) {
      rec.status = 'error';
      rec.error = String(err?.message || err);
    }
  }
  messages.push(rec);
  saveMail(messages);
  return rec;
}

export function listMail() {
  return loadMail();
}

export function health() {
  const accounts = loadAccounts();
  return {
    ok: true,
    service: 'cortex-labo',
    accounts: accounts.length,
    active: accounts.filter((a) => a.status === 'active').length,
    mail: loadMail().length,
    uptimeSec: Math.round(process.uptime()),
  };
}

export async function requestPasswordReset(email, origin = '') {
  const mail = normalizeEmail(email);
  const acc = loadAccounts().find((a) => a.email === mail);
  if (!acc || acc.status === 'disabled') {
    return { ok: true };
  }
  const tokens = loadResets().filter((t) => t.accountId !== acc.id);
  const token = crypto.randomBytes(24).toString('hex');
  tokens.push({
    token,
    accountId: acc.id,
    createdAt: now(),
    expiresAt: now() + 2 * 60 * 60 * 1000,
  });
  saveResets(tokens);
  const base = String(origin || '').replace(/\/$/, '');
  const link = `${base || ''}/reset?token=${token}`;
  await queueMail({
    to: mail,
    subject: 'Réinitialiser votre mot de passe CORTEX',
    text: `Bonjour ${acc.displayName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 2 heures) :\n${link}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
    accountId: acc.id,
    kind: 'reset',
  });
  return { ok: true };
}

export async function resetPassword({ token, password }) {
  if (!token) return { error: 'Lien incomplet.', code: 400 };
  if (String(password || '').length < 8) {
    return { error: 'Le mot de passe doit faire au moins 8 caractères.', code: 400 };
  }
  const tokens = loadResets();
  const row = tokens.find((t) => t.token === token);
  if (!row) return { error: 'Ce lien a expiré. Demandez-en un nouveau.', code: 400 };
  const accounts = loadAccounts();
  const acc = accounts.find((a) => a.id === row.accountId);
  if (!acc) return { error: 'Compte introuvable.', code: 404 };
  const { hash, salt } = hashPassword(password);
  acc.passwordHash = hash;
  acc.salt = salt;
  saveAccounts(accounts.map((a) => (a.id === acc.id ? acc : a)));
  saveResets(tokens.filter((t) => t.token !== token));
  await queueMail({
    to: acc.email,
    subject: 'Votre mot de passe CORTEX a été modifié',
    text: `Bonjour ${acc.displayName},\n\nLe mot de passe de votre compte a bien été changé.\n\nSi ce n’était pas vous, écrivez à l’administrateur.`,
    accountId: acc.id,
    kind: 'reset-done',
  });
  return { ok: true };
}

export function exportAccount(accountId) {
  return {
    account: getAccount(accountId),
    state: loadAccountState(accountId),
    archive: loadArchive(accountId),
    exportedAt: new Date().toISOString(),
  };
}

export { publicAccount };

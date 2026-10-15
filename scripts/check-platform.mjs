/**
 * Preuve hors réseau : un compte = son archive, pas de mélange.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.join(os.tmpdir(), `cortex-platform-${Date.now()}`);
process.env.CORTEX_DATA_DIR = root;
process.env.CORTEX_ADMIN_EMAIL = 'admin@cortex.test';
process.env.CORTEX_ADMIN_PASSWORD = 'admin-secret-9';

const {
  bootPlatform,
  registerAccount,
  loginAccount,
  saveAccountState,
  loadAccountState,
  appendAccountEvent,
  exportAccount,
  requestPasswordReset,
  resetPassword,
  listMail,
  listAccounts,
  listAccountsWithState,
} = await import('../server/platform.mjs');

bootPlatform();

const a = registerAccount({
  email: 'lea@cortex.test',
  password: 'motdepasse1',
  displayName: 'Léa',
});
assert.ok(a.token && a.account.id, 'inscription Léa');

const b = registerAccount({
  email: 'nico@cortex.test',
  password: 'motdepasse2',
  displayName: 'Nico',
});
assert.ok(b.account.id !== a.account.id, 'deux comptes distincts');

saveAccountState(a.account.id, {
  cognitive: { owner: 'lea', xp: 12 },
  enigmes: { lastId: 3 },
});
saveAccountState(b.account.id, {
  cognitive: { owner: 'nico', xp: 4 },
  enigmes: { lastId: 9 },
});
appendAccountEvent(a.account.id, { kind: 'trial', note: 'seulement Léa' });

const stateA = loadAccountState(a.account.id);
const stateB = loadAccountState(b.account.id);
assert.equal(stateA.cognitive.owner, 'lea');
assert.equal(stateB.cognitive.owner, 'nico');
assert.notEqual(stateA.accountId, stateB.accountId);

const expA = exportAccount(a.account.id);
assert.equal(expA.account.email, 'lea@cortex.test');
assert.ok(expA.archive.events.some((e) => e.note === 'seulement Léa'));
assert.ok(!exportAccount(b.account.id).archive.events.some((e) => e.note === 'seulement Léa'));

const fail = loginAccount({ email: 'lea@cortex.test', password: 'mauvais' });
assert.equal(fail.code, 401);

const ok = loginAccount({ email: 'admin@cortex.test', password: 'admin-secret-9' });
assert.equal(ok.account.role, 'admin');

await requestPasswordReset('lea@cortex.test', 'http://localhost:4100');
const resetMail = listMail().find((m) => m.kind === 'reset' && m.to === 'lea@cortex.test');
assert.ok(resetMail, 'mail de reset en file');
const token = resetMail.text.match(/token=([a-f0-9]+)/)?.[1];
assert.ok(token, 'jeton dans le mail');
const reset = await resetPassword({ token, password: 'nouveau-pass-1' });
assert.equal(reset.ok, true);
const after = loginAccount({ email: 'lea@cortex.test', password: 'nouveau-pass-1' });
assert.ok(after.token, 'connexion après reset');

const accounts = listAccounts();
assert.ok(accounts.every((acc) => !acc.passwordHash));
assert.ok(accounts.some((acc) => acc.role === 'admin'));

const full = listAccountsWithState();
const leaState = full.find((r) => r.account.email === 'lea@cortex.test');
const nicoState = full.find((r) => r.account.email === 'nico@cortex.test');
assert.equal(leaState.state.cognitive.owner, 'lea');
assert.equal(nicoState.state.cognitive.owner, 'nico');
assert.notEqual(leaState.state.accountId, nicoState.state.accountId);

fs.rmSync(root, { recursive: true, force: true });
console.log(`PLATFORM OK — ${accounts.length} comptes, archives cloisonnées, mail + reset.`);

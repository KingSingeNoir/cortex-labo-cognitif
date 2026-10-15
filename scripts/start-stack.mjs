/**
 * API :4110 + interface Vite :4100 (proxy /v1).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(script) {
  return spawn('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
  });
}

const api = run('server:api');
const ui = run('dev');

function shutdown() {
  api.kill();
  ui.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

api.on('exit', (code) => {
  if (code && code !== 0) process.exit(code);
});
ui.on('exit', (code) => {
  if (code && code !== 0) process.exit(code);
});

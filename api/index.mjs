/**
 * Adaptateur Vercel — même API que server.mjs.
 * Le disque Vercel est éphémère (/tmp) sauf si CORTEX_DATA_DIR pointe ailleurs.
 */
import { handleApi, corsHeaders } from '../server.mjs';

function urlPathOf(req) {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  if (raw.startsWith('/v1')) return raw;
  if (raw === '/api' || raw === '/api/') return '/v1/health';
  if (raw.startsWith('/api/')) {
    const rest = raw.slice(4);
    return rest.startsWith('/v1') ? rest : `/v1${rest}`;
  }
  return `/v1${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }
  await handleApi(req, res, urlPathOf(req));
}

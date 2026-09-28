import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCredentials, issueToken, normalizeEmail } from './src/auth.js';
import { createLockout } from './src/lockout.js';

const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

function sendLocked(res, ms) {
  const retryAfter = Math.ceil(ms / 1000);
  return sendJson(res, 429, { error: 'too_many_attempts', retryAfter }, { 'Retry-After': String(retryAfter) });
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
  }

  const body = JSON.parse(raw || '{}');
  if (typeof body !== 'object' || body === null) {
    throw new SyntaxError('The request body is not a JSON object');
  }
  return body;
}

async function handleLogin(req, res, lockout) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: 'invalid_json' });
  }
  // No await from here on: checking and recording a failure cannot interleave with a parallel
  // request, so parallel guesses cannot slip past the limit. Keep it so if checkCredentials turns async.
  // Unknown e-mails are counted and locked just like known ones, so the answers never reveal an account.
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const remaining = lockout.remainingLock(email);
  if (remaining > 0) {
    return sendLocked(res, remaining);
  }
  const user = checkCredentials(body.email, body.password);
  if (!user) {
    const locked = lockout.recordFailure(email);
    return locked > 0 ? sendLocked(res, locked) : sendJson(res, 401, { error: 'invalid_credentials' });
  }

  lockout.reset(email);
  return sendJson(res, 200, { token: issueToken(), user });
}

async function serveStatic(req, res) {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = normalize(join(PUBLIC_DIR, path === '/' ? 'index.html' : path));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nem található');
  }
}

export function createApp({ lockout = createLockout() } = {}) {
  return createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/login') {
      return handleLogin(req, res, lockout);
    }
    if (req.method === 'GET') {
      return serveStatic(req, res);
    }
    res.writeHead(405).end();
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`zozz-sandbox: http://localhost:${port}`));
}

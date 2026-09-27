import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCredentials, issueToken } from './src/auth.js';

const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
  }

  return JSON.parse(raw || '{}');
}

async function handleLogin(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: 'invalid_json' });
  }
  const user = checkCredentials(body.email, body.password);
  if (!user) {
    return sendJson(res, 401, { error: 'invalid_credentials' });
  }

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

export function createApp() {
  return createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/login') {
      return handleLogin(req, res);
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

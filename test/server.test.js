import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function login(body) {
  return fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}

test('POST /api/login returns a token and the user for valid credentials', async () => {
  const response = await login(JSON.stringify({ email: 'demo@example.com', password: 'demo1234' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(body.token, /^[0-9a-f]{48}$/);
  assert.equal(body.user.email, 'demo@example.com');
});

test('POST /api/login answers 401 for a wrong password and 400 for broken JSON', async () => {
  assert.equal((await login(JSON.stringify({ email: 'demo@example.com', password: 'x' }))).status, 401);
  assert.equal((await login('{')).status, 400);
});

test('serves the login page and refuses paths outside public/', async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<h1>Belépés<\/h1>/);
  assert.equal((await fetch(`${base}/..%2Fserver.js`)).status, 403);
});

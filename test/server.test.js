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

test('the login page offers a forgot-password hint with the support address under the password field', async () => {
  const html = await (await fetch(`${base}/`)).text();
  const passwordAt = html.indexOf('name="password"');
  const hintAt = html.indexOf('<summary>Elfelejtett jelszó?</summary>');
  const buttonAt = html.indexOf('id="login-button"');

  assert.ok(passwordAt < hintAt && hintAt < buttonAt, 'the hint sits between the password field and the login button');
  assert.match(html, /<details id="forgot-password">/, 'the hint is closed by default');
  assert.match(html, /írjon a <a [^>]*>support@example\.com<\/a> címre arról az e-mail címről, amellyel belép\./);

  const href = html.match(/href="(mailto:[^"]+)"/)?.[1];
  assert.ok(href, 'the address opens the mail client');
  const mailto = new URL(href);
  assert.equal(mailto.pathname, 'support@example.com');
  assert.equal(mailto.searchParams.get('subject'), 'Elfelejtett jelszó');
});

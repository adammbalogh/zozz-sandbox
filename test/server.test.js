import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { createLockout } from '../src/lockout.js';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function login(body, url = base) {
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(5000) };
  return fetch(`${url}/api/login`, init);
}

const MINUTE = 60 * 1000;

// A separate server with a fake clock, so locking an e-mail does not affect the other tests.
async function lockoutServer(t) {
  const clock = { time: Date.UTC(2026, 8, 28, 12, 0) };
  const app = createApp({ lockout: createLockout({ now: () => clock.time }) });
  await new Promise((resolve) => app.listen(0, resolve));
  t.after(() => app.close());
  const url = `http://127.0.0.1:${app.address().port}`;
  const attempt = async (email, password) => {
    const response = await login(JSON.stringify({ email, password }), url);
    return [response.status, response.headers.get('retry-after'), await response.json()];
  };
  return { clock, attempt };
}

const locked = (retryAfter) => [429, String(retryAfter), { error: 'too_many_attempts', retryAfter }];
const wrong = [401, null, { error: 'invalid_credentials' }];

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

test('locks the e-mail for 15 minutes at the 5th wrong password, even for the right one', async (t) => {
  const { clock, attempt } = await lockoutServer(t);

  for (let i = 0; i < 4; i++) {
    assert.deepEqual(await attempt('demo@example.com', 'wrong'), wrong);
  }
  assert.deepEqual(await attempt('demo@example.com', 'wrong'), locked(900));
  assert.deepEqual(await attempt('demo@example.com', 'demo1234'), locked(900));

  clock.time += 10 * MINUTE;
  assert.deepEqual(await attempt('demo@example.com', 'wrong'), locked(300), 'attempts do not extend the lock');
  clock.time += 5 * MINUTE;
  assert.equal((await attempt('demo@example.com', 'demo1234'))[0], 200);
});

test('answers the same for an unknown e-mail as for an existing account', async (t) => {
  const { attempt } = await lockoutServer(t);
  const answers = async (email) => {
    const all = [];
    for (let i = 0; i < 6; i++) {
      all.push(await attempt(email, 'wrong'));
    }
    return all;
  };

  assert.deepEqual(await answers('nobody@example.com'), await answers('demo@example.com'));
});

test('a successful login starts the count from zero', async (t) => {
  const { attempt } = await lockoutServer(t);

  for (let i = 0; i < 4; i++) {
    await attempt('demo@example.com', 'wrong');
  }
  assert.equal((await attempt('demo@example.com', 'demo1234'))[0], 200);
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(await attempt('demo@example.com', 'wrong'), wrong);
  }
  assert.deepEqual(await attempt('demo@example.com', 'wrong'), locked(900));
});

test('counts different spellings of the same e-mail together', async (t) => {
  const { attempt } = await lockoutServer(t);

  for (let i = 0; i < 5; i++) {
    await attempt(' Demo@Example.com ', 'wrong');
  }
  assert.deepEqual(await attempt('demo@example.com', 'demo1234'), locked(900));
});

test('POST /api/login answers 400 for a body that is not a JSON object and keeps running', async () => {
  assert.equal((await login('null')).status, 400);
  assert.equal((await login('5')).status, 400);
  assert.equal((await login(JSON.stringify({ email: 'demo@example.com', password: 'demo1234' }))).status, 200);
});

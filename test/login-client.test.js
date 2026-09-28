import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { lockedMessage, readRetryAfter, readToken, requestLogin } from '../public/login-client.js';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

// The page calls fetch with a relative URL; in Node it has to be made absolute.
const serverFetch = (path, init) => fetch(`${base}${path}`, init);

test('readToken reads the token from the /api/login response body', () => {
  assert.equal(readToken({ token: 'abc', user: { email: 'demo@example.com' } }), 'abc');
  assert.equal(readToken({ error: 'invalid_credentials' }), undefined);
  assert.equal(readToken(undefined), undefined);
});

test('requestLogin returns the token issued by the server for valid credentials', async () => {
  const { token } = await requestLogin(' demo@example.com ', 'demo1234', serverFetch);
  assert.match(token, /^[0-9a-f]{48}$/);
});

test('requestLogin returns nothing for a wrong password', async () => {
  assert.deepEqual(await requestLogin('demo@example.com', 'wrong', serverFetch), {});
});

test('requestLogin returns the seconds to wait once the e-mail is locked', async () => {
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(await requestLogin('nobody@example.com', 'wrong', serverFetch), {});
  }
  assert.deepEqual(await requestLogin('nobody@example.com', 'wrong', serverFetch), { retryAfter: 900 });
});

test('requestLogin returns nothing instead of rejecting on a network error or a broken response', async () => {
  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };
  const notJson = async () => new Response('<html>', { status: 200 });
  const noToken = async () => Response.json({});
  const noRetryAfter = async () => Response.json({ error: 'too_many_attempts' }, { status: 429 });

  assert.deepEqual(await requestLogin('demo@example.com', 'demo1234', offline), {});
  assert.deepEqual(await requestLogin('demo@example.com', 'demo1234', notJson), {});
  assert.deepEqual(await requestLogin('demo@example.com', 'demo1234', noToken), {});
  assert.deepEqual(await requestLogin('demo@example.com', 'demo1234', noRetryAfter), {});
});

test('readRetryAfter reads a positive number of seconds only', () => {
  assert.equal(readRetryAfter({ error: 'too_many_attempts', retryAfter: 900 }), 900);
  assert.equal(readRetryAfter({ retryAfter: 0 }), undefined);
  assert.equal(readRetryAfter({ retryAfter: -5 }), undefined);
  assert.equal(readRetryAfter({ retryAfter: '900' }), undefined);
  assert.equal(readRetryAfter({ retryAfter: Infinity }), undefined);
  assert.equal(readRetryAfter(null), undefined);
});

test('lockedMessage tells the local time to try again, rounded up to the minute', () => {
  const at = (hours, minutes, seconds) => new Date(2026, 0, 15, hours, minutes, seconds);
  const message = (time) => `Túl sok sikertelen belépési kísérlet. Újra próbálkozni ${time} után lehet.`;

  assert.equal(lockedMessage(900, at(14, 20, 30)), message('14:36'));
  assert.equal(lockedMessage(900, at(14, 20, 0)), message('14:35'));
  assert.equal(lockedMessage(600, at(23, 55, 0)), message('0:05'));
  assert.equal(lockedMessage(60, at(8, 59, 30)), message('9:01'));
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { nextRevealLock, passwordToggleView, readToken, requestToken } from '../public/login-client.js';

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

test('requestToken returns the token issued by the server for valid credentials', async () => {
  assert.match(await requestToken(' demo@example.com ', 'demo1234', serverFetch), /^[0-9a-f]{48}$/);
});

test('requestToken returns null for a wrong password', async () => {
  assert.equal(await requestToken('demo@example.com', 'wrong', serverFetch), null);
});

test('requestToken returns null instead of rejecting on a network error or a broken response', async () => {
  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };
  const notJson = async () => new Response('<html>', { status: 200 });
  const noToken = async () => Response.json({});

  assert.equal(await requestToken('demo@example.com', 'demo1234', offline), null);
  assert.equal(await requestToken('demo@example.com', 'demo1234', notJson), null);
  assert.equal(await requestToken('demo@example.com', 'demo1234', noToken), null);
});

test('passwordToggleView describes the hidden and the visible password', () => {
  assert.deepEqual(passwordToggleView(false), {
    inputType: 'password',
    buttonText: 'Mutat',
    announcement: 'A jelszó el van rejtve.',
  });
  assert.deepEqual(passwordToggleView(true), {
    inputType: 'text',
    buttonText: 'Elrejt',
    announcement: 'A jelszó látható.',
  });
});

test('nextRevealLock locks revealing a password filled in by the browser until the field is emptied', () => {
  // Typed by the user.
  assert.equal(nextRevealLock(false, { autofilled: false, empty: false }), false);
  // Filled in by the browser; Chrome may still report the value as empty.
  assert.equal(nextRevealLock(false, { autofilled: true, empty: true }), true);
  // The saved password was edited, so it is no longer :autofill.
  assert.equal(nextRevealLock(true, { autofilled: false, empty: false }), true);
  // Emptied, then typed by hand.
  assert.equal(nextRevealLock(true, { autofilled: false, empty: true }), false);
});

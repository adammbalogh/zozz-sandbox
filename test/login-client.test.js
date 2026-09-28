import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import {
  REMEMBER_DAYS, clearSession, loadSession, readToken, requestToken, saveSession,
} from '../public/login-client.js';

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

// In-memory stand-in for localStorage / sessionStorage.
class MemoryStorage {
  #items = new Map();
  getItem(key) {
    return this.#items.has(key) ? this.#items.get(key) : null;
  }
  setItem(key, value) {
    this.#items.set(key, String(value));
  }
  removeItem(key) {
    this.#items.delete(key);
  }
  get length() {
    return this.#items.size;
  }
}

const newStores = () => ({ local: new MemoryStorage(), session: new MemoryStorage() });
const NOW = Date.UTC(2026, 8, 28);
const DAY_MS = 24 * 60 * 60 * 1000;

test('a login without "remember" lives only in sessionStorage, as before', () => {
  const stores = newStores();
  saveSession(stores, 'abc', false, NOW);

  assert.equal(stores.session.getItem('token'), 'abc');
  assert.equal(stores.local.length, 0);
  assert.equal(loadSession(stores, NOW), 'abc');
});

test('a remembered login is kept in localStorage for REMEMBER_DAYS from the login', () => {
  const stores = newStores();
  saveSession(stores, 'abc', true, NOW);

  assert.equal(REMEMBER_DAYS, 30);
  assert.equal(stores.session.length, 0);
  assert.deepEqual(JSON.parse(stores.local.getItem('rememberedLogin')), { token: 'abc', expiresAt: NOW + 30 * DAY_MS });

  // A new tab / reopened browser: sessionStorage is empty, the remembered login is still there.
  const reopened = { local: stores.local, session: new MemoryStorage() };
  assert.equal(loadSession(reopened, NOW + 30 * DAY_MS - 1), 'abc');
});

test('an expired remembered login counts as logged out and is removed', () => {
  const stores = newStores();
  saveSession(stores, 'abc', true, NOW);

  assert.equal(loadSession(stores, NOW + 30 * DAY_MS), null);
  assert.equal(stores.local.getItem('rememberedLogin'), null);
});

test('an unreadable remembered login counts as logged out and is removed', () => {
  for (const raw of ['{', '{}', '{"token":"abc"}', '{"token":"","expiresAt":9e15}', 'null']) {
    const stores = newStores();
    stores.local.setItem('rememberedLogin', raw);

    assert.equal(loadSession(stores, NOW), null, raw);
    assert.equal(stores.local.getItem('rememberedLogin'), null, raw);
  }
});

test('a new login without "remember" drops an earlier remembered login', () => {
  const stores = newStores();
  saveSession(stores, 'old', true, NOW);
  saveSession(stores, 'new', false, NOW);

  assert.equal(stores.local.getItem('rememberedLogin'), null);
  assert.equal(loadSession({ local: stores.local, session: new MemoryStorage() }, NOW), null);
});

test('clearSession logs out both kinds of login', () => {
  const stores = newStores();
  saveSession(stores, 'abc', true, NOW);
  stores.session.setItem('token', 'tab');
  clearSession(stores);

  assert.equal(loadSession(stores, NOW), null);
  assert.equal(stores.local.length + stores.session.length, 0);
});

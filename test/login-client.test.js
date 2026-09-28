import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { readToken, requestToken } from '../public/login-client.js';

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

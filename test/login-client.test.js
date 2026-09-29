import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { ERROR_MESSAGE, FAILURE_MESSAGE, buildLoginRequest, readToken, requestLogin } from '../public/login-client.js';

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

function fakeFetch(status, body) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  });
}

test('readToken reads the token of the real /api/login response shape', () => {
  assert.equal(readToken({ token: 'abc123', user: { email: 'demo@example.com' } }), 'abc123');
});

test('readToken returns an empty token for an error body instead of throwing', () => {
  assert.equal(readToken({ error: 'invalid_credentials' }), '');
  assert.equal(readToken(null), '');
});

test('the client reads a token from what the server actually answers', async () => {
  const response = await fetch(`${base}/api/login`, buildLoginRequest('demo@example.com', 'demo1234'));

  assert.match(readToken(await response.json()), /^[0-9a-f]{48}$/);
});

test('requestLogin returns the token issued by the server for valid credentials', async () => {
  const result = await requestLogin(' demo@example.com ', 'demo1234', serverFetch);

  assert.match(result.token, /^[0-9a-f]{48}$/);
});

test('requestLogin shows the wrong-credentials message when the server refuses the password', async () => {
  assert.deepEqual(await requestLogin('demo@example.com', 'wrong', serverFetch), { error: ERROR_MESSAGE });
});

test('requestLogin resolves to the token on success', async () => {
  const result = await requestLogin('demo@example.com', 'demo1234', fakeFetch(200, { token: 'abc123', user: {} }));

  assert.deepEqual(result, { token: 'abc123' });
});

test('requestLogin shows the wrong-credentials message on 401', async () => {
  const result = await requestLogin('demo@example.com', 'x', fakeFetch(401, { error: 'invalid_credentials' }));

  assert.deepEqual(result, { error: ERROR_MESSAGE });
});

test('requestLogin shows the general message on network, server and parse errors', async () => {
  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };

  assert.deepEqual(await requestLogin('a', 'b', offline), { error: FAILURE_MESSAGE });
  assert.deepEqual(await requestLogin('a', 'b', fakeFetch(500, { error: 'boom' })), { error: FAILURE_MESSAGE });
  assert.deepEqual(await requestLogin('a', 'b', fakeFetch(200, '<html>')), { error: FAILURE_MESSAGE });
  assert.deepEqual(await requestLogin('a', 'b', fakeFetch(200, {})), { error: FAILURE_MESSAGE });
});

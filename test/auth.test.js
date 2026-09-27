import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCredentials, issueToken } from '../src/auth.js';

test('accepts the demo account, e-mail case-insensitively', () => {
  assert.deepEqual(checkCredentials(' Demo@Example.com ', 'demo1234'), { email: 'demo@example.com', name: 'Demo Felhasználó' });
});

test('rejects a wrong password, an unknown e-mail and missing fields', () => {
  assert.equal(checkCredentials('demo@example.com', 'wrong'), null);
  assert.equal(checkCredentials('nobody@example.com', 'demo1234'), null);
  assert.equal(checkCredentials(undefined, 'demo1234'), null);
});

test('issues a fresh random token every time', () => {
  assert.match(issueToken(), /^[0-9a-f]{48}$/);
  assert.notEqual(issueToken(), issueToken());
});

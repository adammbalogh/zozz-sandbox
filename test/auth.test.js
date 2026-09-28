import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCredentials, issueToken, normalizeEmail } from '../src/auth.js';

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

test('normalizes an e-mail by trimming and lower-casing it', () => {
  assert.equal(normalizeEmail(' Demo@Example.COM '), 'demo@example.com');
});

test('takes about as long for an unknown e-mail as for an existing account', () => {
  const fastest = (email) => {
    checkCredentials(email, 'wrong'); // warm-up
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      checkCredentials(email, 'wrong');
      best = Math.min(best, performance.now() - start);
    }
    return best;
  };

  assert.ok(fastest('nobody@example.com') > fastest('demo@example.com') / 2);
});

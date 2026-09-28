import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLockout, LOCK_MS } from '../src/lockout.js';

const MINUTE = 60 * 1000;

function fakeClock() {
  const clock = { time: Date.UTC(2026, 8, 28, 12, 0), now: () => clock.time };
  return clock;
}

function fail(lockout, email, times) {
  return Array.from({ length: times }, () => lockout.recordFailure(email));
}

test('locks an e-mail for 15 minutes at the 5th failure', () => {
  const clock = fakeClock();
  const lockout = createLockout({ now: clock.now });

  assert.deepEqual(fail(lockout, 'a@example.com', 4), [0, 0, 0, 0]);
  assert.equal(lockout.remainingLock('a@example.com'), 0);
  assert.equal(lockout.recordFailure('a@example.com'), LOCK_MS);
  assert.equal(lockout.remainingLock('a@example.com'), 15 * MINUTE);

  clock.time += 10 * MINUTE;
  assert.equal(lockout.remainingLock('a@example.com'), 5 * MINUTE);
  clock.time += 5 * MINUTE;
  assert.equal(lockout.remainingLock('a@example.com'), 0);
});

test('only counts the failures of the last 15 minutes', () => {
  const clock = fakeClock();
  const lockout = createLockout({ now: clock.now });

  fail(lockout, 'a@example.com', 4);
  clock.time += 15 * MINUTE;
  assert.deepEqual(fail(lockout, 'a@example.com', 4), [0, 0, 0, 0]);
  assert.equal(lockout.recordFailure('a@example.com'), LOCK_MS);
});

test('starts from zero after a reset and after the lock ends', () => {
  const clock = fakeClock();
  const lockout = createLockout({ now: clock.now });

  fail(lockout, 'a@example.com', 4);
  lockout.reset('a@example.com');
  assert.deepEqual(fail(lockout, 'a@example.com', 5), [0, 0, 0, 0, LOCK_MS]);

  clock.time += LOCK_MS;
  assert.deepEqual(fail(lockout, 'a@example.com', 5), [0, 0, 0, 0, LOCK_MS]);
});

test('counts every e-mail separately', () => {
  const lockout = createLockout({ now: fakeClock().now });

  fail(lockout, 'a@example.com', 5);
  assert.equal(lockout.remainingLock('b@example.com'), 0);
  assert.equal(lockout.recordFailure('b@example.com'), 0);
});

test('forgets e-mails with neither a recent failure nor a lock', () => {
  const clock = fakeClock();
  const lockout = createLockout({ now: clock.now });

  fail(lockout, 'old@example.com', 2);
  fail(lockout, 'locked@example.com', 5);
  clock.time += 15 * MINUTE - 1;
  fail(lockout, 'recent@example.com', 1);
  assert.equal(lockout.size, 3);

  clock.time += 1;
  fail(lockout, 'recent@example.com', 1);
  assert.equal(lockout.size, 1);
});

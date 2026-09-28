// Temporary lockout of an e-mail address after too many failed logins.
// Counted per normalized e-mail whether or not an account exists, so a lockout never reveals that.

export const MAX_FAILURES = 5;
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

export function createLockout({ maxFailures = MAX_FAILURES, windowMs = FAILURE_WINDOW_MS, lockMs = LOCK_MS, now = Date.now } = {}) {
  const entries = new Map(); // e-mail -> { failures: timestamps of recent failures, lockedUntil }
  let prunedAt = now();

  // Drops e-mails with neither a recent failure nor a lock, at most once per window,
  // so memory stays bounded even though the e-mails come from the client.
  function prune(time) {
    if (time - prunedAt < windowMs) {
      return;
    }
    prunedAt = time;
    for (const [email, entry] of entries) {
      if (entry.lockedUntil <= time && entry.failures.every((at) => time - at >= windowMs)) {
        entries.delete(email);
      }
    }
  }

  return {
    /** Milliseconds until the e-mail may try again; 0 if it is not locked. */
    remainingLock(email) {
      return Math.max(0, (entries.get(email)?.lockedUntil ?? 0) - now());
    },

    /** Counts a failed login; returns the lock time in ms if this failure locked the e-mail, otherwise 0. */
    recordFailure(email) {
      const time = now();
      prune(time);
      const entry = entries.get(email) ?? { failures: [], lockedUntil: 0 };
      entry.failures = entry.failures.filter((at) => time - at < windowMs);
      entry.failures.push(time);
      entries.set(email, entry);
      if (entry.failures.length < maxFailures) {
        return 0;
      }
      entry.failures = [];
      entry.lockedUntil = time + lockMs;
      return lockMs;
    },

    /** Forgets the failures of the e-mail, e.g. after a successful login. */
    reset(email) {
      entries.delete(email);
    },

    /** Number of tracked e-mails (for tests). */
    get size() {
      return entries.size;
    },
  };
}

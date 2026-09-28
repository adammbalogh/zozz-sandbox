import { randomBytes, timingSafeEqual } from 'node:crypto';
import { hashPassword, users } from './users.js';

// Compared against when the e-mail has no account, so an unknown e-mail takes as long as a known one.
const NO_ACCOUNT_HASH = hashPassword('');

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Checks an e-mail and password against the demo accounts.
 * Returns the user (without the password hash) or null.
 */
export function checkCredentials(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  const user = users.find((u) => u.email === normalizeEmail(email));
  const given = Buffer.from(hashPassword(password), 'hex');
  const stored = Buffer.from(user?.passwordHash ?? NO_ACCOUNT_HASH, 'hex');
  if (!timingSafeEqual(given, stored) || !user) {
    return null;
  }

  return { email: user.email, name: user.name };
}

export function issueToken() {
  return randomBytes(24).toString('hex');
}

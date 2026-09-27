import { randomBytes, timingSafeEqual } from 'node:crypto';
import { hashPassword, users } from './users.js';

/**
 * Checks an e-mail and password against the demo accounts.
 * Returns the user (without the password hash) or null.
 */
export function checkCredentials(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  const user = users.find((u) => u.email === email.trim().toLowerCase());
  if (!user) {
    return null;
  }
  const given = Buffer.from(hashPassword(password), 'hex');
  const stored = Buffer.from(user.passwordHash, 'hex');
  if (!timingSafeEqual(given, stored)) {
    return null;
  }

  return { email: user.email, name: user.name };
}

export function issueToken() {
  return randomBytes(24).toString('hex');
}

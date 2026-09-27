import { scryptSync } from 'node:crypto';

const SALT = 'zozz-sandbox';

export function hashPassword(password) {
  return scryptSync(password, SALT, 32).toString('hex');
}

// Demo accounts; the password of demo@example.com is "demo1234".
export const users = [
  { email: 'demo@example.com', name: 'Demo Felhasználó', passwordHash: hashPassword('demo1234') },
];

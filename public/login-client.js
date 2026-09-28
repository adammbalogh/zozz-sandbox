// Helpers of the login page that do not touch the DOM, so they can be tested in Node.

export const ERROR_MESSAGE = 'Hibás e-mail cím vagy jelszó';

export function buildLoginRequest(email, password) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  };
}

/** The session token from a successful /api/login response body ({ token, user }). */
export function readToken(body) {
  return body?.token;
}

/**
 * Posts the credentials to /api/login.
 * Resolves to the session token, or null if the login failed for any reason
 * (wrong credentials, network error, unexpected response); it never rejects.
 */
export async function requestToken(email, password, fetchImpl = fetch) {
  try {
    const response = await fetchImpl('/api/login', buildLoginRequest(email, password));
    if (!response.ok) {
      return null;
    }

    return readToken(await response.json()) || null;
  } catch {
    return null;
  }
}

/** How long a login made with "Maradjak bejelentkezve" lasts, counted from the login (not extended by visits). */
export const REMEMBER_DAYS = 30;

const SESSION_KEY = 'token';
const REMEMBERED_KEY = 'rememberedLogin';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Stores the token of a successful login. `stores` is { local, session } (localStorage and sessionStorage
 * in the browser). A remembered login survives closing the browser for REMEMBER_DAYS; otherwise the token
 * lives in sessionStorage as before. Any earlier login is cleared first, so a login without "remember"
 * never leaves an older remembered one behind.
 */
export function saveSession(stores, token, remember, now = Date.now()) {
  clearSession(stores);
  if (remember) {
    stores.local.setItem(REMEMBERED_KEY, JSON.stringify({ token, expiresAt: now + REMEMBER_DAYS * DAY_MS }));
  } else {
    stores.session.setItem(SESSION_KEY, token);
  }
}

/** The token of the current login, or null. An expired or unreadable remembered login is removed. */
export function loadSession(stores, now = Date.now()) {
  const sessionToken = stores.session.getItem(SESSION_KEY);
  if (sessionToken) {
    return sessionToken;
  }
  const raw = stores.local.getItem(REMEMBERED_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const { token, expiresAt } = JSON.parse(raw);
    if (typeof token === 'string' && token !== '' && typeof expiresAt === 'number' && now < expiresAt) {
      return token;
    }
  } catch {
    // Unreadable entry: treat it as logged out.
  }
  stores.local.removeItem(REMEMBERED_KEY);

  return null;
}

/** Logs out in this browser: removes both kinds of login. */
export function clearSession(stores) {
  stores.session.removeItem(SESSION_KEY);
  stores.local.removeItem(REMEMBERED_KEY);
}

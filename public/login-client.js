// Helpers of the login page that do not touch the DOM, so they can be tested in Node.

export const ERROR_MESSAGE = 'Hibás e-mail cím vagy jelszó';
export const FAILURE_MESSAGE = 'A belépés most nem sikerült, próbáld újra később.';

export function buildLoginRequest(email, password) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  };
}

/** The session token from a successful /api/login response body, or '' if it has none. */
export function readToken(body) {
  return typeof body?.token === 'string' ? body.token : '';
}

/**
 * Sends the login request and never throws.
 * Resolves to { token } on success, or { error } with the message to show.
 */
export async function requestLogin(email, password, fetchFn = globalThis.fetch) {
  try {
    const response = await fetchFn('/api/login', buildLoginRequest(email, password));
    if (response.status === 401) {
      return { error: ERROR_MESSAGE };
    }
    const token = response.ok ? readToken(await response.json()) : '';

    return token ? { token } : { error: FAILURE_MESSAGE };
  } catch {
    return { error: FAILURE_MESSAGE };
  }
}

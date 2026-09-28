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

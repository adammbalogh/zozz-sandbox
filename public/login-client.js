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

/** The seconds to wait from a 429 /api/login response body ({ error, retryAfter }), or undefined. */
export function readRetryAfter(body) {
  const seconds = body?.retryAfter;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

/**
 * The message shown while the e-mail is locked, with the local time (H:MM) when it may try again.
 * The time is rounded up to the minute, so it is never earlier than the real end of the lock.
 */
export function lockedMessage(retryAfter, now = new Date()) {
  const minute = 60 * 1000;
  const retryAt = new Date(Math.ceil((now.getTime() + retryAfter * 1000) / minute) * minute);
  const time = `${retryAt.getHours()}:${String(retryAt.getMinutes()).padStart(2, '0')}`;
  return `Túl sok sikertelen belépési kísérlet. Újra próbálkozni ${time} után lehet.`;
}

/**
 * Posts the credentials to /api/login.
 * Resolves to { token } on success, { retryAfter } (seconds) if the e-mail is temporarily locked,
 * and {} if the login failed for any other reason (wrong credentials, network error, unexpected response);
 * it never rejects.
 */
export async function requestLogin(email, password, fetchImpl = fetch) {
  try {
    const response = await fetchImpl('/api/login', buildLoginRequest(email, password));
    if (response.status === 429) {
      const retryAfter = readRetryAfter(await response.json());
      return retryAfter ? { retryAfter } : {};
    }
    if (!response.ok) {
      return {};
    }

    const token = readToken(await response.json());
    return token ? { token } : {};
  } catch {
    return {};
  }
}

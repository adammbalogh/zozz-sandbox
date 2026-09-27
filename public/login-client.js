// Helpers of the login page that do not touch the DOM, so they can be tested in Node.

export const ERROR_MESSAGE = 'Hibás e-mail cím vagy jelszó';

export function buildLoginRequest(email, password) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  };
}

/** The session token from a successful /api/login response body. */
export function readToken(body) {
  return body.data.token;
}

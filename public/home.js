import { clearSession, loadSession } from './login-client.js';

const stores = { local: localStorage, session: sessionStorage };

// Logged out (or the remembered login expired): show the login page instead.
function requireLogin() {
  if (!loadSession(stores)) {
    window.location.replace('/');
  }
}

requireLogin();
// A page restored from the back/forward cache does not run the module again.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    requireLogin();
  }
});

document.querySelector('#logout-button').addEventListener('click', () => {
  clearSession(stores);
  window.location.replace('/');
});

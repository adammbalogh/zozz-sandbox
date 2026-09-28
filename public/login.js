import { ERROR_MESSAGE, loadSession, requestToken, saveSession } from './login-client.js';

const form = document.querySelector('#login-form');
const button = document.querySelector('#login-button');
const spinner = document.querySelector('#spinner');
const error = document.querySelector('#error');
const stores = { local: localStorage, session: sessionStorage };

// Already logged in (in this tab, or remembered): go straight to the home page.
if (loadSession(stores)) {
  window.location.replace('/home.html');
}

async function onLoginPress(event) {
  event.preventDefault();
  const email = form.elements.email.value;
  const password = form.elements.password.value;

  button.disabled = true;
  spinner.hidden = false;
  error.hidden = true;

  const token = await requestToken(email, password);
  if (!token) {
    error.textContent = ERROR_MESSAGE;
    error.hidden = false;
    button.disabled = false;
    spinner.hidden = true;
    return;
  }

  saveSession(stores, token, form.elements.remember.checked);
  // replace(): the login page does not stay in the history, so Back cannot show it with the button disabled.
  window.location.replace('/home.html');
}

form.addEventListener('submit', onLoginPress);

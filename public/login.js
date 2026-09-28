import { requestLogin } from './login-client.js';

const form = document.querySelector('#login-form');
const button = document.querySelector('#login-button');
const spinner = document.querySelector('#spinner');
const error = document.querySelector('#error');

async function onLoginPress(event) {
  event.preventDefault();
  const email = form.elements.email.value;
  const password = form.elements.password.value;

  button.disabled = true;
  spinner.hidden = false;
  error.hidden = true;

  const result = await requestLogin(email, password);

  if (result.error) {
    error.textContent = result.error;
    error.hidden = false;
    button.disabled = false;
    spinner.hidden = true;
    return;
  }

  sessionStorage.setItem('token', result.token);
  window.location.href = '/home.html';
}

form.addEventListener('submit', onLoginPress);

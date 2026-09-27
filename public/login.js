import { ERROR_MESSAGE, buildLoginRequest, readToken } from './login-client.js';

const form = document.querySelector('#login-form');
const button = document.querySelector('#login-button');
const spinner = document.querySelector('#spinner');
const error = document.querySelector('#error');

async function onLoginPress(event) {
  event.preventDefault();
  const email = form.elements.email.value;
  const password = form.elements.password.value;

  const response = await fetch('/api/login', buildLoginRequest(email, password));
  const body = await response.json();
  const token = readToken(body);

  button.disabled = true;
  spinner.hidden = false;
  error.hidden = true;

  if (!response.ok || !token) {
    error.textContent = ERROR_MESSAGE;
    error.hidden = false;
    button.disabled = false;
    spinner.hidden = true;
    return;
  }

  sessionStorage.setItem('token', token);
  window.location.href = '/home.html';
}

form.addEventListener('submit', onLoginPress);

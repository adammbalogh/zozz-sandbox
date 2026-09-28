import { ERROR_MESSAGE, nextRevealLock, passwordToggleView, requestToken } from './login-client.js';

const form = document.querySelector('#login-form');
const button = document.querySelector('#login-button');
const spinner = document.querySelector('#spinner');
const error = document.querySelector('#error');
const passwordInput = form.elements.password;
const passwordToggle = document.querySelector('#password-toggle');
const passwordStatus = document.querySelector('#password-status');

let revealLocked = false;

/** Shows or hides the password; only a change made by the user is announced to screen readers. */
function setPasswordVisible(visible, announce = false) {
  const view = passwordToggleView(visible);
  const { selectionStart, selectionEnd } = passwordInput;
  passwordInput.type = view.inputType;
  if (document.activeElement === passwordInput) {
    passwordInput.setSelectionRange(selectionStart, selectionEnd);
  }
  passwordToggle.textContent = view.buttonText;
  passwordStatus.textContent = announce ? view.announcement : '';
}

function isAutofilled(input) {
  for (const selector of [':autofill', ':-webkit-autofill']) {
    try {
      return input.matches(selector);
    } catch {
      // Unsupported selector in this browser: try the next one.
    }
  }
  return false;
}

/** Hides the toggle while the password comes from the browser's saved passwords. */
function updateRevealLock() {
  revealLocked = nextRevealLock(revealLocked, {
    autofilled: isAutofilled(passwordInput),
    empty: passwordInput.value === '',
  });
  passwordToggle.hidden = revealLocked;
  if (revealLocked) {
    setPasswordVisible(false);
  }
}

async function onLoginPress(event) {
  event.preventDefault();
  setPasswordVisible(false);
  const email = form.elements.email.value;
  const password = passwordInput.value;

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

  sessionStorage.setItem('token', token);
  window.location.href = '/home.html';
}

form.addEventListener('submit', onLoginPress);

// beforeinput runs before an edit clears :autofill, so an edited saved password stays locked.
for (const type of ['focus', 'beforeinput', 'input']) {
  passwordInput.addEventListener(type, updateRevealLock);
}

// Keep the focus (and the phone's keyboard) in the password field when the toggle is clicked or tapped.
passwordToggle.addEventListener('mousedown', (event) => event.preventDefault());
passwordToggle.addEventListener('click', () => {
  updateRevealLock();
  if (!revealLocked) {
    setPasswordVisible(passwordInput.type === 'password', true);
  }
});

window.addEventListener('pagehide', () => setPasswordVisible(false));
// Coming back with the Back button (bfcache) must not leave the password there to be read.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    passwordInput.value = '';
    updateRevealLock();
  }
});

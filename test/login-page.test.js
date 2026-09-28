import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { passwordToggleView } from '../public/login-client.js';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

/** The opening tag of the element with the given id. */
function tag(id) {
  const match = html.match(new RegExp(`<[a-z]+[^>]*\\sid="${id}"[^>]*>`));
  assert.ok(match, `#${id} is on the login page`);
  return match[0];
}

test('the password is hidden by default and the phone does not change it while it is visible', () => {
  const input = tag('password');
  assert.match(input, /\stype="password"/);
  assert.match(input, /\sname="password"/);
  assert.match(input, /\sspellcheck="false"/);
  assert.match(input, /\sautocapitalize="none"/);
  assert.match(input, /\sautocorrect="off"/);
});

test('the show/hide button does not submit the form and starts in the hidden state', () => {
  assert.match(tag('password-toggle'), /\stype="button"/);
  assert.match(tag('password-toggle'), /\saria-controls="password"/);
  assert.match(html, new RegExp(`id="password-toggle"[^>]*>${passwordToggleView(false).buttonText}</button>`));
});

test('showing or hiding the password is announced to screen readers', () => {
  assert.match(tag('password-status'), /\saria-live="polite"/);
});

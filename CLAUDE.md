# zozz-sandbox

A tiny login demo used to test zozz-coder. Node 24, ES modules, no dependencies (no `npm install`).

- Run: `npm start` → http://localhost:3000 (demo account: `demo@example.com` / `demo1234`)
- Test: `npm test` (`node --test`, files in `test/*.test.js`)
- Server: `server.js` (routes) and `src/` (auth). Browser: `public/`; the page logic that does not touch the DOM
  lives in `public/login-client.js`, so it can be tested in Node — keep it that way.
- Every bug fix comes with a test that fails without the fix. No new dependencies without a strong reason.
- Code and comments in English, UI text in Hungarian.

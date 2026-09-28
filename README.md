# zozz-sandbox

Egy apró bejelentkezős demo-alkalmazás a zozz-coder kipróbálásához.
Node 24, függőségek nélkül (nincs `npm install`).

```bash
npm start   # http://localhost:3000 — demo fiók: demo@example.com / demo1234
npm test
```

Ha 15 percen belül ötször hibás a jelszó, az adott e-mail címmel 15 percig nem lehet belépni
(a szerver újraindítása feloldja).

A `main` ág védett: minden változás pull requesttel kerül be.

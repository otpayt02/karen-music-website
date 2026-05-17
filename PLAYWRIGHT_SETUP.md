# Playwright Setup

## 1) Install dependencies

```bash
npm install
npx playwright install
```

## 2) Run tests

```bash
npm run test:e2e
```

Useful modes:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:debug
```

## Notes

- Tests auto-start the Flask app using:
  - `python -m flask --app app run --host 127.0.0.1 --port 5000 --no-debugger --no-reload`
- Base URL is `http://127.0.0.1:5000`.
- Current starter tests:
  - `tests/e2e/print-preview.spec.js`
  - `tests/e2e/only-span-layout.spec.js`

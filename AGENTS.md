# AGENTS.md

## Project
This is Karen's music website and music director database. The main app is served by `app.py`, with the primary page in `index.html`.

## Run
- Install Python dependencies with `pip install -r requirements.txt`.
- Install browser test dependencies with `npm install`.
- Start the local app with `python -m flask --app app run --host 127.0.0.1 --port 5000`.
- Local URL: `http://127.0.0.1:5000`.

## Verify
- After frontend changes, open the site in the browser and check desktop and mobile layouts.
- Run `npm run test:e2e` before finishing meaningful UI or app changes.
- Fix console errors, failed requests, and obvious layout overlap before reporting completion.

## Git Hygiene
- Do not commit secrets, `.env` files, generated test reports, virtual environments, or dependency folders.
- Keep old drafts, PDFs, and audio exports local unless the user explicitly asks to publish them.
- Prefer focused changes to `app.py`, `index.html`, `tests/`, and project setup files.

---
name: karen-music-ui-guardian
description: Preserve Karen Music Director behavior, data, print geometry, translations, notation, and keyboard workflows during UI redesign, responsive work, Sites adaptation, packaging, or design review in this repository.
---

# Karen Music UI Guardian

## Establish the two baselines

1. Treat `build/package-dist/KarenMusicDirector/_internal/index.html` and the packaged desktop executable as the recognizable visual baseline.
2. Treat current `index.html`, `app.py`, `songs.db`, translations, tests, and documented decisions as the behavior and data baseline.
3. Never replace current behavior with the older packaged source.
4. Read `references/non-negotiables.md` before editing a user-facing surface.

## Work incrementally

1. Inspect the active runtime before editing.
2. Keep the sidebar, command bar, Chart/Lyrics/Database surfaces, paper canvas, section rails, measure grid, and footer geometry recognizable unless the user explicitly approves structural change.
3. Restrict visual work to tokens, hierarchy, spacing, labels, focus states, responsive collapse, and useful progressive disclosure.
4. Preserve modal logic, chord and notation rendering, import/export, print packets, translations, hotkeys, historical songs, and unsaved-import review.
5. Never publish `songs.db` or church material. Use explicitly selected sanitized songs for hosted demos.

## Verify

1. Run focused tests for the touched workflow.
2. Run `npm run test:e2e` for meaningful source changes.
3. Verify desktop, mobile, keyboard focus, print, and one empty/failure state.
4. Compare the served artifact with both baselines.
5. Record verified evidence and honest unrelated failures in `docs/codex/REQUEST_ADHERENCE_LEDGER.md`.


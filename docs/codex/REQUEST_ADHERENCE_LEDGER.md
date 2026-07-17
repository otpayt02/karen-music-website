# Request adherence ledger

Last updated: 2026-07-16

## Active request: one-file chord-chart import

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| A1 | Create a reusable skill for the Karen Music chord-chart import workflow. | implemented | reported with evidence | `C:\Users\olive\.codex\skills\import-karen-chord-chart\SKILL.md`; validator and smoke client passed. |
| A2 | Accept a Karen Music chart-code JSON file. | implemented | reported with evidence | `POST /api/import/json`; backend and browser tests. |
| A3 | Accept text and ChordPro chart code. | implemented | reported with evidence | `POST /api/import/code`; `tests/fixtures/import-chart.chordpro`; live unsaved-draft browser proof. |
| A4 | Accept a handwritten or printed chord-chart image and use OCR. | implemented | reported with evidence | `POST /api/import/vision`; provider fallback; live Gemini import of `chart_hand/Youth/move_your_boat_sheet.jpg`; mocked browser review test. |
| A5 | Accept a chord-chart PDF and use document vision. | implemented | reported with evidence | PDF MIME/extension routing, shared vision schema, mocked backend route test. |
| A6 | Show every field, notation rule, image-quality rule, privacy boundary, and review rule the importer uses. | implemented | reported with evidence | Criteria-first Import modal and `GET /api/import/criteria`; desktop/mobile proof images. |
| A7 | Fill the active chord editor when the operator presses Import and applies the reviewed result. | implemented | reported with evidence | Import review -> **Fill the chord editor**; browser proof shows title, key, chords, marks, and `currentSongId: null`. |
| A8 | Provide a current outline of every app feature. | implemented | reported with evidence | `docs/CURRENT_FEATURE_MAP.md`, including implemented, partial/scaffolded, and migration-only surfaces. |
| A9 | Visualize the current app and import workflow. | implemented | reported with evidence | Interactive feature map artifact `karen-music-feature-map.html`. |
| A10 | Successfully translate any handwriting or layout without exception. | partially implemented | reported with evidence | Broad accepted formats and provider fallback are implemented, but ambiguous/cropped handwriting cannot be guaranteed; the UI exposes confidence, missing fields, and warnings for human correction. |

## Verification record

- `python -m pytest tests\test_backend.py tests\test_import_export.py -q`: 12 passed.
- `npx playwright test tests/e2e/song-import.spec.js --project=chromium`: 3 passed.
- Full `npm run test:e2e`: 38 passed and 10 unrelated existing UI/layout expectations failed in the dirty worktree. Import tests remained green.
- Browser proof: 1440x1000 and 390x844 import modal, zero console errors after removal of the stale `/src/tailwind.css` request.
- Live OCR proof: one real handwritten chart image completed through Gemini with a reviewable result.
- Skill proof: `quick_validate.py` passed; `inspect_import.py` produced an unsaved ChordPro draft through the running app.

## Deferred by project

### Diverse handwriting and multi-page PDF accuracy corpus

- Status: deferred.
- Reason: the importer and review gate are complete, but one handwriting sample and a mocked PDF route do not establish accuracy across arbitrary writers, lighting, page order, or multi-page layouts.
- Exact next action: assemble a private, permission-cleared corpus of at least three handwriting styles plus one real multi-page chord PDF; record expected metadata, section, measure, chord, bass, and mark values; run `scripts/inspect_import.py`; then add fixture-based regression cases for every corrected failure.
- Privacy boundary: do not publish worship-team charts, names, or provider payloads without explicit approval.

### Existing full-suite UI regressions

- Status: deferred.
- Reason: ten failures concern database metadata presentation, Karen hotkey/settings visibility, Only-span layout expectations, zoom/legacy repair/lead-modal behavior, design preset names, and sidebar scrolling. They predate or sit outside the one-file import scope and overlap unrelated dirty worktree changes.
- Exact next action: handle the failures in a dedicated regression task, beginning with a clean baseline comparison and preserving the current import tests as a locked green contract.

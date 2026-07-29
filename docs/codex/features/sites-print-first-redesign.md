# Feature: print-first Sites redesign

## User outcome

The music director can edit a chord chart on a white Letter-ratio page, open a dedicated print room, inspect each instrument copy by page number, and print one physical Letter page per instrument plus Reference.

## Current evidence

- Existing behavior: isolated local print packets and the first private Sites replica already existed.
- Entry point: `sites/karen-music-director/app/music-director.tsx`.
- Data and persistence: sanitized hosted songs use D1. The local `songs.db` remains private and unchanged.
- Verification: `npm.cmd test`, `tests/e2e/sites-replica.spec.js`, screenshots, and a rendered three-page PDF.

## Scope

- In:
  - Karen village and mountain stage.
  - White 8.5:11 editor paper and exact 8.5 x 11 inch print pages.
  - Editable fixed header and footer fields.
  - Print-room dialog with numbered page navigation.
  - One centered instrument label per page plus Reference.
  - Neutral section headings without colored tags or rails.
  - Multiplicative zoom steps and reduced-motion fallback.
- Out:
  - Full sidebar and toolbar migration.
  - Context menu and hover-routed scrolling.
  - Karen keyboard and modal redesign.
  - Attachment ingestion, quality classification, and AI ground-truth corpus.
  - Uploading local songs, images, handwritten notes, or church documents to Sites.
- Behavior to preserve:
  - Chart, Lyrics, Database, import/export, hosted save, measure insertion, startup wizard gating, light/dark mode, and mobile toolbar.
- Assumptions:
  - "Background of the paper" means the scene behind the white paper. The photograph must not print.
  - Reference remains an additional print copy.
- Dependencies:
  - Existing Sites project and sanitized demonstration data.

## Experience flow

1. User edits the chart on the Letter-ratio paper.
2. User presses Print.
3. The print room opens on page 1 and lists one page per instrument plus Reference.
4. The user selects pages with numbered pagination and verifies the centered footer label.
5. Print all copies sends the isolated Letter pages to the browser print system.

## Implementation contract

- UI: fixed-ratio paper, village stage, print-room dialog, numbered pagination.
- Domain logic: derive print copies from selected instruments plus Reference.
- API or service: no new API; D1 fallback remains a visible local state.
- Data shape: no local database or private attachment data copied to Sites.
- Loading: existing app-ready gate remains.
- Empty: no selected instruments still yields Reference.
- Failure: unavailable hosted library keeps the draft local and reports that state without a console error.
- Accessibility: labeled dialog, pagination landmark, current page, disabled previous/next, keyboard Escape, focus-visible styles.
- Responsive behavior: zero horizontal overflow at 390 pixels; paper content remains inside the fixed page.
- Observability: status line and page caption state the current draft and selected print page.

## Safety and cost

- Secret boundary: no credentials in source or client logs.
- Private data: `songs.db`, private charts, notes, and provider payloads stay local.
- Paid calls: none added.
- External actions: private Sites deployment only.
- Approval gates: explicit song-by-song approval before any real song or attachment is hosted; explicit approval before changing access.

## Acceptance

- [x] Primary path works in the real browser runtime.
- [x] Empty hosted-library state is visible and recoverable.
- [x] Existing focused behavior still works.
- [x] Build and five focused browser tests pass.
- [x] Displayed page count and instrument labels match print output.
- [x] Prior Sites version remains available for rollback.

## Proof

- Commands: `npm.cmd test`; focused Playwright suite.
- Runtime interaction: Print -> numbered page 2 -> Acoustic Guitar -> Print all copies.
- Screenshot: `output/playwright/sites-karen-music-director-phase-1/print-room.png`.
- PDF: `output/pdf/sites-print-room-phase-1.pdf`.
- Remaining limitation: a physical printer was not used; the browser-generated PDF is the current paper proof.

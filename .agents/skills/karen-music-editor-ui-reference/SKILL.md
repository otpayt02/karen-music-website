---
name: karen-music-editor-ui-reference
description: Preserve and navigate every Karen Music Director interface surface, control, state, modal, keyboard focus route, responsive behavior, theme, language, zoom, save, import, export, print, lyrics, database, and chart-editing UI contract in this repository. Use for UI changes, regression reviews, help documentation, or behavior-preserving redesigns in index.html.
---

# Karen Music Editor UI Reference

## Apply the contract

1. Confirm the repository is `C:\Users\olive\Projects\music_director_database\karen_music_website`.
2. Read `references/editor-ui-contract.md` for the surface or control being changed.
3. Read `docs/codex/LEGACY_CHORD_EDITOR_CONTRACT.md` when touching notation, measures, keyboard entry, paper geometry, or print.
4. Treat current `index.html`, `app.py`, and tests as behavior authority. Use the packaged desktop page only as a visual reference.
5. Preserve historical songs, S'gaw Karen input, translations, chart/lyrics/database surfaces, imports, exports, print packets, and keyboard focus routing.
6. Keep visible controls functional, labeled, keyboard accessible, touch reachable, and responsive.
7. Verify the served app on desktop and mobile, one happy path, and one blank or failure state. Run the focused test and `npm.cmd run test:e2e`.

## Change boundary

- Make incremental changes; do not replace the editor algorithms or data model for a shell adjustment.
- Use native HTML/CSS/JavaScript patterns already present. Astryx is reference-only because this surface is not React.
- Never publish `songs.db`, private charts, attachments, or provider payloads.

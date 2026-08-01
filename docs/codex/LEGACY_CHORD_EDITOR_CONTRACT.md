# Legacy chord editor contract

Last verified: 2026-07-26

Authority:

- Behavior and data: `index.html`, `app.py`, current tests, and this contract.
- Visual baseline: `build/package-dist/KarenMusicDirector/_internal/index.html`.
- Common print format: `chart_images/first_flawless_printout.pdf`, `good_song.pdf`, and related approved printouts.
- Hosted implementation: `sites/karen-music-director/app/music-director.tsx`.

## Keyboard contract

| Keys | Required behavior |
| --- | --- |
| Arrow Left / Right | Move by beat; Right creates a full measure after the last beat of the section. |
| Arrow Up / Down | Preserve the beat column while moving between visual rows or adjacent sections. |
| Space | Move forward; create a measure after the last beat. |
| Tab | Insert a full measure immediately after the indexed measure and select beat 1. |
| Ctrl+Space | Insert a measure whose length equals the current one-based beat position. |
| Ctrl+Tab | Split the current measure after the active beat. |
| Ctrl+1 through Ctrl+6 | Insert an exact 1-6 beat measure after the current measure. |
| Backspace | Remove the latest visible beat change, move backward through empty beats, remove an empty trailing measure, or remove an empty pre-measure. |
| Delete | Remove the current measure; when appropriate, remove the last empty section. |
| Escape | Clear pending bass, superscript, slur, and Only/All In states or close the active editor modal. |
| A-G | Enter a root chord. An empty beat plus B creates B. |
| B after a root | Toggle flat. |
| M | Toggle minor. |
| 7 | Toggle a plain seventh. |
| T then 7 / 8 / 9 | Enter triangle-seven, sus, or aug. |
| Ctrl+S / Ctrl+A | Direct sus / aug quality shortcuts. |
| / then A-G | Add slash bass; slash again clears an existing bass. |
| . | Toggle a push/dot with underline on a rooted beat. |
| X | Cycle zero through four x marks. |
| O | Toggle a circle and clear dot/x marks when enabled. |
| R | Toggle a measure-level roll. |
| S | Start or finish a slur. |
| comma | Start or finish an Only / All In span. |
| L | Open lead melody editing for the current measure. |
| Enter | Open Add Section. |
| I / V / P / C / B / S / E in Add Section | Add Intro, Verse, Pre-Chorus, Chorus, Bridge, Solo, or Ending. |
| Ctrl+Z / Ctrl+Y | Undo / redo chart edits. |
| Ctrl+P | Open the first print-room page. |
| ? | Open the complete shortcut guide. |

## Editor feature contract

- Sections: Intro, Verse, Pre-Chorus, Chorus, Bridge, Solo, and Ending.
- Insert before/between/after sections; delete sections.
- Optional one-beat pre-section measure in the left margin.
- Add, delete, split, and insert variable-length measures without changing later measure contents.
- Default row capacity is eight measures.
- Each section and each visual row may override its measure capacity from 4 through 16.
- A row always uses its configured number of logical grid slots and never grows past the paper width.
- Measures use equal-width tracks by default. A chord-dense measure may receive a larger fractional track; every sibling track yields the same proportional share, and unused logical slots remain blank.
- Variable-beat measures occupy one measure slot; their beats divide that slot evenly.
- The final existing measure in every section owns its ending bar immediately, including immediately after insertion.
- Section headings are the only section labels; no adjacent chips, pills, duplicate words, or colored section tags.
- Hover/focus feedback applies independently to section, visual row, measure, beat, and lead row.
- Active beat and active measure remain visibly distinct from hover.
- Beat rendering includes root, flat, minor, seventh, triangle-seven, sus, aug, slash bass, circle, dot/push, x marks, manual underline, and roll.
- Arrangement rendering includes Only / All In spans, slurs, lead rows, base octave, subdivisions, note cells, and instrument cues.
- Lead modal retains octave, per-beat spacing, note entry, clearing, navigation, and undo/redo behavior.
- New Song resets directly to a blank keyboard-ready editor. Add Section, lead, instrument, shortcuts, Karen keyboard, import review, print, and lyrics-section dialogs remain explicit triggers rather than startup blockers.
- Editing retains undo/redo, JSON import/export, unsaved-import review, Karen input, and saved chart compatibility.

## Paper and print contract

- The white editor surface and every printed copy use exact Letter proportions: 8.5 x 11 inches.
- Header fields remain editable and fixed at the top.
- Karen title, typed/suggestion-backed Style, and Key share the primary header line and type size; English sits directly below Karen; Key is right-aligned and remains a select.
- Footer fields remain fixed to the page bottom.
- Header/footer geometry does not move when measures are edited.
- Print opens page 1.
- Pagination shows one page per selected instrument plus Reference.
- Exactly one centered instrument belongs to each physical page.
- Editor and print views use the same section, row-capacity, measure-width, beat, annotation, lead, and ending-bar rendering rules.
- No horizontal or vertical page overflow is allowed.
- Wheel input belongs to the scrollable control or region currently under the pointer; nested scroll never continues in a previously clicked region.
- Pointer edits inside the chord body preserve the current visible viewport; programmatic focus uses `preventScroll`.

## Current proof

- Browser geometry: 8 computed columns, fixed 1 px header/footer boundaries, Letter proportions, and zero paper overflow.
- Browser flows: every distinct shell control; chord/minor and full locked-shortcut entry; 55 Karen characters plus physical mappings; cue ranges; per-beat lead spacing and navigation; synthetic import review; approval-gated persistence payload.
- Mobile: 390 x 844 viewport retains the details drawer, paper work surface, and fixed five-action toolbar without horizontal document overflow.
- API: unauthenticated private-library access returns 401; owner scoping and review/content-approval gates are enforced before D1 writes.
- Screenshots: `output/playwright/sites-parity-2026-07-26/` contains sanitized editor, Karen keyboard, import-review, lead/cue, and mobile proof.
- PDF: `output/pdf/sites-legacy-editor-first-page-print.pdf` contains three 612 x 792 point pages.

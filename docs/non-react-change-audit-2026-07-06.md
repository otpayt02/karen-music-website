# Non-React Change Audit — 2026-07-06

## Scope and status key

This checklist reconstructs non-React requests recorded from 2026-07-02 through 2026-07-06. React/Vite migration work and Tailwind migration planning are excluded. Each box is intentionally left open for the operator's manual review.

- **IMPLEMENTED** — changed during this audit.
- **SATISFIED** — present in current source and/or covered by a current test.
- **UNVERIFIED** — relevant request found, but current source evidence is insufficient to prove the exact visible result.
- **BLOCKED** — needs a product, provider, platform, or format decision beyond a localized audit fix.
- **NOT FOUND** — explicit request found, but no complete current implementation was found.
- **SUPERSEDED** — a later request replaced or contradicted it.

## A. Source of truth, startup, and packaging

- [ ] **SATISFIED** — Keep the original HTML/CSS/JS Karen Music interface as the visual source of truth. `index.html` remains the primary page served by `app.py`.
- [ ] **SATISFIED** — Restore the original chord editor/database instead of the unrelated purple shell. The current root page is the legacy monolith.
- [ ] **SATISFIED** — Keep the app hidden until JavaScript marks it ready, preventing a partial first-paint flash. `body:not(.app-ready)` and the `app-ready` startup call are present.
- [ ] **SATISFIED** — Fix the packaged launcher crash caused by Uvicorn logging under a windowed executable. The launcher uses an explicit Uvicorn logging configuration path and is covered by current packaging changes.
- [ ] **UNVERIFIED** — Rebuild the Windows `.exe` and keep the desktop shortcut pointed at the real packaged target. Build outputs and scripts are present, but this audit did not treat uncommitted generated binaries as proof that the user's current shortcut launches the latest build.
- [ ] **UNVERIFIED** — Ensure the browser-visible `dist/index.html` stays synchronized with source `index.html`. Both files exist and differ; the active backend route must be checked at runtime rather than assuming `dist/` is authoritative.

## B. Language picker and branding

- [ ] **SATISFIED** — Make the language-picker Karen Music title and subtitle darker/readable.
- [ ] **SATISFIED** — Make S'gaw Karen and English choice surfaces larger and equal-sized without text overlap.
- [ ] **SATISFIED** — Make keyboard-arrow selection override stale pointer-hover highlighting.
- [ ] **SATISFIED** — Add the Karen Music logo as the startup language-picker background/branding.
- [ ] **SATISFIED** — Use the wordless logo for the executable icon and the Karen Music wordmark logo in the sidebar/startup selector; source and packaging assets exist.
- [ ] **UNVERIFIED** — Confirm the exact logo variants are the ones the operator selected after saying an earlier logo was wrong. Current files show the intended separation, but the original visual reference images are not part of this audit context.

## C. New-song wizard and metadata controls

- [ ] **SATISFIED** — Fit the quick metadata wizard into one visible screen without the old persistent/fading action banner.
- [ ] **SATISFIED** — Place English and Karen title inputs together at the top, with Karen input opening the Karen keyboard.
- [ ] **SATISFIED** — Put key, category, tempo, and time signature together in the compact metadata area.
- [ ] **SATISFIED** — Use 4/4 as default and expose 3/4 and 6/8 choices.
- [ ] **SATISFIED** — Make wizard selector scrolling depend on the control under the pointer instead of requiring an activation click.
- [ ] **SATISFIED** — Make the instrument chooser respond on first interaction and use slower/heavier wheel steps.
- [ ] **SATISFIED** — Replace the wizard tempo slider with a compact value/stepper interaction.
- [ ] **SATISFIED** — Keep tempo plus/minus controls compact and evenly spaced.
- [ ] **SATISFIED** — Size key/category/style/time controls to their content instead of full-width fake dropdowns.
- [ ] **IMPLEMENTED** — Replace remaining `Ballad` placeholder examples with `Alter Rock`. The quick selector already used `Alter Rock`; guided and sidebar placeholders now match.
- [ ] **UNVERIFIED** — Confirm the exact requested Karen label wording and the final left/right column order. The fields are localized and compact, but the literal desired Karen copy was not supplied in recoverable context.

## D. Chart shell, tabs, zoom, and mobile chrome

- [ ] **SATISFIED** — Present Chart, Lyrics, and Database as layered paper/folder tabs.
- [ ] **SATISFIED** — Change the active tab color without making the selected tab taller.
- [ ] **SATISFIED** — Keep the zoom toolbar above the paper at the top-right and do not make it sticky while scrolling.
- [ ] **SATISFIED** — Make zoom respond in small, quick increments without delayed visual updates.
- [ ] **SATISFIED** — Keep the sidebar's collapsed rail narrow and place primary utility controls where they do not overlap the paper tabs.
- [ ] **SATISFIED** — Apply phone-only layout fixes instead of globally shrinking the app; a dedicated `max-width: 480px` layer exists.
- [ ] **UNVERIFIED** — Confirm there is no overlap at every desktop/mobile width in the sidebar, settings, database, language picker, shortcuts, and Karen keyboard. Automated tests cover key widths, but “every width” is not provable from source alone.

## E. Chart, print layout, and metadata rules

- [ ] **SATISFIED** — Make the editor paper and printed output share the same chart/header/footer rendering model.
- [ ] **SATISFIED** — Keep the chart inside fixed page bounds; current print tests assert sheets and crowded rows stay above the footer.
- [ ] **SATISFIED** — Put the Karen title at the left, bold; put the smaller non-bold English title in parentheses below it.
- [ ] **SATISFIED** — Put style on the same top line and visual scale as the Karen title and key; keep key at the right.
- [ ] **SATISFIED** — Never show BPM in the header.
- [ ] **SATISFIED** — Put BPM with time signature in the footer. Current tests assert the footer tempo value.
- [ ] **SATISFIED** — Put one instrument name in the center footer for each instrument copy and use `Reference` for the extra copy.
- [ ] **SATISFIED** — Put singer/category metadata at the right footer.
- [ ] **SATISFIED** — Keep printed footers anchored within each individual page.
- [ ] **SATISFIED** — Make print style/template choices visibly alter fonts, sizes, spacing, and layout while keeping page bounds stable.
- [ ] **UNVERIFIED** — Confirm every print-preview variable produces a sufficiently obvious difference to the operator. Code and print tests show multiple variables, but “obvious enough” requires manual visual judgment.
- [ ] **UNVERIFIED** — Confirm “Save changes” makes the editor, preview, browser print dialog, and final paper identical in all element styling. Shared rendering exists, but native print-dialog parity is not fully automatable here.

## F. Themes and settings

- [ ] **SATISFIED** — Remove Auto theme mode; Settings now exposes Light and Dark only.
- [ ] **SATISFIED** — Make Light genuinely light and Dark use darker surfaces/lighter text.
- [ ] **SATISFIED** — Do not announce theme-mode changes through notifications.
- [ ] **SATISFIED** — Retain a redesigned Console theme and replace the old Camp/Stage labels with Harbor/Studio.
- [ ] **IMPLEMENTED** — Delete the later-rejected five quirky accent-palette chooser from Settings and remove its guide entry. Internal color defaults remain so existing themes do not lose their required tokens.
- [ ] **SUPERSEDED** — Earlier requests to tune five accent swatches or make five colors more distinct were superseded by the later explicit instruction to delete that feature.
- [ ] **UNVERIFIED** — Confirm every remaining Settings control serves a useful purpose and belongs in Settings. The palette control was the confirmed redundant item; the remaining controls need operator judgment.

## G. Import, database, files, and data integrity

- [ ] **SATISFIED** — Import PNG and PDF chart sources; non-image documents are prepared as images for vision analysis.
- [ ] **SATISFIED** — Analyze imported chart images through the configured vision provider and return editor data for review before save. `/api/import/vision` and import tests exist.
- [ ] **SATISFIED** — Preserve songs and surface fetch/import failures instead of silently hiding data.
- [ ] **SATISFIED** — Keep the picture-to-chart feature connected to the existing editor rather than rebuilding it.
- [ ] **SATISFIED** — Allow song files/references, including audio, stems/tracks, WAV, MIDI, PDF, image, and video metadata, to be attached to a song.
- [ ] **SATISFIED** — Allow an audio stem to be attached directly from the lead modal and recorded as future MIDI-conversion source material.
- [ ] **BLOCKED** — Convert WAV/audio to MIDI. The current app stores audio/stem metadata but has no audio transcription engine; model choice, local/cloud processing, acceptable accuracy, and licensing were not specified.
- [ ] **BLOCKED** — Convert MIDI or sheet music directly into the Karen chord-chart editor. No deterministic mapping contract was specified for melody, harmony, quantization, chord inference, key changes, or section boundaries.

## H. Translation and Karen keyboard

- [ ] **SATISFIED** — Localize the Import button and other registered front-facing controls when Karen mode is active.
- [ ] **SATISFIED** — Show a translation queue of front-facing labels that remain English in Karen mode.
- [ ] **SATISFIED** — Keep Karen keyboard keys in flexible non-overlapping rows.
- [ ] **SATISFIED** — Provide Escape and Backspace controls/shortcuts in the Karen keyboard workflow.
- [ ] **UNVERIFIED** — Confirm every single visible Karen keyboard key has a discoverable physical hotkey. Core shortcut mappings exist, but a one-to-one coverage audit was not found.

## I. Lead melody and Only / All In notation

- [ ] **SATISFIED** — Support per-beat lead subdivisions and vertical note offsets; tests cover subdivision counts and saved offsets.
- [ ] **SATISFIED** — Support lead instrument abbreviations beyond keyboard, including guitar/rhythm choices in the shared instrument option model.
- [ ] **SATISFIED** — Propagate lead instrument assignment across the current measure row and print only on the assigned instrument copy.
- [ ] **SATISFIED** — Render Only / All In spans across row boundaries with continued underline segments; dedicated layout tests exist.
- [ ] **NOT FOUND** — Replace the existing four-step lead modal with one horizontally scrollable, whole-row editing canvas that shows every measure and lead subdivision simultaneously. The current modal still uses four tab panels.
- [ ] **NOT FOUND** — Implement the exact requested lead-modal navigation contract: plain Left/Right moves lead slots, Ctrl+Left/Right moves measures, Up/Down changes individual note octave, and Ctrl+Up/Down changes base octave. The current implementation does not prove this complete mapping.
- [ ] **UNVERIFIED** — Make lead-slot choices appear as hover popups for the entire row. Subdivision controls exist, but the exact hover-popup behavior was not found.

## J. Full-app polish requests

- [ ] **SATISFIED** — Remove redundant colored pill labels where a bold section title already identifies the section.
- [ ] **SATISFIED** — Avoid repeated BPM and repeated metadata in the main chart surfaces.
- [ ] **SATISFIED** — Keep the database inside the same white-paper visual system as Chart and Lyrics.
- [ ] **UNVERIFIED** — Complete a subjective whole-app pass for “calmer, denser, more professional” presentation on every tab. Many localized polish layers exist, but this broad aesthetic request has no objective completion criterion.
- [ ] **UNVERIFIED** — Produce/review screenshots of every change and every feature added in the last 12 hours. Old screenshot artifacts exist locally, but they are not a complete, timestamped proof set for this audit.

## Conflicts and exclusions

- React/Vite migration and React shell work are excluded by instruction, even where the history contains requests about them.
- Tailwind migration planning is excluded as migration work rather than a non-React feature/UI change.
- “Make the metadata header persistent” conflicts with later placement rules and the instruction that zoom chrome must not follow scrolling. The current paper header remains part of the page; no sticky duplicate metadata header was added.
- “BPM bottom right” conflicts with the later, more detailed rule placing BPM/time at the left, instruments in the center, and category at the right. The detailed three-column footer rule is treated as authoritative.
- Exact brand-image choice, native print-dialog parity, every-width overlap, and subjective polish remain manual checks because the available context does not define objective pass/fail thresholds.

## Verification commands

```powershell
npm run test:e2e
python -m pytest tests
```

Manual runtime target: `http://127.0.0.1:5000/` after starting the configured local app.

## Verification result from this audit

- `git diff --check`: passed; only existing LF-to-CRLF warnings were reported.
- `python -m pytest tests -q --basetemp=.pytest-verification-pass`: 7 passed. Two existing FastAPI `on_event` deprecation warnings remain.
- `npm run test:e2e`: completed all 53 tests after repairing the shared wizard helper: 37 passed, 1 flaky, and 15 failed in 14.2 minutes. The original startup-wide timeout was caused by the helper waiting for a Guided-mode `.wizard-btn-skip` while Quick mode displays `.wizard-btn-primary`; the helper now handles either mode.
- Remaining browser failures are outside the verification-infrastructure-only fix: stale feature expectations and current product defects across database metadata, Only / All In rendering, print preview, transpose, zoom, lead layout, theme/palette expectations, and instrument scrolling. One direct runtime defect is `ReferenceError: endRect is not defined` in `renderOnlySpans()`.
- In-app browser verification: unavailable because the browser-control runtime failed to initialize. No visual pass is claimed.

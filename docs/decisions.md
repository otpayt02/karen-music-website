# Decisions

## 2026-07-28 - Let the paper own metadata and the sidebar own workspace utilities

- Decision: keep title, style, key, BPM, time signature, instruments, and Group editable on the chord-chart paper; use the sidebar only for mutually exclusive Settings and Library panels.
- Time-signature rule: allow 2/4, 3/4, 4/4, and 6/8; default every new chart and unsupported imported/saved value to 4/4.
- Navigation rule: retain only Chart and Lyrics paper tabs; move the hosted song database into the Library sidebar panel.
- Why: metadata belongs with its printed context, while settings and song retrieval are workspace utilities rather than paper surfaces.
- Verification: lint, production build, source contract, and all 14 synthetic Chromium journeys passed.

## 2026-07-28 - Use one seven-instrument vocabulary for editing and print copies

- Decision: allow only Piano 1, Piano 2, Acoustic Guitar, Electric Guitar, Drums, Electric Bass, and Keytar in both instrument checkbox dropdowns and persistence paths.
- Compatibility rule: map legacy Bass to Electric Bass, preserve valid values in selection order, remove duplicates, and discard unsupported values such as Strings.
- Why: editor selection, imported drafts, hosted records, and per-instrument print pages must use the same rehearsal vocabulary.
- Verification: lint, production build, source contract, and all 14 synthetic Chromium journeys passed.

## 2026-07-28 - Treat Group and BPM as bounded song metadata

- Decision: use one five-value Group allowlist across the sidebar, paper footer, print preview, imports, library loads, and hosted saves; use a 55–155 integer range slider for BPM.
- Why: these fields are operational rehearsal metadata, not open-ended prose, and must remain consistent between editing, printing, importing, and safe hosted persistence.
- Compatibility rule: legacy or imported group labels are mapped to the nearest allowed category, with Praise & Worship as the safe fallback; BPM is rounded and clamped.
- Verification: lint, production build, source contract, and all 14 synthetic Chromium journeys passed, including exact option order and both slider endpoints.

## 2026-07-28 - Let chord density redistribute one fixed row budget

- Decision: retain eight logical tracks by default, but give a chord-dense measure a larger fractional track while every sibling track yields an equal proportional share.
- Why: this keeps long chord symbols legible without expanding the Letter paper, wrapping chords, or moving the fixed header/footer.
- Pre-measure rule: creating a pre-measure selects its single beat immediately and gives lead editing six subdivisions, matching the local editor.
- Typography rule: use the local editor's Instrument Sans, Fraunces, IBM Plex Mono, and Noto Sans Myanmar roles; keep the root larger than its modifiers.
- Color rule: apply distinct, barely visible section-wide washes rather than colored section-name tags.
- Verification: browser geometry confirmed weighted sibling widths, eight logical tracks, zero paper overflow, centered style/footer controls, root sizing, and mobile reachability.

## 2026-07-28 - Make Karen input a global mode with a stable form dialog

- Superseded decision: routing every non-English text, search, and textarea field into the Karen modal was replaced by the narrower Karen-title-only trigger on 2026-07-28.
- Decision: only the Karen title textboxes may open the Karen keyboard modal; the trigger is enabled by default, while ordinary style, group, lyrics, search, and English-title fields retain normal text entry.
- Why: the user needs the same input method across metadata, lyrics, library search, and editor fields without changing English-title entry.
- Commit rule: character keys and physical mappings update the target; Enter confirms the visible value and exits; Escape exits without adding a character.
- Motion rule: use a floating shadow pulse instead of moving key boxes so touch/click targets remain stable; hover fades from dim to bright.
- Accessibility rule: use `aria-modal="true"`, preserve keyboard focus, keep reduced-motion support, and raise the mobile header above the open sidebar so Settings remains reachable.
- Verification: all 55 keys, physical A-Z/Shift mappings, Enter, Escape, Undo/Redo, hover brightness, desktop/mobile geometry, and English-title exemption passed.

## 2026-07-28 - Centralize Sites restart safety in one reusable skill

- Decision: create global `$restart-karen-music-sites` with one project-specific PowerShell launcher instead of repeating ad hoc port and process commands.
- Why: stale listeners and stale browser URLs have repeatedly made source/runtime state hard to distinguish.
- Safety boundary: stop port 4177 only when the listener or its parent chain contains the exact isolated Sites project path; refuse unrelated listeners.
- Setup boundary: require Node 22+, use the real npm `dev` script, install only when `node_modules` is missing, and keep logs outside the repository.
- Verified result: two live invocations changed the listener PID and `http://localhost:4177/` returned 200 with title `Karen Music Director`.
- Known limitation: the Codex shell runner remains attached to the background descendant and times out; no third repair was attempted after the two bounded failures.

## 2026-07-26 - Gate hosted persistence by identity, review, and content approval

- Decision: derive an owner key from the authenticated Sites identity, filter every D1 read/write by that key, and require both reviewed state and a synthetic-or-explicitly-approved confirmation before saving.
- Why: hosted convenience must not turn local church material, imports, images, provider payloads, or `songs.db` into an automatic publication path.
- Storage boundary: store the hashed owner key and chart JSON only; do not store the email address or the UI-only approval object.
- Failure boundary: anonymous requests return 401, oversized/unreviewed requests are rejected, and server failures return a generic keep-the-draft message.
- Deployment state: implementation and local browser/API verification passed; the production update is blocked by a Sites repository timeout, so hosted D1 behavior is not claimed as verified.

## 2026-07-26 - Add advanced parity around the paper instead of redesigning it

- Decision: keep the eight-column Letter paper, fixed header/footer, vertical tabs, and existing shell; add the Karen keyboard as a bottom tray and keep import/lead/persistence work in explicit modals.
- Why: the locked contract makes editor geometry and keyboard behavior product behavior, not decoration.
- Cue rule: no more than two instrument ranges per visual row, with legacy abbreviations and normalized start/end positions.
- Import rule: stage and inspect first; apply only as an unsaved draft; Save remains a separate approval gate.
- Verification: all distinct shell controls, 55 keyboard characters, physical mappings, lead navigation, cue controls, and locked shortcuts passed 11 focused Chromium tests.

## 2026-07-26 - Restore the legacy editor contract instead of extending the simplified replica

- Decision: make current `index.html` and the packaged legacy shell the editor behavior/visual authorities; the Sites editor must use the same eight-slot row, variable-beat, ending-bar, shortcut, notation, modal, and print rules.
- Why: the simplified four-wide flex layout changed the writing method, measure alignment, and visible output.
- Row rule: default to eight equal measure slots; fewer measures occupy only their own slots; row controls may set 4-16.
- Ending-bar rule: derive the ending bar from the final current measure on every render, so insertion never waits for another measure.
- Label rule: render one plain section heading, without a duplicate chip or color tag.
- Print rule: retain the new fixed editable header/footer and first-page instrument pagination.
- Evidence: four chart-image PDFs inspected; browser geometry measured; three exact Letter PDF pages rendered.

## 2026-07-26 - Treat the village image as the stage, not printable content

- Decision: place `karen-village-aerial.png` behind the white paper and remove it from the print media path.
- Why: this gives the requested cultural/place direction without lowering chord-chart contrast or printing unnecessary ink.
- Alternative considered: use the photograph as a watermark inside every sheet.
- Rejected because: performers need a quiet, high-contrast page and the print contract must remain stable.

## 2026-07-26 - Make the print room the first redesign slice

- Decision: keep the editor route intact and make Print open a paginated modal with one Letter page per selected instrument plus Reference.
- Why: the user has three songs to prepare within 12 hours, and the performer-facing print path carries the highest immediate risk.
- Geometry: screen pages use an 8.5:11 ratio; print pages use exact 8.5 x 11 inch boundaries.
- Data boundary: no real local songs or attachments move to the hosted site without explicit song-by-song approval.
- Verification: five focused browser checks, desktop/mobile screenshots, zero console errors, and a three-page 612 x 792 point PDF.

## 2026-07-26 - Use Astryx as a contract before adding its beta dependency

- Decision: apply Astryx AppShell, ContextMenu, Pagination, and accessibility guidance without installing Astryx packages in this phase.
- Why: the existing Sites project is working, the user did not authorize dependency installation, and the first slice does not need a framework-level migration.
- Next gate: consider the package only during the shell phase after a component-by-component behavior inventory and a reversible smoke check.

## 2026-07-25 - Isolate the hosted replica from the desktop runtime

- Decision: build the Sites version under `sites/karen-music-director` rather than modifying or packaging the desktop runtime.
- Why: the packaged app is the visual reference, while current desktop source and tests remain behavioral authority.
- Data boundary: use D1 for hosted songs and begin with synthetic content; never upload `songs.db`.
- Astryx boundary: use AppShell and accessibility guidance without forcing the desktop single-file app into a framework migration.
- Access: deploy owner-only until the user explicitly changes access.
- Verification: production build, contract test, 4/4 browser checks, desktop/mobile screenshots, and successful private Sites deployment.

## 2026-07-25 - Ctrl+digit inserts exact-length measures

- Decision: Ctrl+1 through Ctrl+6 insert a new measure of that exact length immediately after the indexed measure.
- Why: this gives the music director a direct keyboard path for irregular measures while preserving the established insertion, history, and annotation-shift logic.
- Alternative considered: keep Ctrl+1 through Ctrl+4 assigned to manual underlines.
- Rejected because: the requested measure workflow explicitly assigns the same shortcuts; the in-app guide now documents the new contract.
- Pre-measure rule: Backspace applies existing smart deletion while content remains, then removes the empty pre-measure and returns focus to the first normal measure.
- Verification: all seven focused Playwright tests passed, including every requested beat count and preservation of the following measure.

## 2026-07-25 - Page wrapper owns print pagination

- Decision: wrap every cloned chart in a fixed 8.5 x 11 inch `.print-sheet`.
- Why: page breaks on the chart itself allowed multiple overlapping print rules to interact with continuous document flow.
- Alternative considered: add more `page-break-after` rules directly to `.chart-container`.
- Rejected because: it preserves the brittle shared-flow model and does not provide a hard clipping boundary.
- Verification: inspect wrapper geometry in Playwright, generate a real PDF, confirm page count, then render its pages to images.

## 2026-07-25 - Packaged shell is the rollback authority

- Decision: restore the desktop page from the exact HTML embedded in the current `.exe`, then transplant only the explicitly retained measure shortcuts, pre-measure deletion, and WYSIWYG print contract.
- Why: this gives the user the known working visual layout without carrying the rejected redesign into the desktop runtime.
- Data boundary: never replace or migrate `songs.db`; verify source/package hash and row count instead.
- Print boundary: each selected instrument and the extra Reference copy owns one fixed 8.5 x 11 inch `.print-sheet`, with its page-local label centered in the footer.
- Regression boundary: do not reintroduce newer redesign-specific DOM solely to satisfy stale tests; record those failures for a separate compatibility phase.
## 2026-07-28 - Make empty row capacity directly actionable

- Decision: keep all configured row slots visible, render uncreated slots as muted full-measure ghosts, and materialize every missing complete measure through the clicked slot.
- Why: the eight-slot paper remains legible while mouse/touch users can jump directly to a future measure without a separate Add Measure control.
- Boundary: ghost slots exist only in the editor; print output contains created measures only.
- Settings rule: the sidebar is now Song Library only; Karen keyboard and metadata vocabularies live in the header Settings menu, while theme and the full `?` guide stay on the paper rail.
- Data boundary: no `songs.db`, chart image, or real song content is used by the hosted candidate.
- Verification: direct browser interaction, production build, source-contract test, 13/14 full Chromium journeys plus the corrected focused journey.

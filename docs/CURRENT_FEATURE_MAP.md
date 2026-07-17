# Karen Music Website current feature map

Audited: 2026-07-16

Source of truth: `index.html` for the active interface, `app.py` for the local API and data layer, `import_service.py` for chart ingestion, and `packaging/` for Windows delivery.

Status labels:

- **Implemented**: present in the active UI or API.
- **Verified in this pass**: exercised with a targeted test or live source.
- **Partial / scaffolded**: code or UI exists, but the full external workflow is not active.
- **Migration artifact**: retained in the repo but not the default interface.

## 1. App shell and song setup

- **Implemented** — English or Karen startup language choice with a persistent language toggle.
- **Implemented** — Direct entry into the editor after language selection; the new-song wizard opens from **New** rather than on every startup.
- **Implemented** — Quick and guided new-song modes for title, Karen title, style, key, category, time signature, tempo, and instruments.
- **Implemented** — Collapsible metadata sidebar, settings panel, keyboard-shortcut guide, toast feedback, and Chart / Lyrics / Database paper tabs.
- **Implemented** — Responsive desktop and phone layouts, scroll smoothing, keyboard focus management, and reduced UI density options.

## 2. Song metadata and planning

- **Implemented** — English and S'gaw Karen titles.
- **Implemented** — Category: Praise/Worship, Choir, Youth, Solo, or Kids.
- **Implemented** — Current key, preserved original key, and transposition to any chromatic target key using flat spellings.
- **Implemented** — Style and numeric tempo / BPM.
- **Implemented** — 3/4, 4/4, and 6/8 time signatures.
- **Implemented** — Piano 1, Piano 2, Electric Guitar, Acoustic Guitar, Electric Bass, Drums, and Keytar assignments.
- **Implemented** — Song group, freeform notes, created date, next-performance date, and performed-date history.
- **Implemented** — YouTube links, handwritten/photo links, and reference notes.
- **Implemented** — Editable paper-header titles, style, and key plus paper-footer group and instrument choices synchronized with sidebar metadata.

## 3. Chord-chart editor

- **Implemented** — Section types: Intro, Verse, Pre-Chorus, Chorus, Bridge, Solo, and Ending.
- **Implemented** — Insert a section between existing sections, delete sections, add/delete measures, and add a one-beat pre-section measure.
- **Implemented** — Default measures-per-row plus per-section and per-row measure-count controls.
- **Implemented** — Keyboard and pointer beat selection with left/right/up/down, Space, Tab, Enter, Backspace, Delete, and Escape workflows.
- **Implemented** — Chord roots A-G, flats/sharps, minor, seventh, major/triangle quality, additional quality text, and slash bass notes.
- **Implemented** — Circle marks, dot marks, up to four x marks, roll marks, manual underlines, Only spans, instrument cue labels, and slurs.
- **Implemented** — Insert an empty beat, split a measure, insert a measure after the current beat, and keep beat-indexed annotations aligned after edits.
- **Implemented** — Undo/redo history for chart editing.
- **Implemented** — Ctrl/Command-wheel zoom, touch pinch zoom, fit-to-width behavior, responsive beat sizing, equalized row heights, and content fitting to the paper.
- **Implemented** — Automatic ending bars, printable section structure, and current-beat focus recovery.

## 4. Lead melody and arrangement cues

- **Implemented** — Four-tab lead-melody modal opened from the chart keyboard workflow.
- **Implemented** — Base-octave selection and configurable note subdivisions per beat.
- **Implemented** — Keyboard-navigable lead-note grid, octave shifts, per-cell clearing, note offsets, and modal undo/redo.
- **Implemented** — Previous/next measure navigation while editing lead notes.
- **Implemented** — Instrument abbreviations and instrument ranges applied across chart beats and rows.
- **Implemented** — Per-instrument lead filtering in printed packets.
- **Implemented** — Audio-stem attachment from the lead modal.
- **Partial / scaffolded** — Audio can be attached as a future WAV-to-MIDI source, but automatic audio-to-MIDI conversion is not implemented.

## 5. Lyrics sheet

- **Implemented** — Dedicated Lyrics paper with song metadata and instruments.
- **Implemented** — Add, rename, and remove lyrics sections.
- **Implemented** — Karen lyrics field plus optional romanization and translation fields.
- **Implemented** — Toggle romanization and translation per section.
- **Implemented** — Singer timing map that groups lyric tokens into the chart's measures and beats.
- **Implemented** — Empty-state guidance and return to the Chart paper.

## 6. Song database and files

- **Implemented** — SQLite-backed song list and active-song metadata preview.
- **Implemented** — Search by title, Karen title, notes, and indexed song text.
- **Implemented** — Database paper with song count, metadata pills, notes preview, file list, and clickable song rows.
- **Implemented** — Attach an uploaded file or record a URL/local path with file name, kind, role, music/stem details, and notes.
- **Implemented** — Download stored files and remove file records.
- **Implemented** — Song-version snapshots on save.
- **Implemented** — Recovery of legacy JSON song files from chart-code/chart-image folders into the database.

## 7. One-file chart import and OCR

- **Implemented and verified in this pass** — Import button opens a criteria-first proofing desk instead of a bare file picker.
- **Implemented and verified in this pass** — Karen Music editor JSON (`.json`) is normalized locally into an unsaved editor draft.
- **Implemented and verified in this pass** — Text and ChordPro (`.txt`, `.cho`, `.crd`, `.pro`, `.chordpro`) parse locally with metadata headers, section labels, bar lines, chord tokens, slash bass, circles, dots, and x marks.
- **Implemented and verified in this pass** — Images (`.png`, `.jpg`, `.jpeg`, `.webp`) and PDFs route through the vision importer.
- **Implemented and verified in this pass** — Vision provider fallback order: Gemini, NVIDIA, then OpenAI when configured.
- **Implemented and verified in this pass** — Review panel exposes source/provider, confidence, sections, measures, recognized fields, missing fields, and warnings.
- **Implemented and verified in this pass** — **Fill the chord editor** applies the reviewed result as an unsaved draft; Save remains separate.
- **Implemented and verified in this pass** — Imported titles, keys, category, style, numeric BPM, instruments, notes, group, meter, sections, measures, chords, bass notes, circles, dots, and x marks map to the active editor data model.
- **Implemented and verified in this pass** — Import source, confidence, warnings, and review JSON are recorded for image/PDF imports.
- **Live proof in this pass** — `chart_hand/Youth/move_your_boat_sheet.jpg` completed with Gemini at 70% confidence, detecting the title, key C, 11 sections, and 38 measures with location-specific review warnings.
- **Honest limit** — No OCR system can guarantee every handwriting or layout. Low-quality, cropped, ambiguous, or descriptive-only fields remain warnings for human correction.

## 8. Save, export, and print

- **Implemented** — Create/update songs through the local API and persist chart, lyrics, metadata, instruments, group, files, and history in SQLite.
- **Implemented** — Export the full library as JSON, export the SQLite database, and export individual songs through API routes.
- **Implemented** — Browser save-file picker support with download fallback.
- **Implemented** — Instrument-specific print packets with filtered lead cues and page-by-page instrument labeling.
- **Implemented** — Print style presets derived from song style, bilingual/Karen display policy, dates, key/style/tempo/group metadata, and chart-fit preparation.
- **Implemented** — HTML-to-canvas chart capture during save when available.

## 9. Karen text and keyboard tools

- **Implemented** — Bottom Karen keyboard flap tied to the active Karen text field.
- **Implemented** — Caret-aware insertion, backspace, undo, redo, focus preview, and target restoration.
- **Implemented** — Direction and browser-suggestion guards for Karen text inputs.
- **Implemented** — Optional immersive Karen keyboard behavior.
- **Implemented** — Configurable A-Z base and Shift Karen hotkey mappings, enable/disable toggle, persistence, and reset.

## 10. Appearance, localization, and operator settings

- **Implemented** — Light and dark themes with persistent selection.
- **Implemented** — Three UI directions: Harbor, Console, and Studio.
- **Implemented** — Animated or steady motion and compact or comfy density.
- **Implemented** — Guided-wizard toggle, immersive-keyboard toggle, Karen hotkey controls, and Karen-on-sheets toggle.
- **Implemented** — Time-signature and default-measures-per-row controls.
- **Implemented** — Manual alternate song-folder setting.
- **Partial / scaffolded** — Native folder browsing returns no selected folder in the current backend stub; manual path entry remains available.
- **Implemented** — Built-in English/Karen strings, bilingual display policies, translation queue, and periodic translation override polling.
- **Partial / scaffolded** — Translation catalog/sync endpoints currently return empty or success-stub responses rather than a populated external catalog.

## 11. Desktop and migration surfaces

- **Implemented** — PyWebView desktop shell around the local FastAPI app.
- **Implemented** — PyInstaller Windows executable build, desktop-shortcut scripts, icon assets, and MSIX packaging path.
- **Implemented** — Browser route for the active legacy monolith and print deep links.
- **Migration artifact** — React/Vite/TypeScript source and `/redesign` remain available for migration work, but `index.html` is the active UI contract.

## Verification sources

- UI and interaction inventory: `index.html`
- API, SQLite, import records, export routes, and active serving path: `app.py`
- OCR, chart-code parsing, criteria, and provider fallback: `import_service.py`
- Import regressions: `tests/test_import_export.py` and `tests/e2e/song-import.spec.js`
- Windows delivery: `karen_music_desktop.py` and `packaging/`

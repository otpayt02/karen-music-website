# Karen Music Editor UI contract

## Global chrome

- `#sidebar-toggle`: open or close the metadata/library sidebar and restore focus to `#focus-trap` when closing.
- `#lang-toggle`: switch the translated interface between English and S'gaw Karen without changing song data.
- `#settings-toggle`: open settings for theme, layout direction, motion, density, keyboard, print language, time signature, row capacity, and local folder.
- `#theme-toggle`: switch light and dark appearance with persisted theme tokens.
- `#shortcut-toggle`: the `?` documentation control beside the other top controls; open `#shortcut-panel`.
- `.editor-zoom-toolbar`: one connected oval at the same height as the chrome buttons. Order is minus, percentage, plus. Zoom is multiplicative, persisted, bounded, and followed by span/slur layout recalculation.

## Sidebar fields

- English title, S'gaw Karen title, category, key, style, tempo, instruments, notes, dates, performed-date history, performance links, image links, and reference notes.
- Empty fields use real `placeholder` text or an unselectable empty `option`; placeholder text is muted and is never stored as user content.
- Key begins at the `Key` placeholder. Real options are C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, and B.
- New Song leaves content fields empty. The explicit structural default is 4/4; Tempo is a placeholder until the user enters or steps a value.
- Transpose preserves Original Key and applies the selected target to metadata and chords.

## Primary actions

- New Song: clear identity, metadata, sections, measures, beats, annotations, lead rows, lyrics, history, and pending modes; show the Chart paper; return focus to the editor.
- Save: create on first save and update thereafter; persist SQLite plus the current `chart_images/song_<id>.json` and PNG.
- Import: load JSON/image/PDF interpretation only after human confirmation and keep it unsaved until Save.
- Print: produce one Letter page per selected instrument plus Reference.
- Export: save first, then download the current Letter-size chart as PDF through the browser.

## Work surfaces

- Chart: paper header/footer, section rails, row controls, measures, beats, annotations, lead rows, and focus target.
- Lyrics: editable lyric sections with romanization and optional English translation.
- Database: searchable local song list, active-song metadata, files, dates, and saved library actions.
- Paper tabs switch surfaces without changing the underlying song and return focus appropriately.

## Modals and panels

- Add Section: Enter opens; I/V/P/C/B/S/E chooses section; Escape closes.
- Lead melody: L opens; retain octave, subdivisions, note grid, instruments, undo/redo, save/cancel, and keyboard navigation.
- Karen keyboard: explicit for Karen-enabled text fields; preserve left-to-right input, physical mappings, undo/redo, and close behavior.
- App Guide: concise operator documentation for start, navigation, chord rules, rhythm, sections, lead, lyrics, Karen input, sidebar actions, settings, autosave, export, undo, and print.
- Wizard code may remain for compatibility, but ordinary startup and New Song must not depend on it.

## Responsive and state rules

- Preserve Letter paper proportions and fixed header/footer geometry.
- Keep top controls reachable without overlap; place the zoom oval on a second centered row on narrow screens.
- Maintain visible focus states, high contrast, touch targets, and reduced-motion behavior.
- Keep empty Chart truly free of sections, measures, and beats; keyboard Enter remains the creation affordance.
- Never make a decorative control or claim an action occurred without runtime evidence.

# Flow and Efficiency Audit — 2026-07-13

## Highest-value improvements

### 1. Establish one authoritative legacy runtime

`index.html` and `legacy-index.html` differ by roughly 1,800 lines. Both contain UI, state, keyboard, translation, and rendering behavior, which makes bug fixes easy to apply to only one surface.

**Improve:** make `index.html` the sole editable legacy source. Generate or archive `legacy-index.html`, and add a test that proves the server and desktop package load the intended file.

### 2. Collapse the cascading theme layers

The active `index.html` contains 143 theme/design selectors, 669 `!important` declarations, and 58 inline-style attributes. Later theme layers override earlier theme layers, so visual changes require knowing source order instead of changing a stable token.

**Improve:** preserve the DOM and behavior, but move visual values into one token table and one component layer. Retire old design-direction overrides after screenshot parity is established.

### 3. Centralize keyboard routing

There are 11 separate `keydown` listeners across the document, modals, editor, language picker, lyrics flow, and Karen keyboard. Each guard independently decides whether a key belongs to text entry, a modal, or chart editing.

**Improve:** introduce one keyboard router with explicit priority: blocking overlay → focused text entry → Karen mapping mode → active modal → chart editor → global UI. Keep existing handlers as delegated functions during migration.

### 4. Remove duplicate access to the song library

The song database appears both as a long sidebar list and as a full Database paper. This increases scroll length and gives users two competing places to search and select songs.

**Improve:** keep the Database paper as the complete library. In the sidebar, show only search, recent songs, and the active song summary.

### 5. Split the overloaded Settings panel

Appearance, motion, density, keyboard behavior, print language, storage folders, time signature, measures per row, and translation status share one scrolling panel.

**Improve:** use three progressive groups: Appearance, Editor & keyboard, and Files & language. Keep the most frequent toggles visible; collapse administrative settings.

### 6. Reduce repeated first-run interruption

Language choice and the new-song wizard both interrupt entry before the chart is usable. This is useful on first launch but inefficient for returning operators.

**Improve:** remember completed onboarding. On later launches, open the last song or an empty chart directly, with language and New Song available as normal commands.

### 7. Make save state and active mode explicit

The editor exposes many controls but does not give the current song, unsaved state, keyboard mode, and active paper equal clarity.

**Improve:** add a quiet status strip showing Saved/Unsaved, English/Karen typing, current key, and active workspace. Avoid adding another toolbar.

## Feature implemented in this pass

Configurable Karen typing hotkeys now support separate base and Shift mappings for A–Z. The feature is opt-in, persists locally, can be reset, and only intercepts plain letter keys while a valid Karen field and the Karen keyboard are active. Ctrl, Meta, Alt, undo/redo, Escape, Backspace, chart hotkeys, and English-only inputs keep their prior behavior.

## Preserve during cleanup

- Existing song and translation data
- Chart, lyrics, and database paper views
- Chord, lead-note, measure, slur, and print rendering
- Modal focus and keyboard behavior
- Review-before-save imports and portable exports
- US Letter instrument packets

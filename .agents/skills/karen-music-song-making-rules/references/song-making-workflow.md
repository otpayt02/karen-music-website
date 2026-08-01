# Keyboard-first song-making workflow

## Start a song

1. Press New Song.
2. Confirm the Chart paper is blank: no section, measure, or beat elements.
3. Confirm all content fields are empty. Placeholder labels remain muted and non-content.
4. Confirm Key shows its placeholder and 4/4 is selected.
5. Confirm Tempo is empty with its placeholder visible.
6. Confirm editor focus is active.

## Create the first Intro

1. Press Enter to open Add Section.
2. Press I.
3. Confirm one Intro appears with exactly one measure and four editable beats.
4. Type A-G to enter the first chord root.
5. Press Tab to insert a new four-beat measure after the active measure and land on beat 1.
6. Press Space to move beat by beat. Moving forward from beat 4 at the section end creates the next four-beat measure and lands on beat 1.

## Navigation and structure

- Arrow Left/Right moves by beat; Right creates a measure after the final beat.
- Arrow Up/Down preserves beat column across rows/sections.
- Tab inserts a full measure after the current measure.
- Ctrl+Tab splits after the active beat.
- Ctrl+Space inserts a measure whose length matches the current one-based beat position.
- Ctrl+1 through Ctrl+6 inserts an exact-length measure.
- Backspace removes the latest visible beat change, then empty trailing structure.
- Delete removes the current measure or the last empty section when appropriate.
- Enter opens Add Section; I/V/P/C/B/S/E selects the type.

## Chords and marks

- A-G: root; B on a rooted beat toggles flat.
- M: minor. 7: seventh. T then 7/8/9: triangle-seven, sus, or aug.
- Slash then A-G: bass; slash again clears bass.
- Period: push/dot. X: rhythm hits. O: circle. R: measure roll.
- S: slur. Comma: Only/All In span. L: lead melody editor.
- Ctrl+Z/Ctrl+Y: undo/redo.

## Save and finish

- Autosave checks once per minute after the draft has user content.
- First autosave creates the song record and `chart_images/song_<id>.png` plus `.json` silently.
- Later autosaves overwrite the same pair; they do not open Save As.
- Save uses the same create-then-update behavior and refreshes the same pair.
- Export saves, renders the current chart to a Letter-size PDF, and downloads it.
- Print remains the full one-page-per-instrument plus Reference workflow.

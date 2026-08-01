---
name: karen-music-song-making-rules
description: Apply and verify the Karen Music Director keyboard-first song-building process from a blank New Song through sections, measures, beats, chords, annotations, lead melody, autosave, manual save, PDF export, and print. Use when implementing, testing, documenting, or troubleshooting chart creation behavior.
---

# Karen Music Song-Making Rules

## Follow the creation loop

1. Read `references/song-making-workflow.md`.
2. Start from New Song and verify there are zero sections, measures, and beats.
3. Verify 4/4 is active, metadata fields are empty/placeholders, and `#focus-trap` owns focus.
4. Build one realistic section using only the keyboard.
5. Verify autosave creates and then overwrites the song PNG/JSON pair without a file dialog.
6. Verify Save updates the same song, Export downloads a PDF, and Print retains the multi-instrument Letter packet.
7. Run the focused browser test plus `npm.cmd run test:e2e`.

## Preserve notation

Do not simplify chord qualities, slash bass, rhythm marks, cue spans, slurs, lead rows, variable-beat measures, undo/redo, or section insertion. Consult `docs/codex/LEGACY_CHORD_EDITOR_CONTRACT.md` for the complete notation contract.

## Privacy

Use synthetic content in tests and proof. Never upload or publish the local database or private song charts.

# Architecture Notes

## Backend

- `app.py` owns the FastAPI app, SQLite migrations, import/export routes, and desktop-launch friendly startup.
- `songs`, `song_versions`, `attachments`, and `imports` are normalized tables.
- `songs_fts` provides full-text search over the title, Karen title, and notes.

## Frontend

- `src/App.tsx` composes the major panels:
  - Song Manager
  - Metadata Editor
  - Chord Chart Editor
  - Lyrics / Karen Text
  - Print / Export Preview
  - Settings
- `src/services.ts` wraps the API.
- `src/types.ts` keeps the song and import payloads typed.

## One-file chart import flow

1. The Import dialog reads the shared criteria from `GET /api/import/criteria`.
2. Karen Music JSON routes to `/api/import/json`; text/ChordPro routes to `/api/import/code`; image/PDF sources route to `/api/import/vision`.
3. JSON and text parse locally. Vision sources try configured Gemini, NVIDIA, then OpenAI providers until one returns structured chart data.
4. The backend normalizes metadata, meter, sections, measures, beats, chord qualities, slash bass, circles, dots, and x marks into the active editor schema.
5. The app shows confidence, recognized fields, missing fields, warnings, sections, and measures before the operator applies the unsaved draft.
6. The operator compares the editor with the source, corrects uncertainty, and presses Save separately.
7. Image/PDF source and review records are retained in the import store for provenance.


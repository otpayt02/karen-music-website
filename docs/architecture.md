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

## PNG import flow

1. The user uploads a PNG.
2. The backend calls OCR / vision parsing.
3. The app returns a review payload with confidence and warnings.
4. The operator edits the draft and then saves it to SQLite.
5. The original PNG is saved as an attachment source.


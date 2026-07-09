# Project Architecture

## Runtime layers

### 1. Legacy UI shell

- `index.html` owns the dense Karen Music editor experience.
- This is the surface to preserve when the user asks for the original look, exact layout, or pixel-parity fixes.

### 2. API and persistence

- `app.py` serves the app and exposes the local API.
- SQLite stores songs, imports, versions, and related artifacts.
- Import and export routes bridge the editor with local song data.

### 3. Desktop launcher

- `karen_music_desktop.py` starts the local server and opens the desktop window.
- This file is the critical startup path for the packaged build.

### 4. Packaging

- `packaging/build_windows.ps1` builds the Windows executable.
- `packaging/create_desktop_shortcut.ps1` points the desktop shortcut at the build output.
- The packaged app is a delivery artifact, so launcher and file-lock behavior matter.

### 5. Shared assets

- `static/`, `chart_images/`, `song_files/`, `church_audio_archive/`, and `imports/` hold supporting assets.
- Treat these as data and presentation dependencies, not primary logic.

### 6. Migration artifacts

- The `src/` and Tailwind-era files may exist as scaffolding or migration history.
- Do not treat them as the authoritative UX unless the operator explicitly switches the target.

## Data flow

1. Operator edits metadata, chart, lyrics, or settings.
2. Import flows parse PNG/PDF or other source material.
3. Results are reviewed and saved locally.
4. Print preview and chart rendering reflect the stored song state.
5. Packaging turns the local app into a desktop executable.

## What Codex should protect

- exact visible layout
- local database integrity
- browser-visible and exe-visible behavior
- launcher startup reliability
- operator trust in what is being changed

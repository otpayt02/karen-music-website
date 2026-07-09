# Current State

## Project identity

Karen Music Website is the Karen song-chart editor and music director database.

## Current source of truth

- `index.html` is the visual source of truth for the legacy monolith.
- `app.py` serves the local runtime and API.
- `karen_music_desktop.py` starts the packaged launcher.
- `packaging/` contains the Windows build and shortcut scripts.
- `dist/` and `build/package-dist/` are build outputs, not design sources.

## Important distinction

- The React/Vite files exist in this repo, but the thread repeatedly treated the shipped HTML monolith as the authoritative surface.
- Unless the operator explicitly says otherwise, Codex should keep working from the legacy HTML/CSS/JS interface and the packaged desktop build behind it.

## Operating priorities

- Preserve the original look and behavior unless a change is explicitly requested.
- Fix the exact browser-visible or packaged-exe-visible issue the operator named.
- Treat launcher, packaging, print, import, and chart-editor behavior as first-class runtime concerns.
- Keep all work local-first and inspectable.

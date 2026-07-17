# Karen Music Director

Desktop/web chord-chart editor for Karen and Myanmar song charts.

## Current source of truth

- The legacy HTML monolith in `index.html` is the primary UI surface for the current workstream.
- The React/Vite files remain as migration artifacts unless the operator explicitly switches the target back to them.
- The project-specific Codex prompt pack lives under `prompts/`.
- For multi-issue annotation dumps, follow `prompts/project/issue-priority.md` after the source-of-truth docs.

## Stack

- FastAPI backend
- SQLite data layer with migrations
- Vite + React + TypeScript frontend
- PyWebView desktop shell

## Setup

```powershell
python -m pip install -r requirements.txt -r requirements-build.txt
npm install
```

## Run locally

Start the backend:

```powershell
python app.py
```

In a second shell, start the frontend dev server:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173`.

## Build the frontend

```powershell
npm run build
```

## Build the Windows exe

```powershell
.\packaging\build_windows.ps1 -InstallBuildDeps
```

The packaged app opens the local FastAPI server in a WebView window and preserves the existing songs database.

## One-file chart import

- Click **Import** to see accepted formats, recognized fields, chart notation, image-quality guidance, privacy boundaries, and the review policy.
- Import Karen Music JSON, text/ChordPro chart code, PNG/JPG/WEBP images, or PDFs.
- JSON and text formats parse locally; images and PDFs use the first configured Gemini, NVIDIA, or OpenAI vision provider that succeeds.
- Review confidence, recognized and missing fields, warnings, sections, and measures before filling the editor.
- The filled editor remains an unsaved draft until the operator reviews it and presses **Save**.

## Migration notes

- The app no longer depends on Flask.
- Existing `songs.db` files are migrated in place.
- Legacy song exports remain readable through the normalized schema.

# Codex Tailwind Execution Plan

Project: `C:\Users\olive\Projects\music_director_database\karen_music_website`

This plan turns the roadmap into commit-sized work for the current repo state.

## Current state

- The app is already split between `app.py` and a React/Tailwind client.
- `index.html` is currently the active legacy-style entry.
- `dist/index.html` is being served first by `app.py` when present.
- `src/App.tsx` is a simplified React shell, not a full parity port of the legacy monolith.
- `src/index.css` now contains the modern light UI used by the React shell.

## Branch sequence

1. `codex/tailwind-shell`
2. `codex/tailwind-primitives`
3. `codex/tailwind-layout`
4. `codex/tailwind-editor-sections`
5. `codex/tailwind-overlays-print`
6. `codex/tailwind-cleanup`

## Milestones

### Milestone 1

- Confirm the active entry path.
- Keep the dark first paint and startup gate in place.
- Decide whether the React shell or the legacy monolith is the visual target.

### Milestone 2

- Convert shared primitives.
- Standardize buttons, fields, tabs, panels, and overlays.

### Milestone 3

- Convert shell layout.
- Match sidebar collapse, header spacing, and app framing.

### Milestone 4

- Convert chart, lyrics, and database surfaces.
- Preserve behavior and scroll/collapse details.

### Milestone 5

- Convert settings, language picker, wizard, shortcut panel, Karen keyboard, and print preview.
- Verify keyboard behavior and browser print output.

### Milestone 6

- Remove legacy CSS only after parity is verified.
- Validate desktop and mobile layouts.
- Run `npm run test:e2e`.

## File-by-file work

### `index.html`

- Keep the startup hidden-by-default gate.
- Keep the dark first paint.
- If this remains the active entry, it should keep the legacy monolith stable.

### `dist/index.html`

- Treat this as the built delivery artifact.
- Only keep it if the React client becomes the deployed surface.

### `app.py`

- Keep the index fallback chain stable.
- Prefer the correct entry file only after the target architecture is settled.

### `src/App.tsx`

- Replace the simplified shell with the actual editor, database, overlays, and print preview contract.
- Preserve existing state and keyboard behavior while changing layout.

### `src/index.css`

- Rework global layout and shared controls.
- Remove the current light dashboard styling once Tailwind-backed equivalents exist.

### `src/tailwind.css`

- Keep Tailwind layers available.
- Add component utilities only if they reduce duplication.

### `tailwind.config.js`

- Keep the current app tokens and font families.
- Expand tokens only if a parity pass needs them.

### `postcss.config.js`

- Keep Tailwind/PostCSS wiring simple and stable.

### `package.json`

- Keep the existing build and test scripts.
- Add only what is needed for the chosen target path.

## Parity verdict

The screenshots show two different surfaces:

- `react-ui.png` and `react-print.png` show the simplified React layout.
- The legacy monolith is a denser, darker, behavior-rich editor with overlays, database flows, and print behaviors already embedded in one file.

That means the migration is not finished. The next real step is to decide whether the repo should continue evolving the React shell or preserve the legacy monolith as the production surface while Tailwind is introduced incrementally.

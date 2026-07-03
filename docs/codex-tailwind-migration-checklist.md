# Codex Tailwind Migration Checklist

This checklist is tailored to `C:\Users\olive\Projects\music_director_database\karen_music_website`.

## Current state

- `app.py` serves the app and prefers `dist/index.html`, then `index.html`, then `legacy-index.html`.
- `index.html` already contains the legacy monolith, startup hiding, dark first paint styles, and Tailwind CSS linkage.
- `src/tailwind.css` already imports Tailwind layers.
- `tailwind.config.js` already defines the app color and font tokens.

## Recommended execution order

1. Lock the visual target.
2. Freeze screenshots of the legacy UI.
3. Confirm the active entry path and startup behavior.
4. Keep Tailwind active without changing runtime behavior.
5. Migrate shell and shared primitives first.
6. Convert editor sections next.
7. Convert overlays and print preview last.
8. Remove unused legacy CSS only after parity is verified.

## Repo-specific steps

### 1. Freeze the reference UI

- Capture desktop and mobile screenshots of:
  - main editor
  - sidebar
  - chart
  - lyrics
  - database
  - settings
  - shortcut and keyboard overlays
  - print preview
- Keep the screenshots as the visual baseline for parity checks.

### 2. Confirm the source of truth

- Treat `index.html` as the active monolith during migration.
- Keep `legacy-index.html` as rollback and comparison material.
- Keep `app.py` startup behavior stable while styling changes happen.

### 3. Validate Tailwind wiring

- Confirm `src/tailwind.css` is imported by the app.
- Confirm `tailwind.config.js` content paths include `index.html` and `src/**/*`.
- Keep the current dark shell, fonts, and hidden-first-paint behavior intact.

### 4. Build a style map

Map the legacy UI surfaces to their Tailwind replacements:

- page background
- app shell
- sidebar
- header
- paper tabs
- chart panel
- lyrics panel
- database panel
- overlays and modals
- print preview
- buttons, inputs, selects, and textareas
- scroll containers

### 5. Convert the outer shell first

- Migrate `html`, `body`, and `#root` styling.
- Rebuild the top-level app layout with Tailwind utilities.
- Preserve sidebar width, collapse behavior, and spacing.
- Keep the editor frame and paper surfaces visually stable.

### 6. Convert shared primitives

- Replace legacy button, input, select, and textarea styling with Tailwind-backed classes.
- Create reusable class groups for:
  - primary button
  - secondary button
  - pill or tab
  - panel
  - overlay
  - field
  - list row
- Keep DOM structure and behavior unchanged.

### 7. Convert the editor sections

- Port Chart, Lyrics, and Database styling section by section.
- Preserve state logic and event handling.
- Verify scroll behavior, collapse behavior, and row expansion.

### 8. Convert overlays and print preview

- Rebuild settings, language picker, wizard, shortcut panel, and Karen keyboard overlays.
- Verify hotkeys after each overlay migration.
- Treat print preview as the last parity target and verify browser print output.

### 9. Remove old CSS gradually

- Delete only the legacy CSS that Tailwind has already replaced.
- Keep fallback styles until the matching Tailwind surface is verified.
- Avoid one large cleanup pass.

### 10. Regression checks

- Open the site after each major conversion.
- Check desktop and mobile layouts.
- Run `npm run test:e2e` before finishing meaningful UI changes.
- Fix console errors, layout overlap, clipping, and failed requests before calling the work done.

## File focus

- `index.html`
- `legacy-index.html`
- `app.py`
- `src/App.tsx`
- `src/index.css`
- `src/tailwind.css`
- `tailwind.config.js`
- `postcss.config.js`
- `package.json`

## Delivery rule

- Do not claim Tailwind migration is finished until the browser output matches the legacy screenshots, the app still starts cleanly, and the build/test flow passes.

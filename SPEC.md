# Karen Music Website Spec

## Goal

Maintain and improve the Karen Music website and desktop launcher while preserving the legacy monolith as the visible reference point.

## Source of truth

- Primary UI: `index.html`
- Local backend: `app.py`
- Desktop launcher: `karen_music_desktop.py`
- Packaging scripts: `packaging/`
- Prompt architecture: `prompts/`

## Non-negotiables

- Do not assume the React/Vite files are the active UI contract unless the operator says so.
- Do not let launcher or packaging fixes rely on guesses; verify the actual shortcut and rebuilt output.
- Do not lose songs, imports, or metadata without showing the failure.
- Do not introduce overlap or clipping in visible UI surfaces.
- Do not treat fake dropdowns, fake metrics, or hidden behavior as acceptable for this repo.

## Primary issue families

1. Launcher and packaging
2. Legacy shell fidelity
3. Language modal
4. Wizard and metadata form
5. Chart and print preview
6. Import and vision analysis
7. Keyboard and shortcuts
8. Translation and front-facing text
9. Layout and theme polish
10. Data and song integrity

## Verification rules

- Browser UI changes require browser verification.
- Packaging changes require verification of the rebuilt executable and shortcut target.
- Import changes require verifying the review payload and save result.
- Print-preview changes require checking the rendered preview itself.

## Questioning rules

- Ask only when the answer changes the exact implementation surface.
- Prefer one short question over a long clarification list.
- Ask about browser UI, packaged `.exe`, launcher, import, or print when that choice matters.

## Execution order

- Follow `prompts/project/issue-priority.md` when the operator asks for several fixes at once.
- Start with the highest-tier visible issue family and keep the fix surface as small as possible.

# Resume Instructions

If you are resuming work on Karen Music:

1. Read `CODEX_PROMPT.md`.
2. Read `SPEC.md`.
3. Read `prompts/INDEX.md`.
4. Read `prompts/project/current-state.md`.
5. Read `prompts/project/issue-catalog.md`.
6. Pick the highest-value visible issue family that is currently broken.
7. Verify the correct runtime surface before editing anything.
8. Make the smallest fix that resolves the chosen issue family.
9. Re-verify the artifact the user actually sees.

## Priority order

1. launcher and packaging
2. import and vision analysis
3. chart and print preview
4. language modal
5. wizard and metadata form
6. keyboard and shortcuts
7. translation and front-facing text
8. layout and theme polish
9. data and song integrity

## Resume rule

- If the browser UI and packaged app disagree, trust the exact artifact the operator named for that turn.
- If the operator pastes many annotations, group them by issue family before coding.

# Karen Music Website Codex Prompt

Use this repository as the working surface for `C:\Users\olive\Projects\music_director_database\karen_music_website`.

## Project rule

- Treat `index.html` as the source of truth unless the operator explicitly changes the target surface.
- Keep the packaged desktop app, browser UI, import flow, print preview, and launcher behavior aligned with the legacy Karen Music experience.
- Use the project prompt pack in `prompts/` before making substantial changes.

## Read order

1. `AGENTS.md`
2. `prompts/INDEX.md`
3. `prompts/project/current-state.md`
4. `prompts/project/locked-decisions.md`
5. `prompts/project/architecture.md`
6. `prompts/project/questioning-policy.md`
7. `prompts/project/issue-catalog.md`
8. `prompts/project/issue-priority.md`
9. `prompts/project/verification-contract.md`

## Active issue families

- launcher and packaging
- legacy shell fidelity
- language modal
- wizard and metadata form
- chart and print preview
- import and vision analysis
- keyboard and shortcuts
- translation and front-facing text
- layout and theme polish
- data and song integrity
- issue priority follows the prompt-pack tiering when many annotations arrive at once

## How to work here

- Fix the smallest surface that can actually solve the issue.
- Preserve the behavior the operator did not ask to change.
- Verify the real runtime artifact when the issue touches packaging or the launcher.
- Verify the rendered UI when the issue touches layout, import, or print.
- Ask only one short project-specific question when the answer would change the implementation.

## Output expectation

- Report changed files, verification, and blockers.
- Keep next steps concrete and tied to the current issue family.

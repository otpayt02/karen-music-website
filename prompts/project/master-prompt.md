# Karen Music Master Prompt

You are working in `C:\Users\olive\Projects\music_director_database\karen_music_website`.

## Mission

Keep the Karen Music website, launcher, and packaged desktop app aligned with the legacy monolith and with the operator’s exact browser-visible intent.

## Read first

Before doing anything substantial, read:

- `AGENTS.md`
- `prompts/INDEX.md`
- `prompts/project/current-state.md`
- `prompts/project/locked-decisions.md`
- `prompts/project/architecture.md`
- `prompts/project/questioning-policy.md`
- `prompts/project/issue-catalog.md`
- `prompts/project/verification-contract.md`

## Operating rules

- Treat `index.html` as the source of truth unless the operator explicitly switches surfaces.
- Do not assume the React/Vite files are the active UI contract.
- Preserve the original Karen Music look, layout, and behavior unless the user explicitly asks for a redesign.
- When the user gives many annotations, group them by surface and fix the highest-value visible issue first.
- Use the packaged `.exe`, desktop shortcut, and local browser as the truth for runtime issues.
- Never use Prompt Refinery.
- Never expose secrets or pretend a file or path is correct without checking it.

## Questioning style

When a question is necessary, ask only one short project-specific question.

Good questions:

- Should I patch the legacy HTML monolith, the backend, or the launcher?
- Is the target the browser UI, the packaged `.exe`, or both?
- Do you want pixel-parity preservation or a deliberate layout change?
- Is this issue about the wizard, the chart, the print preview, the import flow, or packaging?

Avoid generic prompt criticism or broad design essays.

## Implementation style

- Fix the smallest surface that can actually solve the issue.
- Preserve behavior that the operator did not ask to change.
- Prefer local, inspectable, browser-visible changes.
- If a change affects packaging, verify the shortcut target and the rebuilt output.
- If a change affects import or OCR, verify the review payload and the saved result.
- If a change affects print or chart layout, verify the rendered output itself.

## Output discipline

- Report what changed, what was verified, and what remains blocked.
- Name the exact files and artifacts touched.
- Keep the next step concrete and project-specific.

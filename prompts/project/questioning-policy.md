# Questioning Policy

This repo needs project-specific questions that are narrower than generic prompt refinement.

## Ask only when it matters

Ask a question only if the answer changes one of these:

- the target surface
- the source of truth
- the verification method
- the packaging target
- the layout contract
- the import or data flow

If the answer does not change the implementation, proceed.

## Preferred question shape

Use one short question, framed around the exact project artifact.

Examples:

- Should this land in `index.html`, `app.py`, or `karen_music_desktop.py`?
- Is the target the browser monolith, the packaged `.exe`, or both?
- Do you want visual parity with the legacy UI, or a deliberate redesign?
- Is this fix about the wizard, the chart editor, the print preview, the language modal, or packaging?
- Should I preserve the current behavior and only remove overlap, or also change the layout structure?

## What to avoid

- Do not ask about prompt wording trivia.
- Do not ask broad multi-part questions when one answer would unblock the work.
- Do not ask for preferences that do not affect the build.
- Do not turn the user into a spec editor for every detail.

## How to handle big annotation dumps

When the user says "do all of those" or pastes many comments:

- group them by surface
- identify conflicts
- execute the visible highest-value fix first
- preserve established behavior unless a later comment explicitly overrides it

## How to think

Ask about the actual goal, the MVP boundary, the reviewer or operator expectation, and the hidden assumption that would make the wrong change.

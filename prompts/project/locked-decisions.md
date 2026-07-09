# Locked Decisions

## Visual and runtime decisions

- The legacy Karen Music UI is the reference for pixel parity.
- The browser surface and the packaged `.exe` are both real delivery targets.
- Packaging issues must be verified in the actual shortcut target, not inferred from source edits.
- Import changes must preserve review-before-save behavior when the OCR or vision result is uncertain.
- Print-preview changes must be checked in the rendered output, not only in code.

## Interaction decisions

- When a control is supposed to be scrolly, it should behave like a scrollable selector instead of a fake dropdown.
- Layout fixes should remove overlap first, then refine spacing and polish.
- If a request affects a header, footer, print layout, keyboard overlay, language picker, or wizard, Codex should verify the exact visible surface.

## Prompting decisions

- Use project-specific questions, not generic prompt-refinery language.
- Ask about the exact surface, exact artifact, and exact acceptance only when the answer would change the implementation.
- Group repeated annotations into stable issue classes instead of treating every comment as unrelated.

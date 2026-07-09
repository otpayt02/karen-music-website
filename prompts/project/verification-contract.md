# Verification Contract

Every meaningful Karen Music change should be checked against the right runtime surface.

## Browser UI

Verify in the browser when the change touches:

- the legacy monolith
- layout
- modal dialogs
- keyboard controls
- translation
- chart editing
- print preview

Use the actual local URL and check both desktop and mobile layouts when the UI changed.

## Packaging

Verify the packaged build when the change touches:

- launcher startup
- `.exe` rebuilds
- shortcut targets
- file-lock behavior
- local server binding

Confirm the real shortcut target, not just the source code.

## Import and analysis

Verify the import flow when the change touches:

- PNG or PDF import
- OCR or vision parsing
- review-before-save behavior
- imported song persistence

The visible import result matters more than the helper code alone.

## Print preview

Verify print behavior when the change touches:

- footer or header rules
- paper bounds
- style selection
- BPM or key placement
- preview-to-print parity

The browser print preview and the on-screen preview should agree where the project says they should.

## Failure handling

If verification fails:

- report the actual artifact that failed
- identify whether the bug is in source, build, launcher, or packaging
- fix the narrowest layer that caused the failure
- re-run the relevant check

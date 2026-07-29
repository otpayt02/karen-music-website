# Feature: variable-measure keyboard shortcuts

## User outcome

The music director can remove an empty section pre-measure with Backspace and insert a new 1–6 beat measure immediately after the current measure with Ctrl+1 through Ctrl+6.

## Current evidence

- Existing behavior: variable-length measures, indexed navigation, annotation shifting, undo history, and pre-measures already exist.
- Entry point: the chart editor's document-level keyboard handler in `index.html`.
- Data and persistence: measure beat arrays are stored in `state.sections` and the existing chart JSON.
- Verification command or route: `tests/e2e/measure-insertion.spec.js` against the served application.

## Scope

- In: empty pre-measure removal; Ctrl+1–6 insertion; cursor movement; annotation/row-key shifting; shortcut documentation.
- Out: new toolbar controls, data migrations, and changes to ordinary Tab/Ctrl+Space behavior.
- Behavior to preserve: Tab, Ctrl+Space, arrows, Space, measure persistence, undo snapshots, and historical songs.
- Assumptions: a non-empty pre-measure uses existing smart-delete order before a later Backspace removes the empty pre-measure.
- Dependencies: existing `insertMeasureAfterCurrent`, `createMeasure`, and pre-measure state.

## Experience flow

1. User focuses a chord-chart beat.
2. User presses Ctrl plus a number from 1 through 6.
3. The editor inserts that exact-length measure directly to the right.
4. The cursor moves to beat 1 of the new measure.
5. From an empty pre-measure, Backspace removes it and returns to the section's first beat.

## Implementation contract

- UI: update the shortcut guide only.
- Domain logic: reuse the existing insertion and annotation-shift path.
- API or service: none.
- Data shape: unchanged.
- Loading: not applicable.
- Empty: an empty pre-measure is removable.
- Failure: shortcuts do nothing when no section/current measure exists.
- Accessibility: keyboard-first behavior remains documented in the in-app guide.
- Responsive behavior: not applicable.
- Observability: active measure and beat visibly move after insertion/removal.

## Safety and cost

- Secret boundary: none.
- Private data: no song data leaves the local app.
- Paid calls: none.
- External actions: none.
- Approval gates: none.

## Acceptance

- [x] Ctrl+1 through Ctrl+6 each insert the requested beat count.
- [x] The new measure is immediately after the indexed current measure.
- [x] The cursor moves to beat 1 of the new measure.
- [x] The following measure and its contents remain in order.
- [x] Backspace removes an empty pre-measure and selects the first normal measure.
- [x] Existing Tab and Ctrl+Space tests remain green.
- [x] The served runtime passes the targeted browser tests.
- [x] Rollback is limited to the shortcut handler, insertion clamp, guide copy, and tests.

## Proof

- Commands: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5021 npx playwright test tests/e2e/measure-insertion.spec.js --workers=1 --retries=0` — 7 passed.
- Runtime interaction: Playwright exercised all six Ctrl+digit shortcuts and empty pre-measure Backspace against the served application.
- Screenshot or artifact: not required; state and rendered DOM assertions are stronger proof.
- Remaining limitation: Ctrl+1–4 now intentionally perform measure insertion instead of the superseded manual-underline shortcut.

# Request implementation ledger

Scope: the current 2026-07-30 New Song and matched legacy/Sites interaction requests, using repository evidence only. This is not a claim about every prior conversation.

| Request | Status | Evidence | Caveat |
| --- | --- | --- | --- |
| New Song must visibly create a whole blank editor. | Implemented | Focused Chromium passed the zero-structure reset and keyboard focus assertions. | — |
| Fields must be empty with muted, non-editable placeholder content. | Implemented | Native placeholders and empty select options; muted empty-select styling. | S'gaw Karen is preserved; no Korean field was introduced. |
| Key must start at a placeholder with real note choices below. | Implemented | `#songKey` select contains Key plus twelve flat-spelled chromatic choices. | Original-key transpose remains a separate control. |
| New charts default to 4/4 and Tempo is not stored until entered. | Implemented | `setBeatsPerMeasure(4)` plus empty `#songTempo`. | Tempo stepper begins from its middle baseline when used. |
| Enter then I creates one Intro with one four-beat measure. | Implemented | Focused Chromium verified one state measure with four beats. | Seven invisible paper layout slots are not song measures. |
| Tab creates a new measure and Space advances/creates at section end. | Implemented | Existing `advanceMeasure` and `advanceBeat` contracts preserved. | Full-suite regression status pending. |
| Autosave every minute without Save As; overwrite after the first save. | Implemented | Browser create/update identity test plus backend PNG/JSON overwrite test; Python 25/25. | Blank untouched drafts are not saved until they contain user content. |
| Export should have a distinct job and place a PDF in Downloads. | Implemented | Chromium downloaded a `.pdf` artifact with a valid `%PDF-` header. | Exports the current chart page; instrument packets remain Print. |
| Put `?` documentation by theme/language and document the workflow. | Implemented | Repositioned `#shortcut-toggle`; updated guide reviewed in rendered desktop state. | — |
| Make zoom an equal-height oval with minus, percent, plus and exponential sensitivity. | Implemented | Connected toolbar; Chromium verified 100% to 125% after two 1.12-factor clicks. | — |
| Create a reusable skill for all UI elements/navigation. | Implemented | `.agents/skills/karen-music-editor-ui-reference`; validator passed. | — |
| Create a reusable skill for song-making logic/rules. | Implemented | `.agents/skills/karen-music-song-making-rules`; validator passed. | — |
| Apply the same paper-header and pointer interaction model to the private Sites version. | Implemented | Sites build/test passed and live preview verified the header plus blank-song workflow. | Deployment is tracked separately from source implementation. |
| Put English under Karen and align same-size Karen, Style, and Key with Key at right. | Implemented | Legacy focused geometry passed; Sites measured 21px and zero top offset. | English remains a smaller subordinate line. |
| Keep Style editable with choices and Key as a dropdown. | Implemented | Input+datalist and select controls verified in both runtimes. | Native controls preserve keyboard and touch behavior. |
| Keep chord-editor clicks from changing the visual viewport. | Implemented | Scroll ancestor snapshot/restore and `preventScroll`; focused legacy test passed. | Keyboard navigation may still intentionally select another beat without arbitrary page movement. |
| Scroll only the region currently under the pointer. | Implemented | Hover routing covers selects, range/number fields, nested scrolling, and overscroll containment. | Ctrl/Command+wheel remains reserved for zoom/browser behavior. |
| Make Sites New Song directly blank and keyboard-ready. | Implemented | Live New Song → Enter → I produced one four-beat Intro and zero errors. | Hosted Save remains human-reviewed; no automatic upload was added. |

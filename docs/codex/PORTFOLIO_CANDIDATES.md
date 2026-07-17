# Staged portfolio candidates

Nothing in this file is approved for publication.

## Review-gated multimodal chord-chart importer

- **Candidate status:** implemented; targeted workflow verified; staged only.
- **Contribution:** Defined the import criteria and normalized chart schema, expanded local JSON/text/ChordPro parsing, implemented image/PDF provider fallback, added an explicit confidence/missing-field/warning review gate, wired the result into the active editor as an unsaved draft, and packaged the procedure as a reusable Codex skill.
- **Problem solved:** Music directors can convert one existing chart artifact into editable chart data without manually re-entering every section, measure, chord, bass note, or notation mark.
- **Intended users:** Karen worship teams, church music directors, arrangers, and volunteers digitizing paper charts.
- **Defensible claim:** "Built a review-gated importer that converts Karen Music JSON, ChordPro/text, chart images, and PDFs into unsaved editor drafts, with local parsing, vision-provider fallback, confidence and warning disclosure, and automated backend/browser coverage."
- **Do not claim:** Perfect OCR, support for every handwriting style, or a fully validated multi-page PDF corpus.
- **Evidence:**
  - `output/playwright/import-criteria-desktop-2026-07-16.png` — criteria desk at 1440x1000; sanitized; no console errors.
  - `output/playwright/import-criteria-mobile-2026-07-16.png` — responsive criteria desk at 390x844; sanitized.
  - `output/playwright/import-review-chordpro-2026-07-16.png` — 92% local parser review with section/measure counts and warning.
  - `output/playwright/imported-chordpro-draft-2026-07-16.png` — filled unsaved editor draft.
  - `tests/test_import_export.py` and `tests/e2e/song-import.spec.js` — automated proof.
  - `docs/CURRENT_FEATURE_MAP.md` and interactive `karen-music-feature-map.html` — product inventory and system map.
- **Proof gap:** Add a permission-cleared, synthetic or redacted multi-page PDF and at least three distinct handwriting samples with expected-value scoring.
- **Privacy review:** The current live handwriting sample may contain community-specific material and must not be published without explicit permission. Prefer synthetic or fully redacted demo charts.
- **Possible ethical offer:** A fixed-scope "paper chord chart to editable digital library" setup and migration service with human verification included.
- **Day-to-day value:** Reduces repetitive entry while preserving a clear review-before-save checkpoint for rehearsal reliability.

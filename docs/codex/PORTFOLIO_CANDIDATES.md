# Staged portfolio candidates

Nothing in this file is approved for publication.

## Review-gated multimodal chord-chart importer

- **Candidate status:** implemented; targeted workflow and private synthetic accuracy corpus verified; staged only.
- **Contribution:** Defined the import criteria and normalized chart schema, expanded local JSON/text/ChordPro parsing, implemented image/PDF provider fallback, added an explicit confidence/missing-field/warning review gate, wired the result into the active editor as an unsaved draft, packaged the procedure as a reusable Codex skill, and built a permission-cleared corpus/scoring/regression workflow.
- **Problem solved:** Music directors can convert one existing chart artifact into editable chart data without manually re-entering every section, measure, chord, bass note, or notation mark.
- **Intended users:** Karen worship teams, church music directors, arrangers, and volunteers digitizing paper charts.
- **Defensible claim:** "Built a review-gated importer that converts Karen Music JSON, ChordPro/text, chart images, and PDFs into unsaved editor drafts, with local parsing, vision-provider fallback, confidence and warning disclosure, and automated backend/browser coverage."
- **Do not claim:** Perfect OCR, support for every handwriting style, a guaranteed accuracy SLA, or proof from representative real-world writers. The current benchmark is small and synthetic.
- **Evidence:**
  - `output/playwright/import-criteria-desktop-2026-07-16.png` — criteria desk at 1440x1000; sanitized; no console errors.
  - `output/playwright/import-criteria-mobile-2026-07-16.png` — responsive criteria desk at 390x844; sanitized.
  - `output/playwright/import-review-chordpro-2026-07-16.png` — 92% local parser review with section/measure counts and warning.
  - `output/playwright/imported-chordpro-draft-2026-07-16.png` — filled unsaved editor draft.
  - `tests/test_import_export.py` and `tests/e2e/song-import.spec.js` — automated proof.
  - `tests/test_import_accuracy.py` — corpus, expected-value scoring, prompt, surplus-slot, and lossless-preservation regressions.
  - Private-only `private/import_accuracy_corpus/` — three handwriting styles, one two-page scanned-style PDF, per-source expected manifests, and sanitized live reports. Two production-configuration runs measured 94.42% and 98.55% overall; metadata, sections, measures, and x marks were 100% in both.
  - Private-only `private/chord-chart-import-case-study/` — review-ready case study, architecture, test evidence, proof ledger, screenshots, and unpriced fixed-scope service outline.
  - `docs/CURRENT_FEATURE_MAP.md` and interactive `karen-music-feature-map.html` — product inventory and system map.
- **Proof gap:** Run a separately approved pilot with multiple real, explicitly permission-cleared writers and scanning conditions; keep the synthetic two-run range visible instead of promising universal accuracy.
- **Privacy review:** Public proof must use the new synthetic screenshots or separately approved charts. The private corpus and provider-derived normalized mismatches remain local until explicit publication review.
- **Possible ethical offer:** A fixed-scope "paper chord chart to editable digital library" setup and migration service with human verification included.
- **Day-to-day value:** Reduces repetitive entry while preserving a clear review-before-save checkpoint for rehearsal reliability.
# Private Sites replica of Karen Music Director

- State: newest visual/input parity is implemented, locally verified, and privately deployed as version 8; the paper owns all metadata, time signature is bounded, and the utility sidebar switches exclusively between Settings and Library.
- Problem: translate a dense packaged church-music desktop editor into a responsive hosted surface without exposing the historical church database or flattening its keyboard-first workflow.
- Contribution: separated visual and behavioral baselines, preserved the eight-column Letter editor, and implemented two-slot cue ranges, a full Karen keyboard, gated imports, advanced lead navigation, owner-scoped persistence, responsive controls, and reusable guard skills.
- Evidence: `sites/karen-music-director`, 14 focused Playwright journeys, exact option/endpoint assertions, lint and production build, anonymous API denial, prior parity proof, and sanitized screenshots under `output/playwright/sites-parity-2026-07-28/`.
- Safe claim: built, locally verified, and privately deployed advanced parity for a S’gaw Karen chord-chart editor using synthetic-only demonstration data.
- Privacy risk: high if real church songs, names, charts, or provider payloads are captured or published.
- Proof gap: verify one synthetic signed-in D1 save/load cycle, then record a sanitized end-to-end demo.
- Service hypothesis: fixed-scope migration of paper-based or desktop-only music workflows into private, keyboard-accessible hosted tools. Buyer demand and pricing require external research.

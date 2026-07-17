# Workflow playbooks

## One-file chord-chart intake

- **Trigger:** A music director has one Karen Music JSON export, text/ChordPro file, chart photograph, scan, or PDF and needs an editable chart.
- **Outcome:** A normalized, reviewable, unsaved draft is loaded into the active Karen Music chord editor.
- **Inputs:** One supported file up to 20 MB; a running local app; a configured Gemini, NVIDIA, or OpenAI key only for image/PDF sources.
- **Owner:** The music director approves the interpretation and decides when to save. The importer only proposes the draft.
- **Steps:**
  1. Press **Import** and read the accepted-source, metadata, notation, image-quality, privacy, and review criteria.
  2. Choose one file. JSON and chart text parse locally; images and PDFs use the first configured vision provider that succeeds.
  3. Inspect provider/source, confidence, recognized fields, missing fields, warnings, section count, and measure count.
  4. If the result is credible, press **Fill the chord editor**. Otherwise cancel and improve the source image or correct the file.
  5. Review titles, key, meter, section order, bar lines, chords, slash bass, circles, dots, and x marks in the editor.
  6. Press **Save** only after human approval.
- **Tools:** `GET /api/import/criteria`; `/api/import/json`; `/api/import/code`; `/api/import/vision`; `import_service.py`; `C:\Users\olive\.codex\skills\import-karen-chord-chart\scripts\inspect_import.py`.
- **Current bottleneck:** Handwriting ambiguity and page-layout variation, not file transfer or editor mapping.
- **Optimized version:** Keep one normalized editor schema and one review contract across local parsing and every vision provider; add corrected examples to a private regression corpus instead of creating provider-specific UI paths.
- **Verification:** Run the skill inspection client; run the 12 backend/import tests and 3 browser import journeys; visually check desktop/mobile criteria, review, and filled-editor states; confirm `currentSongId` remains null before Save.
- **Rollback:** Close the review without applying it, or press **New Song** before Save. The importer does not mutate the saved library by itself.
- **Privacy boundary:** JSON/text remain local. Images/PDFs leave the machine only for the configured vision provider. Never include secrets in chart files or publish private charts/provider responses without permission.
- **Cost:** Local JSON/text parsing has no model cost. Image/PDF cost and retention depend on the configured provider and account.
- **Approval gates:** Human review before editor application; explicit Save before persistence; separate explicit approval before publishing proof media or private charts.

# Workflow playbooks

## Reconcile songs.db with chart_images

- **Trigger:** Structured song exports or chart PDFs/images are added to `chart_images`, or the desktop library shows stale test titles instead of those sources.
- **Outcome:** Every supported folder file is linked from the local library; ID-matched JSON is authoritative for structured song fields; existing historical rows are never deleted.
- **Inputs:** `songs.db`, `chart_images\song_<id>.json`, and local PDF/PNG/JPG/JPEG/WEBP files.
- **Owner:** Codex may run the local reconciliation after an explicit database-sync request; the user decides whether unmatched history or reference-only filenames should later be renamed, merged, archived, or deleted.
- **Steps:** Run a dry plan; inspect counts and uncovered files; run with `--apply`; retain the generated private backup; rerun the dry plan and equality/coverage checks; open the desktop Database tab.
- **Tools:** `python tools\sync_chart_images_to_db.py`; SQLite integrity check; focused pytest; Playwright CLI.
- **Current bottleneck:** Filename-only PDFs can be linked safely but cannot be treated as fully transcribed editable charts without OCR review.
- **Optimized version:** Keep the idempotent reconciliation command as the only bulk path; use the review-gated importer separately when a PDF/image must become editable chart content.
- **Verification:** All 19 JSON sources equal their ID-matched structured rows, all 53 supported files are covered, SQLite integrity is `ok`, focused tests pass, and the Database tab reports 56 songs.
- **Rollback:** Stop the desktop server and restore the timestamped database from `private\backups`; do not delete the backup until the user approves the reconciled library.
- **Privacy boundary:** Local-only. Never upload `songs.db`, chart files, database reports, or private metadata to Sites or a provider.
- **Cost:** None for reconciliation; no OCR or external provider is used.
- **Approval gates:** OCR transcription, destructive deduplication, renaming ambiguous files, publishing, and hosted synchronization require separate approval.

## Restart the local Sites editor

- **Trigger:** The Karen Music Sites editor is closed, stale, showing connection refused, or already owns port 4177 and needs a clean restart.
- **Outcome:** The exact isolated Sites project is running at `http://localhost:4177/` without touching the desktop app or an unrelated listener.
- **Inputs:** `C:\Users\olive\Projects\music_director_database\karen_music_website\sites\karen-music-director`, Node 22.13+, npm, and `$restart-karen-music-sites`.
- **Owner:** Codex may start/restart the local development server; the user controls any deployment or real-song publication.
- **Steps:** Invoke `$restart-karen-music-sites`; run its bundled PowerShell script; verify the listener belongs to the project; wait for HTTP 200; reload the existing app tab at the returned URL.
- **Tools:** `C:\Users\olive\.codex\skills\restart-karen-music-sites\scripts\restart_karen_music_sites.ps1`, `Get-NetTCPConnection`, `Get-CimInstance`, `npm.cmd run dev`.
- **Current bottleneck:** Vinext starts successfully, but the Codex shell runner waits on the background descendant instead of returning after readiness.
- **Optimized version:** Use a Windows detachment mechanism that exits cleanly under Codex while retaining explicit PID/log/readiness evidence.
- **Verification:** Skill validation, PowerShell parse, start from stopped state, restart from running state, unrelated-port refusal, HTTP 200, and `Karen Music Director` title.
- **Rollback:** Stop only the verified listener PID. Do not kill by broad process name or delete runtime data.
- **Privacy boundary:** Local synthetic Sites project only; never copy or publish `songs.db`, charts, credentials, or provider payloads.
- **Cost:** No model or external-service cost; `npm install` uses network only when dependencies are absent.
- **Approval gates:** Deployment, access changes, dependency upgrades, and real-song publication require explicit approval.

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
  5. Review titles, key, meter, section order, bar lines, chords, slash bass, circles, dots, and x marks in the editor. For handwriting with exactly two chords in an un-underlined measure, verify the even-split default: beats 1/3 in 4/4 or beats 1/4 in 6/8; preserve explicit underlined/grid positions.
  6. Press **Save** only after human approval.
- **Tools:** `GET /api/import/criteria`; `/api/import/json`; `/api/import/code`; `/api/import/vision`; `import_service.py`; `C:\Users\olive\.codex\skills\import-karen-chord-chart\scripts\inspect_import.py`.
- **Current bottleneck:** Handwriting ambiguity and page-layout variation, not file transfer or editor mapping.
- **Optimized version:** Keep one normalized editor schema and one review contract across local parsing and every vision provider; add corrected examples to a private regression corpus instead of creating provider-specific UI paths.
- **Verification:** Run the skill inspection client; run the targeted backend/import tests and 3 browser import journeys; visually check desktop/mobile criteria, review, and filled-editor states; confirm `currentSongId` remains null before Save. For the un-underlined two-chord default, assert beats 1/3 in 4/4, beats 1/4 in 6/8, and unchanged explicit underlined/grid positions.
- **Rollback:** Close the review without applying it, or press **New Song** before Save. The importer does not mutate the saved library by itself.
- **Privacy boundary:** JSON/text remain local. Images/PDFs leave the machine only for the configured vision provider. Never include secrets in chart files or publish private charts/provider responses without permission.
- **Cost:** Local JSON/text parsing has no model cost. Image/PDF cost and retention depend on the configured provider and account.
- **Approval gates:** Human review before editor application; explicit Save before persistence; separate explicit approval before publishing proof media or private charts.

## Private OCR accuracy regression

- **Trigger:** The image/PDF prompt, provider request, schema, normalization, beat mapping, mark mapping, or review contract changes.
- **Outcome:** A sanitized, repeatable comparison against permission-cleared expected values without saving songs or retaining raw provider payloads.
- **Inputs:** `private/import_accuracy_corpus/corpus-manifest.json`; three synthetic handwriting images; one two-page scanned-style PDF; configured vision provider; expected manifests.
- **Owner:** The implementer runs and diagnoses the benchmark. A music director decides whether remaining mismatches are acceptable for real use.
- **Steps:**
  1. Regenerate fixtures with `python tools\generate_import_accuracy_corpus.py --output private\import_accuracy_corpus` only when the corpus contract intentionally changes.
  2. Run `python tools\score_import_accuracy.py private\import_accuracy_corpus --output <private-report.json>` at least twice when evaluating provider-facing changes.
  3. Compare metadata, sections, measures, chords, slash bass, circles, dots, and x marks by exact expected location.
  4. Fix deterministic local normalization defects with fixture tests. Do not auto-shift ambiguous non-empty notation without source-grounded evidence.
  5. Run targeted backend and browser import tests.
  6. Capture criteria, review, and filled-unsaved-editor proof with `node tools\capture_import_proof.mjs`; confirm the capture manifest reports a null song id and no Save click.
- **Tools:** `tools/generate_import_accuracy_corpus.py`; `tools/score_import_accuracy.py`; `tools/capture_import_proof.mjs`; `tests/test_import_accuracy.py`.
- **Current bottleneck:** Provider variance in adjacent beat-column placement, especially 6/8 and neighboring circled/dotted chords.
- **Optimized version:** Preserve run ranges and negative experiments in private evidence; separate deterministic importer regressions from nondeterministic provider limitations.
- **Verification:** Two production-configuration corpus runs; targeted Python and Playwright tests; visual screenshot inspection; saved-song id remains null.
- **Rollback:** Revert the prompt/normalization change, rerun the same hashed sources, and compare sanitized reports. Never delete non-empty notation to improve a score.
- **Privacy boundary:** Synthetic or explicitly permission-cleared sources only; ignored `private/` output; no raw provider payloads; no community chart publication.
- **Cost:** Local generation/scoring has no provider cost; every image/PDF benchmark call may incur provider usage.
- **Approval gates:** Separate approval is required before real-chart benchmarking, publishing proof, changing provider/account settings, or saving an imported chart.
# Hosted Karen Music replica

- Trigger and outcome: recreate the packaged desktop shell in Sites without publishing private church data.
- Inputs: packaged `_internal/index.html`, current behavior source/tests, approved sanitized songs, Sites access decision.
- Steps: inspect packaged runtime, separate visual and behavior baselines, build isolated Sites surface, use D1, run focused browser tests, capture sanitized proof, build, save, and privately deploy.
- Tools and owner: Codex with frontend-design, Astryx, Playwright, Sites, and the user as song-by-song privacy approver.
- Bottleneck: hosted identity consent and manual selection of sanitized songs.
- Optimized version: apply `.agents/skills/karen-music-ui-guardian` and the global `karen-music-project-router`.
- Verification: `npm test`, `tests/e2e/sites-replica.spec.js`, desktop/mobile proof, every visible control and locked shortcut, stable animated hit targets, deployment status, then signed-in D1 save/load.
- Rollback: deploy the prior saved Sites version; desktop source and database remain untouched.
- Privacy boundary: never upload `songs.db`, private charts, provider payloads, credentials, or unapproved translations.
- Cost and approval: D1 and Sites usage follow the connected workspace; access changes and song publication require explicit user approval.

## Reference-led Sites redesign

- **Trigger:** The user adds a UI reference or names an existing project as visual direction for Karen Music.
- **Outcome:** One approved phase is applied to the isolated Sites replica while current editor behavior and private data boundaries remain intact.
- **Inputs:** Reference image/screenshot/path; exact phase; behavior inventory; existing Sites screenshots; sanitization decision.
- **Owner:** The user approves visual direction and any real song publication. Codex may implement reversible UI changes with synthetic data.
- **Steps:**
  1. Capture the reference and current implementation at comparable viewports.
  2. Extract only layout, palette, imagery, spacing, and interaction patterns that serve the named phase.
  3. Preserve Chart, Lyrics, Database, import/export, print, keyboard, modal, and save contracts.
  4. Build one vertical slice in `sites/karen-music-director`.
  5. Run the production build and focused browser path.
  6. Capture desktop/mobile evidence and compare source plus implementation in one image.
  7. For print changes, generate and render a real Letter PDF.
  8. Update the request ledger and deploy privately.
- **Tools:** frontend design skills, Astryx MCP, Playwright, PDF rendering, and Sites.
- **Current bottleneck:** references may show appearance without specifying behavior; the existing runtime remains behavior authority.
- **Optimized version:** use `docs/codex/SITES_DESIGN_DISCOVERY.md` as the phase ledger and `sites/karen-music-director/design-qa.md` as the visible comparison record.
- **Verification:** build, one happy path, one failure/empty state, desktop/mobile, console, overflow, and phase-specific proof.
- **Rollback:** deploy the previous saved Sites version. Never modify the desktop app as rollback for a hosted design experiment.
- **Privacy boundary:** use synthetic or explicitly approved songs and images only.
- **Cost:** no model or package cost is assumed; external dependency installation and paid providers require approval.
- **Approval gates:** access changes, real-song hosting, attachment upload, dependency installation, and public proof publication.

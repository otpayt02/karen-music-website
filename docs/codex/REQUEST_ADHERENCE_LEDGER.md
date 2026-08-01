# Request adherence ledger

Last updated: 2026-07-30

## Active request: reconcile the local song database with chart_images

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| CI1 | Make the local database songs reflect the sources in `chart_images`. | verified | reported with evidence | All 19 `song_<id>.json` sources now match the corresponding database titles, metadata, and `chart_json`; all 53 supported folder files are linked from the database. |
| CI2 | Include chart files that were absent from the database. | verified | reported with evidence | Five reference-only records were added for `127.0.0.1.pdf`, `127.0.0.2.pdf`, `1_saw_moo_gay.pdf`, `bad.pdf`, and `youth_7_25.pdf`; the library now contains 56 rows. |
| CI3 | Preserve historical songs and provide a safe rollback. | verified | reported with evidence | All 51 pre-sync rows were preserved; `private/backups/songs-before-chart-images-sync-20260728-070157.db` was created before mutation. |
| CI4 | Keep private music local and out of Sites. | verified | reported with evidence | The operation touched only local `songs.db`, local source references, private reports, tests, and a local tool; nothing was uploaded or deployed. |
| CI5 | Verify the real database surface. | verified | reported with evidence | SQLite integrity is `ok`; 6 focused tests passed; Playwright opened the desktop Database tab and observed `56 songs` plus linked `chart_images` filenames. |

Preserved exception: five older `Database Search ...` test/history rows do not have matching `chart_images` sources. They remain in the library because the project contract forbids deleting historical songs without a separate explicit cleanup decision.

## Active request: reusable Sites restart skill

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| RS1 | Create a reusable skill for running the currently open Karen Music Sites app. | partially implemented | reported with evidence | `C:\Users\olive\.codex\skills\restart-karen-music-sites`; `quick_validate.py` and PowerShell parsing passed. The app launches, but the Codex shell call does not return cleanly. |
| RS2 | If the app is already running, close its server and run it again. | implemented | reported with evidence | Live listener changed from PID 6728 to PID 14052 and the restarted app returned HTTP 200. |
| RS3 | Perform required setup through PowerShell or the appropriate tool. | implemented | reported with evidence | Node/npm/dev-script checks, conditional `npm install`, temporary logs, hidden launch, readiness wait, and optional browser opening are bundled. |
| RS4 | Preserve unrelated processes and project privacy. | implemented | reported with evidence | Exact project-path ownership gate protects unrelated port listeners; desktop port 5000, deployment, credentials, `songs.db`, and charts remain out of scope. |

### Blocker and exact next action

- Observed failure: both launcher invocations restarted the app but the Codex shell tool timed out while the background dev-server descendant remained alive.
- Attempted repairs: changed readiness from unreachable `127.0.0.1` to verified `localhost`; reran the full existing-server restart path.
- Verification: listener PID changed, temporary log shows Vinext ready, `GET /` returned 200, and the HTML title is `Karen Music Director`.
- Next action: replace the background-process detachment mechanism, then verify clean return, start, restart, unrelated-port refusal, and readiness in one bounded pass.

## Active request: complete advanced Sites parity

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| SP1 | Use `docs/codex/LEGACY_CHORD_EDITOR_CONTRACT.md` as the locked behavior and geometry contract. | verified | reported with evidence | Contract remained unchanged as authority; focused browser coverage asserts its shortcut, eight-column, fixed-page, and modal behaviors. |
| SP2 | Add instrument cue ranges with no more than two ranges per visual row. | verified | reported with evidence | Lead dialog exposes two range slots, legacy abbreviations, normalized start/end controls, and editor/print range markers; browser test passed. |
| SP3 | Restore the full Karen keyboard and physical mappings. | verified | reported with evidence | Five grouped character surfaces render all 55 legacy characters plus Undo, Redo, Backspace, and Esc; every key and A-Z/Shift+A-Z mapping was exercised in Chromium. |
| SP4 | Keep imports behind explicit review and load only an unsaved draft. | verified | reported with evidence | Synthetic JSON fixture opens a structure review, leaves the editor unchanged, requires confirmation, and loads with no saved ID. |
| SP5 | Restore advanced lead navigation and editing. | verified | reported with evidence | Per-beat 3/4/6 spacing, adjacent-measure navigation, slot navigation, octave controls, clear, undo, and redo passed focused browser checks. |
| SP6 | Add safe hosted persistence. | partially implemented | reported with evidence | Owner-key hashing, authenticated read/write filtering, review and synthetic-or-approved gates, payload/section limits, safe errors, and a 401 anonymous API check are implemented. Version 4 is privately deployed; one signed-in synthetic D1 save/load cycle remains unverified. |
| SP7 | Preserve the deployed eight-column editor and fixed header/footer. | verified | reported with evidence | Browser geometry asserts eight columns, 1 px paper header/footer boundaries, zero overflow, and unchanged Letter proportions. |
| SP8 | Use synthetic data only and never publish real charts or `songs.db`. | verified | reported with evidence | Synthetic fixture/defaults only; source scan found no database, chart export, document, audio, or real song artifact in the Sites source. |
| SP9 | Verify every visible control and shortcut in-browser. | verified | reported with evidence | `npm run test:e2e -- tests/e2e/sites-replica.spec.js --project=chromium`: 11/11 passed; sanitized desktop, mobile, keyboard, import-review, and lead/cue screenshots captured. |

## Active request: Sites chord-editor visual and input parity

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| SV1 | Reuse the exact local chord editor logic/UI and make pre-measures work. | verified | reported with evidence | Locked shortcut suite plus pre-measure create/select/chord/navigation path passed in Chromium. |
| SV2 | Match legacy fonts, center style, and enlarge the chord root. | verified | reported with evidence | Computed font roles and header/root geometry passed; source uses the legacy font quartet. |
| SV3 | Expand chord-dense measures and reduce sibling widths evenly inside the fixed row. | verified | reported with evidence | A complex first measure became wider while all three siblings remained equal; eight logical tracks and zero paper overflow remained. |
| SV4 | Add distinct barely visible muted backgrounds around whole sections. | verified | reported with evidence | Computed section backgrounds differ for Intro, Verse, and Chorus; tokens cover all seven section types and print. |
| SV5 | Render black parentheses around English title and exclude it from Karen input. | verified | reported with evidence | Sidebar/paper/print markup and focus checks passed. |
| SV6 | Add a global Karen toggle; route every other textbox to a modal; Enter applies and exits. | superseded | reported with evidence | The user later narrowed the contract to Karen-title-only modal triggering. |
| SV7 | Make number keys float and keys fade brighter on hover. | verified | reported with evidence | Stable floating-shadow animation, hover filter change, and all 55 clickable keys passed. |
| SV8 | Place per-row up/down capacity controls at the key-aligned right edge with default eight. | verified | reported with evidence | Right-edge geometry and 8→9→8 desktop/mobile interactions passed. |
| SV9 | Center a footer dropdown with instrument checkboxes. | verified | reported with evidence | Footer picker center geometry and Drums selection/summary update passed. |
| SV10 | Preserve fixed header/footer, use synthetic data only, and never publish `songs.db` or real charts. | verified | reported with evidence | Browser boundaries remain fixed; source/defaults/fixtures are synthetic and no private database was copied. |
| SV11 | Make Karen title the only textbox click that opens the Karen keyboard. | verified | reported with evidence | Default-on title-only focus routing passed desktop/mobile Chromium checks; English title, style, lyrics, and search did not open the modal, both Karen title fields did, and Enter applied/closed it. Private Sites version 5 deployed successfully. |
| SV12 | Make Group a dropdown limited to Praise & Worship, Kids, Youth, Choir, or Solo, and make BPM a draggable 55–155 slider. | verified | reported with evidence | Sidebar, paper, print-preview, import, library-load, and hosted-save paths normalize the metadata; Chromium verified the exact options, both BPM endpoints, footer synchronization, and the unchanged eight-column editor in the 14/14 suite. |
| SV13 | Limit the instrument dropdown to Piano 1, Piano 2, Acoustic Guitar, Electric Guitar, Drums, Electric Bass, and Keytar. | verified | reported with evidence | Sidebar and centered paper dropdowns render the same exact seven checkboxes; legacy Bass maps to Electric Bass, unsupported entries are removed on import/load/save, and all 14 Chromium journeys passed. |
| SV14 | Make time signature a 2/4, 3/4, 4/4, or 6/8 paper dropdown that defaults new charts to 4/4; remove metadata from the sidebar; replace the Database paper tab with mutually exclusive Settings and Library sidebar tabs. | verified | reported with evidence | Paper now owns every metadata control; new-chart and import/save normalization enforce the four meters; Settings and Library render one at a time; no Database paper tab remains; 14/14 Chromium journeys passed. |

Regression disclosure: the isolated Sites suite passed 14/14. The separate desktop-monolith sweep passed 37/51; its 14 failures are outside the nested Sites source and remain deferred under the existing desktop regression workstream.

## Active request: restore the legacy chord editor in Sites

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| E1 | Use the original editor keyboard commands and typing behavior as the authority. | implemented | reported with evidence | `docs/codex/LEGACY_CHORD_EDITOR_CONTRACT.md`; browser verified chord/minor entry, navigation, Ctrl+6, section modal, and lead modal. |
| E2 | List and preserve the editor features, visual elements, navigation, sizing, defaults, and modals. | implemented | reported with evidence | Durable contract inventories shortcuts, notation, section/measure behavior, lead editing, modal triggers, and print geometry. |
| E3 | Restore the legacy eight-measure row default and make row density adjustable. | verified | reported with evidence | Browser computed 8 columns; row control changed 8 to 7 and back to 8. |
| E4 | Keep measure width equal to one of eight slots when a row contains fewer than eight measures. | verified | reported with evidence | Five actual measures used five of eight columns; first and last measure both measured 93.5 px. |
| E5 | Render the ending bar on the newly final measure immediately. | verified | reported with evidence | Final measure owns `.ending-bar`; source derives it from current section length on every render. |
| E6 | Add muted hover response for section, row, measure, beat, and lead layers. | implemented | reported with evidence | `globals.css` contains distinct hover states; served screenshot shows the quiet high-contrast paper treatment. |
| E7 | Improve overall UI contrast. | implemented | reported with evidence | Dark shell surfaces and muted text contrast strengthened; paper stays black-on-white. |
| E8 | Keep the original chord, beat, lead, measure, section, navigation, undo, and modal logic while retaining new header/footer changes. | verified | reported with evidence | Advanced instrument ranges, the full Karen keyboard, import review, lead navigation, and guarded persistence now join the restored writer path; 11/11 focused browser tests preserve the fixed paper shell. |
| E9 | Inspect `chart_images/` and follow the commonly shared print format. | verified | reported with evidence | Rendered and reviewed `first_flawless_printout.pdf`, `good_song.pdf`, `youth_Move_Your_Boat_print.pdf`, and `1_saw_moo_gay.pdf`; fixed eight-column barline pattern selected. |
| E10 | Remove duplicate/pill-shaped section labels and redundant wording. | verified | reported with evidence | Each editor/print section renders one plain heading; no colored chip is present. |
| E11 | Integrate the first print page with the restored editor rules. | verified | reported with evidence | Print opens page 1; PDF contains three exact Letter pages and uses the same eight-column rows and ending bars. |
| E12 | Preserve privacy and avoid publishing real charts while repairing urgently. | verified | reported with evidence | Only synthetic demo data used; no `songs.db`, chart image, handwriting, or provider data copied. |

## Active request: print-first reference-led Sites direction

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| U1 | Make the redesign in Sites first and preserve existing features. | implemented | reported with evidence | Existing isolated Sites project extended; build and 5/5 focused browser tests pass. |
| U2 | Use the Karen village and mountain reference as the paper-stage background. | implemented | reported with evidence | Source image copied to `public/karen-village-aerial.png`; desktop/mobile screenshots show the stage; print media excludes it. |
| U3 | Make the white editor surface match a real printout with fixed editable header/footer. | verified | reported with evidence | Screen ratio measured 816 x 1056; print CSS uses 8.5 x 11 inches; inputs remain inside page boundaries. |
| U4 | Redirect Print into a modal with numbered pages under the white sheet. | verified | reported with evidence | Print-room dialog, page 1-3 controls, previous/next, current-page caption, and page switching passed in Chromium. |
| U5 | Use the same header/footer on every page with one centered instrument per page. | verified | reported with evidence | Three-page PDF contains Piano 1, Acoustic Guitar, and Reference on separate 612 x 792 point pages. |
| U6 | Remove colored section-name tags. | implemented | reported with evidence | Colored section rails removed from the editor and print-sheet CSS. |
| U7 | Do not show the song wizard on app startup. | verified | reported with evidence | Startup has zero dialogs; New song remains the explicit trigger. |
| U8 | Make zoom smoother with nonlinear scaling. | implemented | reported with evidence | Zoom uses bounded multiplicative 1.12 steps and reduced-motion fallback. Cursor-anchor work remains Phase 3. |
| U9 | Redesign the sidebar, top controls, sticky toolbar, circle actions, docs, shortcuts, Karen keyboard, modals, and responsive navigation. | deferred | acknowledged | Phase 2 in `docs/codex/SITES_DESIGN_DISCOVERY.md`; exact next action is a control-by-control behavior inventory. |
| U10 | Route scroll/navigation by pointer hover, preserve editor focus, first-click reliability, and viewport position during edit/zoom. | deferred | acknowledged | Phase 3; exact next action is pointer-region and scroll-anchor browser tests. |
| U11 | Add a contextual right-click tool surface. | deferred | acknowledged | Phase 3; use the Astryx ContextMenu contract and keep visible/keyboard alternatives. |
| U12 | Regroup metadata and keep advanced details in Database instead of the sidebar. | deferred | acknowledged | Phase 4; exact next action is basic-versus-advanced field mapping before schema/UI edits. |
| U13 | Store existing images/documents, separate good/bad sources, and retain approved handwritten/typed ground-truth context while allowing unmatched records. | deferred | acknowledged | Phase 5; exact next action is a local-only attachment/provenance inventory and approval-state schema. |
| U14 | Do not upload private songs, images, notes, or church material to Sites. | verified | reported with evidence | The Sites project still contains synthetic demonstration content only. |


## Active request: isolated print packet pages

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| P1 | Treat every printed copy as a separate physical Letter page. | implemented | reported with evidence | `index.html`: `.print-sheet` owns fixed page dimensions, clipping, containment, and page breaks; proof PDF contains three 612 x 792 point pages. |
| P2 | Prevent a later page's header or content from overflowing onto an earlier page. | implemented | reported with evidence | `contain: strict`, `overflow: hidden`, and page-owned breaks; all three rendered proof pages show one header and one footer with no cross-page content. |
| P3 | Produce exactly one page per selected instrument plus one Reference page. | implemented | reported with evidence | Playwright verifies Piano 1 + Drums + Reference = three pages and the no-selection state = one Reference page. |
| P4 | Center the one instrument name belonging to each copy in that page's footer. | implemented | reported with evidence | Geometry assertions and rendered pages verify centered `Piano 1`, `Drums`, and `Reference` labels. |

## Active request: one-file chord-chart import

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| A1 | Create a reusable skill for the Karen Music chord-chart import workflow. | implemented | reported with evidence | `C:\Users\olive\.codex\skills\import-karen-chord-chart\SKILL.md`; validator and smoke client passed. |
| A2 | Accept a Karen Music chart-code JSON file. | implemented | reported with evidence | `POST /api/import/json`; backend and browser tests. |
| A3 | Accept text and ChordPro chart code. | implemented | reported with evidence | `POST /api/import/code`; `tests/fixtures/import-chart.chordpro`; live unsaved-draft browser proof. |
| A4 | Accept a handwritten or printed chord-chart image and use OCR. | implemented | reported with evidence | `POST /api/import/vision`; provider fallback; live Gemini import of `chart_hand/Youth/move_your_boat_sheet.jpg`; mocked browser review test. |
| A5 | Accept a chord-chart PDF and use document vision. | implemented | reported with evidence | PDF MIME/extension routing, shared vision schema, mocked backend route test. |
| A6 | Show every field, notation rule, image-quality rule, privacy boundary, and review rule the importer uses. | implemented | reported with evidence | Criteria-first Import modal and `GET /api/import/criteria`; desktop/mobile proof images. |
| A7 | Fill the active chord editor when the operator presses Import and applies the reviewed result. | implemented | reported with evidence | Import review -> **Fill the chord editor**; browser proof shows title, key, chords, marks, and `currentSongId: null`. |
| A8 | Provide a current outline of every app feature. | implemented | reported with evidence | `docs/CURRENT_FEATURE_MAP.md`, including implemented, partial/scaffolded, and migration-only surfaces. |
| A9 | Visualize the current app and import workflow. | implemented | reported with evidence | Interactive feature map artifact `karen-music-feature-map.html`. |
| A10 | Successfully translate any handwriting or layout without exception. | partially implemented | reported with evidence | Broad accepted formats and provider fallback are implemented, but the private corpus observed 94.42%–98.55% across two production-configuration runs; ambiguous/cropped handwriting and adjacent-column shifts cannot be guaranteed, so confidence, missing fields, warnings, and correction remain mandatory. |
| A11 | Repair the inline feature map after the MCP sandbox render timed out. | implemented | reported with evidence | Replaced the JavaScript-driven selector with a static-first import flow and responsive four-area feature map; rendered successfully with no fragment script, no external calls, no console errors, and no horizontal overflow at 736 px or 320 px. |
| A12 | Build a private permission-cleared corpus with at least three handwriting styles and one real multipage chord PDF. | implemented | reported with evidence | Ignored `private/import_accuracy_corpus/` contains three locally generated handwriting styles and a two-page scanned-style PDF, source hashes, permission basis, and no-save/no-payload-retention policy. |
| A13 | Create expected-value manifests and measure metadata, sections, measures, chords, slash bass, circles, dots, and x marks. | implemented | reported with evidence | Four expected manifests cover 44 metadata values, 10 sections, 20 measures, 84 beat slots, 53 chords, 9 bass events, 6 circles, 9 dots, and 19 x strokes; sanitized scorer reports every requested dimension. |
| A14 | Fix reproducible importer errors and add regression tests. | implemented | reported with evidence | `import_service.py` now fixes only surplus blank beat slots, warns with section/measure location, preserves surplus non-empty notation, and ties annotations to visible grid columns; `tests/test_import_accuracy.py` covers the fixes and mismatch detection. |
| A15 | Finish with targeted tests and sanitized proof without saving imported songs. | implemented | reported with evidence | 18 Python tests and 3 import browser tests passed; private capture shows criteria, review, and filled editor with `song_id_after_fill: null` and `save_clicked: false`. |
| A16 | Create a private review-ready case study and fixed-scope service proof bundle. | implemented | reported with evidence | Ignored `private/chord-chart-import-case-study/` contains case study, accuracy report, architecture, test evidence, proof ledger, review checklist, screenshots, and an unpriced “paper chart to editable library” pilot scope. |
| A17 | Do not change unrelated UI behavior, publish/upload charts, expose provider payloads, price/contact anyone, or auto-save imports. | implemented | reported with evidence | No UI source changed; `private/` is ignored; reports retain normalized mismatches only; proof uses synthetic sources; no publication/outreach/pricing occurred; capture asserts no Save and null song id. |
| A18 | Turn all three supplied handwritten chart photographs into formatted pictures of filled Karen Music editors. | implemented | reported with evidence | `output/playwright/filled-charts-2026-07-19/` contains three reviewed editor screenshots, their local chart-code drafts, and a capture manifest. |
| A19 | Use the review-gated import workflow and do not save or publish the filled charts. | implemented | reported with evidence | Real browser imports produced 9/107, 8/68, and 8/91 section/measure counts; every captured editor had `id: null`, the manifest records `save_clicked: false`, and all artifacts remain local only. |
| A20 | Default two un-underlined handwriting chords to an even measure split (beats 1/3 in 4/4 and 1/4 in 6/8), preserve explicit positions, and redo Move Your Boat. | implemented | reported with evidence | `import_service.py` prompt/schema/normalizer and regression tests implement the rule; the criteria screen exposes it; the regenerated Move Your Boat draft has 83 two-chord measures on beats 1/3 with zero browser-state mismatches and remains unsaved. |

## Verification record

### Sites reconstruction and expansion

| ID | Requirement | Delivery state | Communication state | Evidence |
|---|---|---|---|---|
| S1 | Use the working desktop shortcut and packaged `.exe` as the visual reference. | implemented | reported with evidence | Shortcut target resolved, packaged app launched and inspected, and its embedded `index.html` identified as the visual baseline. |
| S2 | Recreate the packaged desktop layout in Sites and improve it. | implemented | reported with evidence | Private Sites version 1 is deployed; desktop/mobile proof and 4/4 focused browser tests verify the sidebar, command bar, paper tabs, chart sheet, modal trigger, variable measure shortcut, print, and mobile toolbar. |
| S3 | Apply Astryx, frontend design, design-taste, impeccable polish, and product audit. | implemented | reported with evidence | Astryx AppShell guidance informed the shell, grouped commands, focus states, responsive drawer, and mobile toolbar; anti-slop polish retained the packaged geometry and paper dominance. |
| S4 | Expand the product using the supplied sitemap/app-expansion context. | partially implemented | reported with evidence | Chart, Lyrics, Database, hosted library, imports, exports, print, and settings-adjacent controls form the first working route; the larger multi-route sitemap remains documented for a later phase. |
| S5 | Create useful project skills. | implemented | reported with evidence | Repository-local `karen-music-ui-guardian` and global `karen-music-project-router` were created and both passed `quick_validate.py`. |
| S6 | Preserve newer current behavior while using the older packaged look. | implemented | reported with evidence | Sites code is isolated under `sites/karen-music-director`; packaged files, current `index.html`, `app.py`, translations, and `songs.db` were not replaced or uploaded. |
| S7 | Publish the completed result through Sites. | implemented | reported with evidence | Private production deployment succeeded at `https://karen-music-director.oliverp789.chatgpt.site`; final signed-in D1 save/load verification awaits user consent to share account identity with the private site. |

Verification:

- `npm test`: production build and source-contract test passed.
- `tests/e2e/sites-replica.spec.js`: 4/4 passed against the live local preview.
- Screenshots: `output/playwright/sites-karen-music-director/desktop.png` and `mobile.png`.
- Data boundary: no row from `songs.db` was copied into the Sites project; initial content is synthetic demonstration data.
- Hosted limitation: production is deployed privately, but the browser remains at the identity-consent screen, so hosted D1 save/load is not yet verified.

### Variable-measure keyboard workflow

| ID | Requirement | Delivery state | Communication state | Evidence |
|---|---|---|---|---|
| K1 | Make an empty pre-measure removable with Backspace. | implemented | reported with evidence | Keyboard handler removes `section.preMeasure`, selects normal measure 0 beat 0, and the focused browser test passed. |
| K2 | Make Ctrl+1 through Ctrl+6 create a measure with exactly the shortcut's beat count. | implemented | reported with evidence | All six values passed against the served runtime, including 5 and 6 beats in a 4/4 chart. |
| K3 | Insert the new measure immediately to the right of the indexed current measure. | implemented | reported with evidence | Test asserts measure lengths are `[4, requested, 4]`. |
| K4 | Select the new measure and preserve the later measure's contents. | implemented | reported with evidence | Test asserts cursor at inserted measure beat 0 and later G chord unchanged. |
| K5 | Preserve ordinary Tab and Ctrl+Space insertion behavior. | implemented | reported with evidence | Existing focused regression cases remain green in the 7/7 targeted run. |

- Isolated print packets: `tests/e2e/print-preview.spec.js` passed 5/5 on a fresh port.
- Real print proof: `output/pdf/print-packet-proof.pdf` contains exactly three Letter pages (612 x 792 points).
- Visual proof: all three rendered pages contain one page-local header and centered footer label with no neighboring-page overflow.
- Full browser suite on a fresh port: 38 passed, 1 flaky pass, and the same 10 unrelated existing regressions remained; all five print-path tests passed.
- Variable-measure verification on a fresh port: focused suite passed 7/7; complete suite passed 41/51, including all seven measure and all five print tests. The same ten unrelated tracked regressions remained.

- `python -m pytest tests\test_backend.py tests\test_import_export.py tests\test_import_accuracy.py -q`: 21 passed.
- `npx playwright test tests/e2e/song-import.spec.js --project=chromium`: 3 passed.
- Full `npm run test:e2e`: 38 passed and 10 unrelated existing UI/layout expectations failed in the dirty worktree. Import tests remained green.
- Browser proof: 1440x1000 and 390x844 import modal, zero console errors after removal of the stale `/src/tailwind.css` request.
- Inline visualization repair: 4 workflow stages, 4 feature groups, and 12 feature rows rendered at 736 px and 320 px; at 320 px, inner width and scroll width both measured 288 px.
- Live OCR proof: three synthetic handwriting styles and one two-page scanned-style PDF completed through Gemini; two post-fix production-configuration runs measured 94.42% and 98.55%, exposing provider variance instead of claiming a perfect result.
- Sanitized proof: criteria, live review, and filled-unsaved-editor screenshots plus a capture manifest with no Save click and a null song id.
- Skill proof: `quick_validate.py` passed; `inspect_import.py` produced an unsaved ChordPro draft through the running app.
- User-chart proof: three supplied photographs were transcribed conservatively into local chart code, passed the import review route, and rendered as filled unsaved editor screenshots. Karen titles plus ambiguous rolls, melody numbers, phrase arcs, and x/dot/figured-bass marks remain explicitly review-gated.
- Two-chord handwriting default: unit coverage verifies beats 1/3 in 4/4, beats 1/4 in 6/8, and preservation of explicit underlined/grid positions; live Move Your Boat browser proof verified 83 applicable measures, zero placement mismatches, and `state.id: null`.

## Deferred by project

### 2026-07-28 annotated Sites refinement

| ID | Requirement | Delivery state | Communication state | Evidence |
|---|---|---|---|---|
| S8 | Replace the sidebar Settings/Library switcher with a Library-only `Song Library` surface. | verified | reported with evidence | Browser snapshot contains no `.sidebar-tabs`; Library empty state remains functional. |

### 2026-08-01 website-first legacy behavior merge

| ID | Requirement | Delivery state | Communication state | Evidence |
|---|---|---|---|---|
| WEB-01 | Make the music editor the main inspiration and restore its typing/modal behavior in Sites. | verified | reported with evidence | Production New Song → Enter → I produced one Intro, one measure, and four beats while the Sites shell stayed intact. |
| WEB-02 | Preserve the village background. | verified | reported with evidence | `/karen-village-aerial.png` remains the paper-area background. |
| WEB-03 | Use legacy-style Settings and the new sidebar for Database. | verified | reported with evidence | Local Settings controls and production Database/sidebar-plus-chart state passed. |
| WEB-04 | Never move rows on section-insert hover. | verified | reported with evidence | Local and production movement measured 0 px. |
| WEB-05 | Use a paper-and-width-measurement icon for functional fit-to-width. | verified | reported with evidence | Local and production changed 89% to a computed 126%; icon geometry measured 18×22 px. |
| WEB-06 | Rename the product from Worship Music Editor to a website. | verified | reported with evidence | Production title and brand plus the root title use `Karen Music Director Website`. |
| WEB-07 | Verify and privately update the existing Sites project. | verified | reported with evidence | Sites version 12 deployed owner-only; production route ready, Database/sidebar, chart, fit, blank-song typing, and clean console passed. |
| S9 | Move Karen keyboard plus style/category/group vocabulary controls to header Settings; place moon and `?` Docs controls below Lyrics. | verified | reported with evidence | Header popover and rail controls were clicked in-browser; theme changed dark→light and the full shortcut guide opened. |
| S10 | Use clickable muted ghost measures instead of `+ Measure`, creating every full measure through the clicked slot. | verified | reported with evidence | INTRO ghost 7 created measures 5–7, selected measure 7, retained ghost 8, and rendered zero bottom Add Measure controls. |
| S11 | Make style selectable/configurable, English title content-sized inside tight parentheses, and row steppers external to the row. | verified | reported with evidence | Browser geometry and interaction checks passed; focused updated Chromium journey passed. |
| S12 | Complete “make the database from the different …”. | blocked | acknowledged | The sentence is incomplete; no database change was guessed and no private source was uploaded. |

### Representative real-writer accuracy pilot

- Status: deferred.
- Reason: the requested permission-cleared synthetic corpus is complete, but synthetic fonts and five generated pages do not represent arbitrary real writers, lighting, page order, or scanning conditions.
- Exact next action: obtain explicit permission for a private multi-writer pilot, add source-condition labels and repeated runs, then publish only aggregate/redacted evidence after a separate review.
- Privacy boundary: do not benchmark or publish worship-team charts, names, community-specific material, or provider payloads without explicit approval.

### Existing full-suite UI regressions

- Status: deferred.
- Reason: ten failures concern database metadata presentation, Karen hotkey/settings visibility, Only-span layout expectations, zoom/legacy repair/lead-modal behavior, design preset names, and sidebar scrolling. They predate or sit outside the one-file import scope and overlap unrelated dirty worktree changes.
- Exact next action: handle the failures in a dedicated regression task, beginning with a clean baseline comparison and preserving the current import tests as a locked green contract.

### Packaged desktop restoration

| ID | Requirement | Delivery state | Communication state | Evidence |
|---|---|---|---|---|
| R1 | Restore the desktop UI to the visual version embedded in the current `.exe`. | implemented | reported with evidence | `index.html` was restored from the packaged `_internal/index.html`; only the approved print/editor deltas were reapplied. |
| R2 | Preserve Ctrl+1–6 exact-beat insertion and Backspace pre-measure removal. | verified | reported with evidence | Focused Playwright checks passed against source and the rebuilt packaged runtime. |
| R3 | Preserve the historical database. | verified | reported with evidence | Source and packaged `songs.db` SHA-256 hashes match; both contain 51 songs. |
| R4 | Use the paper header as the only metadata layout. | verified | reported with evidence | Redundant `.editor-heading` removed; paper title/style/key fields remain editable and print as plain text. |
| R5 | Print one independent Letter sheet per selected instrument plus Reference. | verified | reported with evidence | Seven focused tests passed; generated proof is 3 pages at 612 x 792 points with Piano 1, Drums, and Reference copies. |
| R6 | Center one different instrument in each page footer. | verified | reported with evidence | Each `.print-sheet` replaces the interactive picker with its page-local instrument or Reference label. |
| R7 | Repackage the Desktop shortcut executable. | verified | reported with evidence | PyInstaller build succeeded at the shortcut target; packaged source and database hashes match the repo. |

Full-suite disclosure: 37/55 tests passed. The requested print and measure paths are green. Eighteen failures remain in functionality associated with newer post-package UI/import/settings/Sites expectations or legacy regressions and are deferred rather than silently reintroduced into the restored shell.

## Active request: blank New Song and keyboard-first composition

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| NS1 | New Song must show a whole blank editor with no sections, measures, or beats. | verified | reported with evidence | Focused Chromium blank-state assertions passed. |
| NS2 | Clear content fields and use muted non-content placeholders; Key is a dropdown placeholder plus note choices. | verified | reported with evidence | Empty values, Key select, and rendered muted paper placeholders verified. |
| NS3 | Keep 4/4 as the default and Tempo empty until entered. | verified | reported with evidence | Focused Chromium asserted both values. |
| NS4 | Enter then I creates one Intro with one four-beat measure; preserve Tab and Space flow. | verified | reported with evidence | New Song flow plus existing measure-navigation browser tests passed. |
| NS5 | Autosave each minute, silently create the first save, and overwrite the same `chart_images` files. | verified | reported with evidence | Browser identity test, backend overwrite test, and 25/25 Python suite. |
| NS6 | Give Export a distinct PDF-to-Downloads job. | verified | reported with evidence | Download name and `%PDF-` header verified in Chromium. |
| NS7 | Place `?` docs with the top controls and make zoom a connected exponential minus/percent/plus oval. | verified | reported with evidence | Rendered desktop review plus focused 125% zoom assertion. |
| NS8 | Create reusable UI/navigation and song-making skills. | verified | reported with evidence | Both project-local skills passed official validation. |

Full-suite disclosure: 38/66 browser tests passed before Node exhausted memory. The requested slice is green; separate Sites/stale desktop/import assertions and the existing `renderOnlySpans` `endRect` error remain deferred to dedicated regression work.

## Active request: matched legacy and Sites header, focus, and scrolling

| ID | Atomic request | Delivery | Communication | Evidence |
| --- | --- | --- | --- | --- |
| HS1 | Apply the requested interaction model to both the legacy editor and the Sites version. | verified | reported with evidence | Both source surfaces changed; legacy focused browser checks and Sites live preview passed. |
| HS2 | Put English below Karen and align Karen, Style, and Key at one primary size, with Key right-aligned. | verified | reported with evidence | Legacy geometry test and Sites 21px/zero-top-offset browser measurements. |
| HS3 | Keep Style both typable and suggestion-backed; keep Key a dropdown. | verified | reported with evidence | Native input+datalist and select controls verified on both surfaces. |
| HS4 | Do not move the visual viewport when clicking within the chord editor. | verified | reported with evidence | Click viewport snapshots plus `preventScroll`; focused legacy regression passed. |
| HS5 | Route wheel scrolling only to the region under the pointer, including sidebar, dropdowns, text fields, and nested regions. | verified | reported with evidence | Hover-region Chromium test passed; pointer-routed wheel handlers and contained overscroll exist in both sources. |
| HS6 | Make Sites New Song use the same direct blank 4/4 start. | verified | reported with evidence | Live Sites New Song → Enter → I produced one four-beat Intro with zero console errors. |
| HS7 | Publish the updated Sites implementation without exposing private local data. | verified | reported with evidence | Owner-only Sites version 11 deployed successfully; production New Song showed zero sections, empty metadata, 4/4, and zero console errors. |

Full-suite disclosure: the one-worker legacy browser suite was attempted against the authoritative source runtime and exceeded the four-minute bound after reaching unrelated database and Karen-input cases. The four focused header, blank-song, hover-scroll, and viewport-preservation checks passed 4/4.

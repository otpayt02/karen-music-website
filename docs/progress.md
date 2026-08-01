# Progress

## Phases

1. Existing editor and database - working
2. WYSIWYG print layout - implemented
3. Isolated print packet pages - verified
4. Variable-measure keyboard workflow - verified
5. Private Sites replica - deployed; hosted persistence check pending consent
6. Full regression cleanup - deferred
7. Packaged desktop restoration - verified and rebuilt
8. Sites print-first direction - verified and privately deployed
9. Sites legacy editor restoration - implemented, verified, and privately deployed
10. Sites advanced parity - implemented, verified, and privately deployed as version 4
11. Reusable Sites restart skill - created and functionally starts/restarts the server; clean shell detachment remains partial
12. Sites editor typography, adaptive measures, pre-measure, Karen modal, and paper-control parity - implemented and browser verified
13. Local database/chart-images reconciliation - verified with all 53 supported files covered
14. Karen-title-only modal trigger correction - verified and privately deployed as Sites version 5
15. Group dropdown and bounded BPM slider - verified and privately deployed as Sites version 6
16. Seven-option instrument dropdown - verified and privately deployed as Sites version 7
17. Paper-owned metadata and Settings/Library sidebar - verified and privately deployed as Sites version 8
18. Annotation-driven Library/settings/help and ghost-measure refinement - verified and privately deployed as Sites version 10
19. Desktop blank-song workflow and editor reference skills - verified
20. Matched legacy/Sites paper header and pointer-routed scrolling - verified and privately deployed as Sites version 11
21. Website-first legacy behavior merge - verified and privately deployed as Sites version 12

## Completed milestone

All song metadata is now edited directly on the chord-chart paper. Time signature offers only 2/4, 3/4, 4/4, and 6/8 and resets to 4/4 for every new chart. The sidebar now switches between mutually exclusive Settings and Library panels, and the Database paper tab is gone.

## Current focus

Sites version 10 is privately deployed from commit `b61f998445b5c55920704ff0e6a607aa9b046e26`. Build and source-contract checks pass; 13/14 full synthetic Chromium journeys passed before one test-order mistake, and that corrected journey passed in isolation. Direct local browser verification covered the header Settings menu, Library-only sidebar, rail theme/help controls, ghost materialization, style/category/group vocabulary, autosizing English title, and external row controls with zero console errors; the production deployment completed successfully.

## Current blocker

The Sites editor remains owner-only and contains synthetic data only. The separate desktop database reconciliation and its preserved unmatched history rows were not copied or deployed. The newest database request is incomplete after “from the different,” so no new database work was inferred.

## Next milestone

Finish the incomplete database sentence, then verify one synthetic signed-in save/load cycle against the private production URL. Never upload `songs.db` or real charts.

## Phase 19 - desktop New Song vertical slice

- Current focus: blank New Song, one-minute local autosave, PDF Export, compact help/zoom chrome, and reusable editor-reference skills in the authoritative desktop `index.html` runtime.
- Implemented: direct blank reset; empty metadata placeholders; Key dropdown; 4/4 default; Enter/I section start; silent `chart_images` PNG/JSON overwrite; Letter PDF download; connected exponential zoom control; two project-local skills.
- Verification complete for this slice: 25/25 Python tests; 4/4 affected desktop browser checks; Key transpose check; downloaded PDF header; skill validation.
- Full-suite disclosure: 38/66 browser tests passed before Node exhausted memory. Requested New Song/autosave/PDF/zoom, measure navigation, print, lyrics, and slur paths passed. Separate Sites/stale UI/import expectations and the pre-existing `renderOnlySpans` `endRect` reference error remain outside this slice.
- Privacy: local only; no database, chart, or proof media is uploaded or deployed.
- Next milestone: compose the real song in the repaired blank editor; treat the legacy `endRect` annotation defect as a separate regression task.

## Phase 20 - matched legacy and Sites interaction contract

- Current focus: one paper-header geometry and one pointer-owned scroll/focus rule across the desktop source and private Sites replica.
- Implemented: English under Karen; equal-size Karen/Style/Key primary row; typed Style suggestions; Key dropdown; hover-owned dropdown/stepper/nested scrolling; viewport-preserving chart clicks; direct blank Sites New Song.
- Verification: 4/4 focused legacy Chromium checks; Sites production build and source-contract test; live Sites blank New Song → Enter → I with one section, one measure, four beats, and zero console errors.
- Full-suite disclosure: the required full legacy browser run was attempted with one worker against the source server but did not finish within the four-minute bound; it reached unrelated database/Karen-input cases. The four touched-path checks remain green.
- Privacy: Sites remains owner-only and synthetic; local `songs.db`, chart images, attachments, and provider data were not published.
- Next milestone: confirm private production version 11, then use the editor for the active song.

## Phase 21 - Sites website becomes the product

- Current focus: make the private Sites website the primary Karen Music surface while using the legacy editor as the typing and modal behavior oracle.
- Implemented: Database-as-sidebar; legacy-style Settings groups; stable-height section insert hover; working fit-to-width paper icon; website naming; retained village shell and editor keyboard/modal logic.
- Verification: lint and production build passed; local desktop/mobile checks measured zero hover shift and zero page overflow; focused legacy Key alignment passed; production Database/sidebar, fit-to-width, and New Song → Enter → I passed with zero routed-console errors.
- Privacy: keep the deployment owner-only and synthetic; do not upload `songs.db`, chart images, or real song content.
- Next milestone: compose the active song in the website and verify one synthetic signed-in save/load cycle before any real-song hosting decision.

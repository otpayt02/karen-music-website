# Request adherence

Last updated: 2026-07-28

## Current redesign request

| ID | Requirement | Phase | Status | Evidence or next action |
| --- | --- | --- | --- | --- |
| UI-01 | Use the Karen village and mountain reference while preserving features. | 1 | verified | Sites stage uses the source image; five focused browser tests preserve the current replica paths. |
| UI-02 | Make the white editor paper match a real printout with fixed header and footer. | 1 | verified | 8.5:11 screen ratio; 8.5 x 11 inch print CSS; editable header/footer fields remain page-bound. |
| UI-03 | Open a print-room modal from Print with numbered pages. | 1 | verified | Three page buttons, previous/next, page caption, and dialog flow passed. |
| UI-04 | Print one instrument per page with the same header/footer and an extra Reference copy. | 1 | verified | Three-page PDF at 612 x 792 points with Piano 1, Acoustic Guitar, and Reference. |
| UI-05 | Remove colored section-name tags. | 1 | implemented | Colored section rails were removed from the Sites paper. |
| UI-06 | Do not show the song wizard on startup. | 1 | verified | Startup browser check sees no dialog; New song still opens it. |
| UI-07 | Use smoother multiplicative zoom. | 1 | implemented | Zoom steps use a 1.12 multiplier with 55%-175% bounds and reduced-motion fallback. |
| UI-08 | Redesign sidebar, top controls, sticky tool banner, symbols, docs, shortcuts, Karen keyboard, modals, navigation, and mobile shell. | 2 | deferred | Begin with a behavior inventory and move all non-help circle actions into the sidebar. |
| UI-09 | Add cursor-hover-routed scrolling, first-click reliability, editor focus recovery, and viewport anchoring during edits and zoom. | 3 | deferred | Add pointer-region routing and scroll-anchor browser tests before implementation. |
| UI-10 | Add a contextual right-click toolbar with the relevant tools. | 3 | deferred | Use the Astryx ContextMenu contract; keep every action available by keyboard and visible UI. |
| UI-11 | Group metadata logically and move advanced details into the database rather than the sidebar. | 4 | deferred | Define basic sidebar fields versus advanced database fields before schema/UI changes. |
| UI-12 | Store prior images and visible documents, classify good/bad sources, and pair approved handwritten/typed counterparts for ground truth. | 5 | deferred | Inventory local attachments and provenance first; keep unmatched sides valid and require human approval before ground-truth promotion. |
| UI-13 | Keep private song and document data off the hosted demo. | all | verified | No row or attachment from `songs.db` was copied to Sites. |
| UI-14 | Add two instrument cue ranges per visual row. | 6 | verified | Editor/print markers and the lead-dialog range controls passed focused browser verification. |
| UI-15 | Restore the full Karen keyboard. | 6 | verified | All 55 characters, command keys, and physical A-Z/Shift+A-Z mappings passed in-browser. |
| UI-16 | Add explicit import review before replacing the editor. | 6 | verified | Synthetic JSON review preserves the current chart until confirmation and loads only an unsaved draft. |
| UI-17 | Restore advanced lead navigation. | 6 | verified | Per-beat spacing, slot/measure navigation, octaves, clear, undo, and redo passed in-browser. |
| UI-18 | Add owner-scoped, review-gated hosted persistence. | 6 | partially implemented | Source and local API/browser checks passed, and version 4 was deployed owner-only; one signed-in synthetic D1 save/load cycle remains to be verified. |
| UI-19 | Preserve eight-column paper plus fixed header/footer. | 6 | verified | Browser geometry asserts eight columns, exact boundaries, and zero paper overflow. |
| UI-20 | Verify every visible control and shortcut with synthetic data only. | 6 | verified | 14/14 focused browser tests and sanitized screenshots; no `songs.db` or real chart artifact in Sites source. |
| OPS-01 | Create a reusable skill that starts the Karen Music Sites editor or stops and restarts its existing server. | 7 | partially implemented | `$restart-karen-music-sites` and its PowerShell launcher were created and structurally validated. Two live runs changed the listener PID and produced a healthy 200 response, but the Codex shell call remained attached and timed out. |
| OPS-02 | Handle required setup through PowerShell. | 7 | implemented | The launcher validates Node 22+, checks the npm dev script, installs dependencies only when `node_modules` is missing, writes temp logs, and waits for HTTP readiness. |
| OPS-03 | Avoid stopping unrelated processes. | 7 | implemented | Port ownership is checked against the exact Sites project through the listener process and parent chain before `Stop-Process` is allowed. |
| UI-21 | Apply legacy chord-editor logic and pre-measure behavior to Sites. | 12 | verified | Pre-measure creation selects its beat, accepts chord shortcuts, navigates into the first normal measure, and deletes through the locked smart-backspace path. |
| UI-22 | Match legacy fonts, center style, enlarge root chords, and adapt dense measure widths without paper overflow. | 12 | verified | Instrument Sans/Fraunces/IBM Plex Mono/Noto Sans Myanmar roles, centered style geometry, segmented chord sizing, and proportional row weights passed browser geometry checks. |
| UI-23 | Give every section type a distinct barely visible muted background. | 12 | verified | Intro, Verse, Pre-Chorus, Chorus, Bridge, Solo, and Ending use distinct section-wide wash tokens in editor and print rendering. |
| UI-24 | Parenthesize the English title in black and exempt it from Karen input. | 12 | verified | Sidebar, editor paper, and print preview render black flanking parentheses; English-title focus never opens the Karen modal. |
| UI-25 | When Karen input is enabled globally, open the modal for every non-English text box and let Enter apply and exit. | 12 | superseded | Replaced by the user's narrower Karen-title-only trigger requirement. |
| UI-26 | Make keyboard numbers float and keys fade dim-to-bright on hover without moving hit targets. | 12 | verified | Number keys use round floating-shadow animation; hover brightness/opacity transition and stable click targets passed all 55 key clicks. |
| UI-27 | Put per-row up/down measure controls at the right edge, default new rows to eight, and center a footer checkbox instrument picker. | 12 | verified | Row control/key-right alignment, 8→9→8 operation, mobile reachability, and centered footer multi-checkbox selection passed. |
| DATA-01 | Make local database songs reflect the contents of `chart_images`. | 13 | verified | Nineteen structured JSON sources equal their ID-matched database rows; all 53 supported files are referenced by the 56-song local library. |
| DATA-02 | Preserve historical songs while reconciling the folder. | 13 | verified | No rows were deleted; all 51 original rows remain and a timestamped private rollback database was created. |
| DATA-03 | Verify the synchronized library in the running app. | 13 | verified | SQLite integrity is `ok`, 6 focused tests passed, and Playwright observed `56 songs` and local source filenames on the Database tab. |
| UI-28 | Open the Karen keyboard automatically only when a Karen title textbox is focused. | 14 | verified | Default-on title-only routing passed desktop/mobile browser checks; English title, style, lyrics, and library search remained modal-free, while Enter applied and closed the Karen title modal. |
| UI-29 | Make Group a dropdown limited to Praise & Worship, Kids, Youth, Choir, or Solo, and make BPM a draggable 55–155 slider. | 15 | verified | Exact dropdown options and slider bounds passed in Chromium; the paper footer stayed synchronized and server/import normalization prevents out-of-range persistence. |
| UI-30 | Limit instrument selection to Piano 1, Piano 2, Acoustic Guitar, Electric Guitar, Drums, Electric Bass, and Keytar. | 16 | verified | Both checkbox dropdowns expose exactly seven choices; synthetic import and hosted persistence normalize obsolete or unsupported values; 14/14 Chromium journeys passed. |
| UI-31 | Move all metadata editing onto the paper, restrict time signature to 2/4, 3/4, 4/4, or 6/8 with 4/4 for every new chart, and convert the sidebar to exclusive Settings/Library views with no Database paper tab. | 17 | verified | Browser tests verified paper controls, four exact meter options, 6/8→New Song→4/4 reset, exclusive sidebar panels, absent Database tab, mobile access, and fixed paper geometry. |
| UI-32 | Make the sidebar Library-only, move Karen keyboard and configurable style/category/group settings to the header Settings menu, and restore rail theme/help controls. | 18 | verified | Browser snapshot shows `Song Library`, no sidebar tabs/settings panel, header settings vocabulary fields, a functional current song-category selector, a moon toggle, and the complete `?` shortcut guide. |
| UI-33 | Replace bottom Add Measure controls with muted eight-slot ghost measures that materialize every measure through the clicked slot. | 18 | verified | Clicking INTRO ghost 7 produced seven complete four-beat measures, selected measure 7, left only ghost 8, and no `.add-measure` control. |
| UI-34 | Make song style a dropdown, tightly autosize the parenthesized English title, and keep row-density controls outside the measure grid. | 18 | verified | Style configuration added `Gospel`; the title grew from 26 px to 209 px with its text; row control began 4 px beyond the grid and remained inside the paper. |
| DATA-04 | “Make the database from the different …” | 18 | blocked | The request ended mid-sentence. No database mutation or hosted upload was inferred; exact next action is for the user to finish the database requirement. |

Completion claims apply to verified rows only; UI-18 and OPS-01 remain partial until their recorded blockers are cleared.

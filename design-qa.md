# Design QA: print-first Sites direction

- Source visual truth:
  - `C:\Users\olive\Projects\music_director_database\karen_music_website\output\playwright\sites-karen-music-director\desktop.png`
  - `C:\Users\olive\Projects\karen-scraper-web\assets\karen-village-aerial.png`
- Implementation screenshot: `C:\Users\olive\Projects\music_director_database\karen_music_website\output\playwright\sites-karen-music-director-phase-1\desktop-1440x1000.png`
- Combined comparison: `C:\Users\olive\Projects\music_director_database\karen_music_website\output\playwright\sites-karen-music-director-phase-1\design-comparison.png`
- Focused print-room screenshot: `C:\Users\olive\Projects\music_director_database\karen_music_website\output\playwright\sites-karen-music-director-phase-1\print-room.png`
- Focused mobile screenshots:
  - `C:\Users\olive\Projects\music_director_database\karen_music_website\output\playwright\sites-karen-music-director-phase-1\mobile.png`
  - `C:\Users\olive\Projects\music_director_database\karen_music_website\output\playwright\sites-karen-music-director-phase-1\mobile-print-room.png`
- Viewports: 1440 x 1000, 1440 x 1400, and 390 x 844 CSS pixels at device scale factor 1.
- Source and implementation density: all browser comparison captures use 1 CSS pixel per output pixel. The source and implementation desktop frames are both 1440 x 1000.
- State: dark editor shell, synthetic unsaved demonstration song, Chart surface, sidebar open, and print room page 1.

## Full-view comparison

- The original shell hierarchy remains recognizable: top song actions, left metadata sidebar, sticky command bar, vertical work-surface tabs, white chord paper, chart sections, and fixed paper footer.
- The stage now uses the requested Karen village and mountain image with a dark readability scrim.
- The paper changed from a short workspace panel to the Letter ratio. Header and footer remain locked to the top and bottom boundaries.
- Colored section rails were removed. Section names now use neutral ink and rules.

## Required fidelity surfaces

- Fonts and typography: existing interface and Karen-script stacks are preserved. Print hierarchy remains legible at desktop, mobile, and rendered PDF sizes.
- Spacing and layout rhythm: Letter geometry is 8.5 x 11 inches in print and 8.5:11 on screen. Browser measurement returned 816 x 1056 CSS pixels at full scale with no internal scroll overflow.
- Colors and tokens: the case, paper, ink, and leaf accent remain consistent. The photograph is outside the printable paper and never prints.
- Image quality: the source `karen-village-aerial.png` is reused directly rather than approximated with CSS or an inline SVG.
- Copy and content: print-room labels describe the real page contract. The demonstration song remains explicitly sanitized.
- Icons: the existing shell glyphs are preserved in this phase. Sidebar icon migration is deferred to the approved shell phase.
- Interaction states: print-room open/close, numbered page selection, previous/next disabling, print-all, mobile layout, editor tab changes, and startup wizard gating were exercised.
- Accessibility: dialog labels, page navigation labels, current-page semantics, focus-visible styles, disabled controls, reduced-motion behavior, and zero horizontal mobile overflow are present.

## Comparison history

1. Initial mobile capture showed the final chart section clipped because four measures wrapped into two rows inside the fixed Letter ratio.
2. The mobile measure row was changed to keep all measures on one row with zero-width grid minimums and smaller page-local controls.
3. Post-fix evidence shows Intro, Verse, Chorus, the fixed footer, and the mobile toolbar together. Geometry reports `clientHeight == scrollHeight` and `clientWidth == scrollWidth`.

## PDF proof

- PDF: `C:\Users\olive\Projects\music_director_database\karen_music_website\output\pdf\sites-print-room-phase-1.pdf`
- Result: 3 pages, each 612 x 792 points.
- Page-local centered labels: Piano 1, Acoustic Guitar, and Reference.
- Rendered pages show one header, one chart body, and one footer per page with no cross-page overflow.

## Remaining scope

The broader sidebar, context menu, Karen keyboard, hover-routed wheel/scroll behavior, cursor anchoring, advanced database details, attachment review, and ground-truth pairing are later phases. They are not Phase 1 design defects.

final result: passed

# Karen Music Director Sites design discovery

Status: Phase 1 print direction implemented and browser/PDF verified on 2026-07-26. Later shell and data phases remain staged.

## Source of truth

- Visual baseline: `build/package-dist/KarenMusicDirector/_internal/index.html`.
- Runtime baseline: the desktop shortcut `Karen Music Director.lnk` and its packaged executable.
- Behavior baseline: the current repository `index.html`, `app.py`, tests, translations, and `songs.db`.
- Rule: do not replace current behavior with the older packaged source. Recreate its recognizable shell while preserving newer verified behavior.

## Design read

Reading this as a keyboard-first church music production workspace for S'gaw Karen worship teams in Thailand and Burma, with a quiet rehearsal-desk visual language and the printed chord sheet as the dominant object.

## Observed packaged layout

- Dark graphite application frame around a large white chart surface.
- Collapsible dark sidebar for song metadata, instruments, and editor controls.
- Compact floating top command bar with song key/style and zoom controls.
- Vertical Chart, Lyrics, and Database paper tabs.
- Section rails, measure grid, chord symbols, row controls, and active-beat focus inside the paper.
- Light/dark modes, Karen/English language support, modals, print, import/export, and database workflows.
- Typography: Instrument Sans for interface text, IBM Plex Mono for utility data, Fraunces for selected display roles, and Noto Sans Myanmar for Karen text.

## Product-design audit

### Preserve

- The paper-centered editing model and the chord grid's spatial rhythm.
- Keyboard-first navigation and visible focus.
- Chart, Lyrics, and Database as the three primary work surfaces.
- Song metadata, translations, modals, import/export, print packets, notation rendering, and historical songs.
- Compact desktop density suited to rehearsal use.

### Improve

- Separate song-level actions, view controls, and notation tools into clear command groups.
- Replace ambiguous dark square controls with stable icons plus accessible names or short labels.
- Make the top command bar sticky only after it reaches the viewport edge.
- Reduce overlapping floating layers and keep the paper visually dominant.
- Use one coherent token system for light and dark modes.
- Give mobile one thumb-reachable bottom toolbar with overflow for secondary actions.
- Add explicit empty, loading, import-review, unsaved, and failure states.

### Avoid

- Generic dashboard metric cards, AI gradients, decorative pills, glow effects, and filler copy.
- A marketing-site hero inside the working editor.
- Rewriting chord, modal, print, persistence, translation, or import logic as part of the visual migration.
- Publishing the existing song database or private church material to a public demo.

## Proposed direction: Rehearsal Ledger

The Sites version should feel like a durable church music workbench: a charcoal equipment case surrounding one precise score sheet. A restrained woven-thread accent marks active structure, while the paper remains neutral and printable.

### Tokens

- Case: `#171B1A`
- Raised case: `#222826`
- Paper: `#F8F7F1`
- Ink: `#171A18`
- Karen leaf: `#58734E`
- Cue thread: `#B84E43`
- Brass attention: `#B39457`

### Signature

Section identity is expressed as a thin woven-thread rail that aligns the section label, first measure, and print boundary. It is structural, not decorative.

## Annotated wireframe

Legend: `[R]` requested, `[I]` inferred from packaged runtime, `[P]` proposed improvement.

```text
DESKTOP
┌────────────────────────────────────────────────────────────────────┐
│ [R] Song / New / Save / Import / Export / Print   [R] EN·Karen ◐ │
├──────────────┬─────────────────────────────────────────────────────┤
│ [I] metadata │ [P] sticky-on-contact command bar                  │
│ instruments  │ Key · Style · Meter | Undo | Zoom | Help           │
│ chart tools  ├─────────────────────────────────────────────────────┤
│ collapsible  │ [R] Chart | Lyrics | Database                      │
│              │ ┌──────────────── 8.5 × 11 paper ─────────────────┐ │
│              │ │ [R] editable metadata header                   │ │
│              │ │ [R] section rail + measure/chord workspace     │ │
│              │ │ [R] page-local printable footer                │ │
│              │ └─────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────┘

MOBILE
┌──────────────────────────────┐
│ Song title       Save · More │
│ Chart Lyrics Database        │
├──────────────────────────────┤
│ horizontally fitted paper    │
│ with readable zoom controls  │
│ and no toolbar overlap       │
├──────────────────────────────┤
│ [P] Tools Chord +Measure Nav │
└──────────────────────────────┘
```

## Proposed sitemap and expansion boundary

```text
Karen Music Director
├── Workspace
│   ├── Chart editor
│   ├── Lyrics sheet
│   └── Song database
├── Import review
│   ├── JSON / ChordPro
│   └── Image / PDF inference
├── Print room
│   ├── Reference copy
│   └── Instrument copies
├── Library
│   ├── Songs
│   └── Files and notes
└── Settings
    ├── Language and Karen typing
    ├── Hotkeys
    ├── Appearance
    └── Print defaults
```

The first Sites slice should remain one working editor route unless multi-route expansion is explicitly approved.

## Approval gates

1. Decide whether Sites is a fully functional hosted editor or a portfolio-safe interactive replica.
2. Decide whether only synthetic/demo songs may leave the local machine.
3. Decide whether the custom project skill belongs in the repository or the global Codex skills directory.

## Approved phased redesign

### Phase 1 - Print first

- Reuse the Karen village and mountain image behind the paper.
- Keep the paper white and physically proportional to Letter.
- Keep editable header and footer controls locked to page boundaries.
- Open a print room from Print with numbered pages below the sheet.
- Print one page per selected instrument plus Reference.
- Remove colored section-name rails and keep the startup wizard closed.
- Status: implemented and verified in the isolated Sites project.

### Phase 2 - Shell and tool placement

- Move non-help circle actions into the sidebar.
- Keep the docs `?` control in the global shell.
- Group top actions, sticky-on-contact tools, tabs, shortcuts, Karen keyboard, and modal entry points.
- Preserve every existing control and give visible controls real behavior.

### Phase 3 - Pointer, focus, scroll, and zoom behavior

- Route wheel and navigation behavior by the region under the pointer.
- Keep editor typing focused while allowing immediate wheel scrolling.
- Make the first click work, preserve scroll position during edits, and anchor zoom around the visible paper location.
- Add a contextual right-click toolbar with keyboard-visible equivalents.

### Phase 4 - Metadata and database information architecture

- Keep the sidebar limited to rehearsal-critical basics.
- Move advanced details, history, provenance, attachments, and review state into Database.
- Define schema and migration boundaries before moving existing fields.

### Phase 5 - Attachment and ground-truth library

- Inventory previously saved images, handwritten notes, chart images, and typed chart counterparts.
- Preserve unmatched handwritten-only and typed-only records.
- Separate usable sources from rejected/low-quality sources with reasons and human review.
- Promote only approved good pairs into ground-truth context.
- Keep this local-first. Do not copy `songs.db` or private church material into Sites.

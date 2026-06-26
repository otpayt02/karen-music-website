---
name: agent-eh-keh-lah
description: Use this agent when you want to make changes to the song printout/chart feature of the Karen Music Website (otpayt02/karen-music-website). This agent will help you implement the required layout, styling, and new print preview/template features without changing any application logic or data flow.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Define what this custom agent does, including its behavior, capabilities, and any specific instructions for its operation.

You are working on the song printout/chart feature of the Karen Music Website (otpayt02/karen-music-website). Do NOT change any application logic, data flow, or functionality — only modify the printout layout, visual styling, and add a new print preview/template feature. Here are all the required changes:

---

### PRINTOUT LAYOUT & SPACING CHANGES

1. **Measure bar lines are too long** — shorten the horizontal lines used as measure/bar dividers so they don't span the full page width. Make them more compact and proportional to the content area.

2. **Overall spacing — more compact** — reduce excess whitespace in the printout so everything fits more tightly on the page without feeling cramped. The goal is fewer pages used, more content per page.

3. **Too many section divider lines** — reduce the number of horizontal rule/divider lines throughout the printed page. Remove any redundant ones between sections.

4. **No header divider line** — remove the horizontal line/rule that separates the header from the body.

5. **No footer divider line** — remove the horizontal line/rule that separates the footer from the body.

6. **Remove "Date Created" and "Date Performed" from the printout** — move these fields to be stored only in the song's metadata (database/backend). They should not appear on the printed page at all.

7. **Beats per measure** — move "Beats Per Measure" out of the center of the printout and place it in the **footer** area.

8. **Song style label** — keep it in its current position but make the font size slightly larger (make it prominent/visible).

9. **Transposed key note** — if a song has been transposed from its original key to another key, display the **original key note** only in the **sidebar notes section**, NOT on the main printout body.

---

### TITLE BLOCK CHANGES (Header Area)

10. **Karen title is now the PRIMARY title** — the Karen-language title should replace where the English title currently appears (top/large position). Make it the same size as the current (newly enlarged) title.

11. **English title moves to subtitle/parenthetical** — the English title goes where the Karen title used to be (below, in parentheses, smaller font), replacing the previous smaller Karen subtitle.

12. **No underline under the title** — remove any underline or border-bottom styling from the title element.

---

### SECTION COLOR CODING

13. **Color-code song sections** — apply subtle background tints or left-border color indicators to visually distinguish section types on the printout:
    - **Verse** — one color
    - **Chorus** — another color
    - **Intro / Outro** — another color
    - **Bridge / other** — another color
    Keep colors light/pastel so they print well and don't obscure text.

---

### CHORD CIRCLE STYLING

14. **Chord circles (white circles with black outlines)** — do NOT fill them solid black. Instead:
    - Make the black outline/stroke **thicker and more defined** (bold border)
    - Make the circles **slightly larger** (~120% of current size)
    - Ensure they are clearly visible from a distance
    - Do NOT change fill color — keep them white inside with just a stronger, bolder border

---

### PRINT PREVIEW / TEMPLATE FEATURE (New Feature)

15. **Add a Print Preview panel** — create a UI panel (modal or side drawer) that lets the user preview style changes to the printout BEFORE committing them. This should be accessible from the song view/print page.

16. **Template options to preview** — generate at least **4-5 distinct layout/style templates** that can be toggled in the preview. Each template should vary:
    - Font family (e.g., serif, sans-serif, monospace, handwritten-style)
    - Font sizes and line spacing
    - Header/footer visual weight and relationship to body
    - Overall compactness vs. airy feel
    - Section label styling (bold, italic, small caps, etc.)

17. **Preview controls** — inside the preview panel, expose sliders or dropdowns (no logic changes, just CSS/style variables) for:
    - Font family selector
    - Line spacing / leading
    - Section label style
    - Overall theme (e.g., "Clean", "Church Bulletin", "Minimal", "Bold", "Classic")

18. **No logic changes** — the preview feature only affects visual CSS/print styles. No changes to how data is fetched, processed, or rendered logically.

---

### POSITION TRACKING (Future Hook — Stub Only)

19. **Stub a position tracking feature placeholder** — add a commented-out or disabled UI element (e.g., a grayed-out button labeled "Position Tracker — Coming Soon") in the song view so the feature can be wired up later. No implementation needed now.

---

### SUMMARY OF DO NOTs
- Do NOT change application logic or data processing
- Do NOT change where fields are stored in the DB (except moving date_created/date_performed display off the printout)
- Do NOT fill chord circles black
- Do NOT add a header-to-body divider line
- Do NOT add a footer-to-body divider line
- Do NOT show transposed key on the main printout body
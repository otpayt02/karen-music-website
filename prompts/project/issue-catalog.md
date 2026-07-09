# Issue Catalog

This is a curated map of the thread’s recurring requests.

## 1. Launcher and packaging

- fix startup crashes
- rebuild the Windows `.exe`
- keep the desktop shortcut pointed at the real packaged target
- avoid file-lock failures during packaging
- verify the launcher starts the local server and opens the window

## 2. Legacy shell fidelity

- preserve the original Karen Music HTML/CSS/JS look
- keep the legacy monolith as the visual reference
- avoid accidental React-first assumptions
- keep the interface pixel-close to the original unless the operator asks for a change

## 3. Language modal

- make the Karen and English choices readable and larger
- prevent overlap
- keep hover and arrow selection states predictable
- keep the logo and modal title readable

## 4. Wizard / metadata form

- fit the metadata into one visible screen when possible
- make key, category, tempo, and time signature line up correctly
- make scroll behavior focus on the hovered selector only
- remove fake dropdown feel where a scrollable selector is expected
- keep the Karen title, English title, and labels in the requested visual order

## 5. Chart, print preview, and footer rules

- make the chart container act like the printout
- keep BPM in the footer, not the header
- keep key, style, and title alignment consistent
- keep category placement in the footer
- make preview changes visibly meaningful when styles change
- keep measures inside page bounds

## 6. Import and vision analysis

- import PNG or PDF
- convert to PNG when needed
- analyze imported images with OCR or vision
- fill the chord chart editor from the picture as far as possible
- preserve songs and avoid making imports look broken

## 7. Keyboard and shortcuts

- keep every key reachable
- add missing hotkeys
- keep backspace and escape available inside the Karen keyboard
- avoid element overlap in the keyboard area

## 8. Translation and front-facing text

- track front-facing English words that still need translation
- keep a translation queue visible when working in Karen mode
- localize the UI without breaking layout

## 9. Layout and theme polish

- remove overlaps in sidebar, settings, database, and modal surfaces
- improve theme differences beyond tiny accent changes
- make the UI calmer, denser, and more intentional
- preserve the exact behavior when a change is meant to be structural, not cosmetic

## 10. Data and song integrity

- do not hide songs when import fails
- keep fetch paths stable
- avoid silent loss of metadata
- surface failures clearly

## How to use this catalog

- treat each category as a stable issue family
- merge future comments into these families before editing code
- use the catalog to decide the smallest credible fix surface

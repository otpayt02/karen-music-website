---
name: karen-music-feature-catalog
description: Locate, inventory, and preserve the complete Karen Music website and Music Director feature set. Use for every feature request, redesign, migration, regression review, deletion request, or behavior change in this repository so existing capabilities are not silently lost.
---

# Karen Music Feature Catalog

1. Read `../../../docs/CURRENT_FEATURE_MAP.md` completely before changing behavior.
2. Read `../../../docs/codex/LEGACY_CHORD_EDITOR_CONTRACT.md` when the request touches chart notation, measures, rows, beats, keyboard entry, paper geometry, or print.
3. Map the request to the affected feature-map sections and list adjacent contracts that must remain intact.
4. Treat `../../../index.html`, `../../../app.py`, and tests as the monolith behavior authority. Treat the packaged monolith as the visual baseline.
5. For the hosted Sites implementation, preserve every applicable Implemented feature while changing `../../../karen-music-site/`.
6. Add or update regression coverage for the changed contract. Verify desktop, mobile, print when relevant, and a blank or failure state.
7. Update `../../../docs/codex/REQUEST_ADHERENCE_LEDGER.md` with the request, implementation evidence, verification, and any explicit deferral.

Never delete a listed feature merely because a redesign hides, relocates, or simplifies its control. Never publish private songs, databases, attachments, or provider payloads.

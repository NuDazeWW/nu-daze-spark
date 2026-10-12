# SocialMotive card clarity and platform brand update

## 1. Make the queue easier to scan
- Give comments a prominent **Comment — author · topic** heading, using only available source details.
- Keep each post’s existing **SM number** and add a clear Post label.
- Separate **type** from **status**: turquoise identifies posts, coral identifies comments; a status-colored edge and named badge identify the workflow stage.
- Use the same status treatments in Daily Queue, calendar, and Approved Content: Draft = neutral lavender, In Review = turquoise, Needs Revision = coral, Approved = gold, Exported = Soft Bone, Posted = citrine, Archived = subdued neutral with a dashed treatment.
- Color the status filters to match their cards. Keep explicit text and icons so colors are never the only cue.

## 2. Apply the updated guide across the app
- Retain Deep Plum/Midnight navigation and command areas.
- Introduce Soft Bone/Pale reading surfaces for detail, settings, evidence, and form-heavy pages, with dark Ink text and accessible accent derivatives.
- Standardize Space Grotesk headings/navigation/buttons, Inter reading/forms/tables, and IBM Plex Mono IDs/timestamps.
- Align page headings, spacing, 16px card corners, 10px controls, restrained borders, focus states, and reduced-motion behavior.
- Audit every page and shared dialog for outdated colors, typography, and app naming. Preserve NuDaze when it is a client name or actual source content.
- Preserve approved logo artwork and platform-native LinkedIn/Instagram preview colors.

## Technical approach
- Centralize light/dark semantic tokens and status treatments; reuse existing design-system controls.
- Apply page surface choices through shared layout rather than independent per-page palettes.
- Presentation changes only: no database, permissions, AI generation, approval rules, or publishing changes.

## Verification
- Check the authenticated queue using real posts/comments, status filters, calendar, and Approved Content jump links.
- Check all page routes for readable surfaces, consistent branding, overflow, and visible focus.
- Run existing relevant tests and confirm preview diagnostics are clean.
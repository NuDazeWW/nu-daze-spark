# Fix calendar drag-and-drop, Connected Sources overflow, Strategy Studio contrast, Campaign Briefs styling

## 1. Calendar drag and drop
- Daily Content Queue calendar: post chips become draggable tiles (not buttons) so dragging starts reliably; click and keyboard Enter still open the post.
- Content Planner: days accept drops anywhere in the cell (including over existing chips), show a highlighted drop target while hovering, and save the new date.

## 2. Connected Sources reporting key box
- Key, CSV link and JSON link rows shrink to fit the box; long links truncate with the copy button always visible inside the box.

## 3. Brand & Strategy Studio contrast
- All tabs (Platform Rules, Cadence, Engagement, Audiences, Brand Voice, Guardrails, etc.): card titles, platform badges and buttons switch to light text and visible borders on the dark cards.

## 4. Campaign Briefs page
- Restyle to match the other hubs: luminous tinted cards, shared header, refined progress and detail lists. Wording, data and actions unchanged.
- Rename the sample brief to remove the "[Test]" prefix.

## Check
- Playwright: drag a post in both calendars and confirm the date saves; open a reporting key dialog and confirm no overflow; screenshot every Strategy tab and Campaign Briefs at 1381x925.

## Technical details
- `WeeklyCalendarView.tsx`: replace draggable `Button` with `div role="button" tabIndex=0` + onKeyDown.
- `ContentPlanner.tsx`: `dropEffect="move"`, dragover/dragenter on cell, drop-ring state.
- `ReportingConnectors.tsx`: `min-w-0` on row and `code`, `overflow-hidden` on dialog content.
- `src/index.css` `.sm-studio-rules`: remap `--foreground`, `--card-foreground`, `--border`, `--muted-foreground` to studio light tokens; add `sm-briefs` styles in the final design-system block.
- Brief title update via data update (single row).

# Demo-blocker fixes and consistency pass (10 items)

Order: items 1–4 first (demo blockers), then 5–10. Nothing in the existing tables, columns or fields is renamed, removed or restructured. No platform connections are built.

## What inspection found
- Only Post Office has a scroll-to-section handler, and it fires only when the page first loads. Clicking a section button on the same page changes the address without scrolling. Other pages have no handler at all.
- Sidebar group open/closed state is saved per group, but the group holding the current page is not forced open.
- There is no `scheduled_posts` table. Scheduled dates are stored on the post itself. The Planner read path must be checked against that.
- The "Scheduled date" filter with "Custom range" is in the Export dialog that opens from the Queue. Choosing "Custom range" shows no date fields.
- The 7 days / 30 days / quarter / 12 months period choice is in the Publishing report dialog, and I could not find it on the Usage page. Both places will be checked.
- "Stage for delivery" appears in the publish panel's button and confirmation title.

## 1 + 10. Section buttons scroll
- One shared helper scrolls to the section on button click, on address change and on first load. It allows for the top bar and focuses the section for keyboard users.
- The helper is used by every page with section buttons: Post Office (Generation Station, Post Connector), Repurpose Center menu items, Dashboard and Settings.

## 2. Back and return links
- Audit every link and button that changes page: sidebar, section bars, Back links, breadcrumbs, card links and empty-state buttons. A browser script clicks each one and records where it lands.
- Fix any that are broken, then report the full list of what was broken and what it does now.

## 3. Sidebar groups
- The group holding the current page always opens on load and on navigation. Other groups keep their saved state.
- Clearer disclosure cue: a rotating chevron, a hover state, a pointer cursor and an expanded/collapsed state for screen readers.

## 4. Floating navigation search
- A small search button sits in the bottom corner of every signed-in screen. Cmd/Ctrl+K opens it and Escape closes it.
- It searches page titles and group names across all six groups, using the existing menu list. Picking a result opens that page and closes the panel.

## 5. One publishing standard
- One shared action bar, with the same labels in the same order everywhere: **Publish now** | Copy full package | Download full package | Copy & open <platform>.
- Used in the Posting Package drawer, Queue cards, the details drawer and Dashboard action cards.
- "Publish now" runs the existing staged flow and run log. "Stage for delivery" becomes "Publish now" everywhere.
- The footnote about connecting platform apps in Social Connections stays.

## 6. Content Planner
- First trace why a scheduled post does not appear. Check the date field read, time zone conversion and filters. Fix the cause before touching drag-and-drop.
- Dropping a post on a new date updates the screen at once and saves. If the save fails, the post goes back to its old date and an error appears.

## 7. Repurpose Center layout
- Put both "Review ideas" cards in one container with even spacing.
- Check there is no overflow at widths of 1280, 1440 and 1920.

## 8. Date filters
- "Custom range" shows From and To date pickers. The filter sends real start and end dates, not a label.
- Check that the This week, Next 7 days and This month presets actually change the results.
- Check that each period option refreshes the data. If the Usage page has no period choice, I will report that instead of adding one.

## 9. Asset Library detail panel
- The side panel shows details only: Type, Description, Origin, Created, Asset status, plus Download and Preview.
- Preview opens the existing full-screen viewer. The panel fits a 1080px-high screen with no inner scrolling.

## Verification
- Browser checks for every item at 1280, 1440 and 1920 widths, with a broken-link report for item 2.
- Small tests for date-range math, nav search matching and auto-opening the current group.

## Technical notes
- New `src/lib/scrollToSection.ts`, used from AppLayout on `location.hash` change and from LocalNav or menu item clicks. Same-hash clicks scroll as well.
- `CollapsibleNavGroup` gets a `forceOpen` prop based on `groupForPath`/NAV_GROUPS matching pathname.
- New `NavSearch` component built on the existing `cmdk` Command dialog, with its index taken from `NAV_GROUPS`.
- New `PublishActions` component that replaces the ad hoc button sets. Its label sits in a single constant.

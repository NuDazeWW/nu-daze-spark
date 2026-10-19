# Navigation: every link works, every page has a way back

## What the user will see
1. **Every side-menu pop-out row is clickable.** Today many rows (e.g. Asset Library "Permission states", Queue "Native previews", Setup "Company profile") are just text. Each row will open the real place it describes: the right page, tab, section, or dialog.
2. **A "Back" button on every page** (top-left, above the title), labelled with where you came from, e.g. "Back to Dashboard". If you opened the page directly (bookmark/new tab), it falls back to the page's natural parent (e.g. Email Provider goes back to Setup, Setup goes back to Dashboard).
3. **Breadcrumb for nested pages** (Settings pages, Help guide): "Setup / Email Provider", each part clickable.
4. Pages that use their own header (Executive Review, User Guide, Pricing, Terms/Privacy, 404) get the same Back button.

## Link audit (done as step 1 of the build)
- Click every sidebar item and every pop-out row as a signed-in admin; record destination, confirm it loads (no 404, no blank page) and lands on the stated tab/section.
- Fix any dead or wrong link found, and report the full list (link, destination, result).
- Stale paths kept only as redirects (/settings/workspace, /settings/brand-kit) are checked to redirect correctly.

## Technical details
- `NAV_HOVER_LISTS`: give every row a `to` — tab query params (`?tab=`), section anchors (`#company-profile` etc. with scroll-into-view on load), or `?open=` flags for dialogs like bulk upload / schedule import. Add matching anchor ids on target sections.
- New shared `BackLink` in `PageHeader`: uses `location.state.from` (set by sidebar, pop-out and in-app links) else `PARENT_ROUTE` map in one file; uses `navigate(-1)` when history is in-app.
- Pages with custom headers import the same component.
- Playwright script walks all links and screenshots each landing page before I report done.

## Note
Your "Yes, let's do it" — if that also referred to an earlier item besides navigation, tell me which and I will add it.

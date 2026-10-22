# Portfolio Insights header: Capture, Live Connectors, Summaries

Add three buttons to the Portfolio Insights page header row (below the title, same style as other page header buttons). Header artwork, sidebar and existing page content stay unchanged.

## 1. Capture (pop-up box)
- Opens a pop-up box in the designed luminous card style; opens at the top, closes with X or Escape.
- Explains what is captured: Impressions, Reactions, Comments, Shares, Clicks, Saves — each as a small icon tile with a one-line plain explanation.
- Window chips: 7, 30, 60, 90 days. Selecting one updates the explanation ("Totals are summed across the last N days per post and platform").
- Information only — no data changes.

## 2. Live Connectors (drop-down)
- Button label "Live Connectors" with a count badge of connected items.
- Drop-down lists one button per connected reporting connector (with its logo); clicking opens Connected Sources at the reporting connectors section.
- Always includes a "Power BI — Demo" entry with the Power BI logo and a "Demo" tag; it does nothing when clicked except show "Demo connector — not linked".
- If nothing real is connected, Power BI demo still shows plus a "Manage connectors" link to Connected Sources.

## 3. Summaries (drop-down)
- Lists the email summaries that are turned on for the workspace: Daily digest, Weekly summary, Scheduled report (with frequency), showing recipient and time zone.
- If none are on: message "No email summaries are turned on" plus a "Turn on summaries" button that opens Setup → Notifications.
- Footer link "Manage summaries" to the same place.

## Technical details
- New `src/components/insights/InsightsHeaderActions.tsx` rendered under `PageHeader` in `src/pages/PortfolioInsights.tsx`, using existing Dialog / DropdownMenu primitives and luminous card classes.
- Live Connectors reads the existing reporting connector records used by `ReportingConnectors.tsx`; Power BI demo is a hard-coded entry, no link, no network call.
- Summaries reads `notification_preferences` (`is_active`, `daily_digest`, `weekly_summary`, `report_frequency`); routes to `/settings/notifications`.
- No database changes. Verify in the preview at 1415px wide that buttons don't wrap and both drop-downs and the pop-up render.

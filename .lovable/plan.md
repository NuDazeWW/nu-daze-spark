# Make every dark page's header match Brand & Strategy Studio

## What's different today
- Brand & Strategy Studio uses the shared page header (title, description, buttons, bird + "Turn strategy into social momentum.") on top of the purple/cyan ribbon artwork that fills the top of the page.
- Portfolio Insights, Publishing Status and the User Guide build their own headings instead (icon tile + mono title, no bird, no ribbon artwork), so they look different.
- Other dark pages use the shared header but sit on a plain dark background with no ribbon artwork behind the header.

## Changes (header area only)
1. Switch Portfolio Insights, Publishing Status and User Guide to the shared page header, keeping their current title, description and buttons word-for-word.
2. Show the same ribbon artwork behind the header on every dark page with the side menu, using the Brand & Strategy Studio look: same image, position, fade into the page, title weight/colour and description colour.
3. Use one header style for all dark pages so no page can override it.
4. Page bodies stay as they are: cards, content, light reading pages (Planner, Connected Sources, settings) and all functions. The artwork sits behind everything and never covers the menu, buttons or controls.

## Check
- Screenshot Strategy, Portfolio Insights, Dashboard, Daily Queue, Publishing Status, Executive Review and Setup at 1368×936 and compare the headers to Strategy. Report only what the screenshots show.

## Technical details
- Move the `.sm-strategy-background` image and the `.sm-strategy .sm-page-header` rules into a shared `.sm-app-bg .sm-page-header` layer at the end of `src/index.css`. Render the ribbon once in `AppLayout` (dark surface only) as a `pointer-events:none` layer with a negative z-index and a bottom mask fade. Remove the duplicate `<img>` from `Strategy.tsx`.
- Replace the custom heading blocks in `PortfolioInsights.tsx`, `PublishingStatus.tsx` and `UserGuide.tsx` with `PageHeader`.

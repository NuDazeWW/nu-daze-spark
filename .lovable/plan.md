# Fix all outstanding issues + platform-wide UX brief

## 1. Two places to publish: the Posting Package drawer and the Comment Generator
Posts are always published from one place, the Posting Package drawer. No other screen gets its own publish button or pop-up.

**Buttons that open the drawer**
- **Approved Content**: each card's main button is **Publish Live Now**. It opens the drawer.
- **Daily Content Queue**: approved cards get a **Publish Now** button. It opens the same drawer.
- **Publishing Status**: clicking any post opens the same drawer.

**What's inside the drawer**
- **Publish Live Now**: sends the post to each channel in turn, marks it Published and logs the delivery run.
- **Copy & Send**: one-click copy for the post text, hashtags (with #) and tags, plus a button that opens the platform.
- **Mark as posted**: confirm it by hand, with an optional box for the live post link.
- **Schedule**: change the delivery date and time.
- **Send for Executive Review**: on in this workspace. It's greyed out only when it's switched off in Setup.

**Comments**
- In the Comment Generator, **Publish Live Now** sits next to "Copy & open post". It marks the comment Commented, adds it to today's count and shows a clear confirmation.

**What goes away**
- Any separate publish buttons on table rows or board cards. Every screen uses the same drawer, with its checks for compliance, details and media.
- Until the platform apps are approved, the confirmation says the post was staged for delivery, not that it went live.

## 2. Posting Package drawer
- Redesigned to match the other pages: a dark branded header with the platform badge and SM number.
- Final copy, Hashtags, First comment, Media and Posting notes each sit in their own glowing, color-tinted card with a title and copy button.
- The "Ready to post" checklist uses the Dashboard's colored status icons in tinted circles.
- Tagging instructions become a collapsible section, with people and organizations shown as chips you can copy.
- Action buttons sit in a fixed bottom bar and never spill out of their edges. Tabs scroll sideways.
- **Checksum** hidden from view. It's still saved for the audit trail and still included in the downloaded file.
- **Hashtags** always show and copy with "#" everywhere.
- **Mark as posted** shows whenever the Posting package tab is open, with an optional box for the live post link.
- **Send for Executive Review** button: greyed out with a note pointing to Setup when Executive Review is off. It's switched on in this NuDaze copy, so it works here.

## 3. Reporting connector tiles
- Add the hover effect, a color for each connector (Tableau blue, Power BI gold, SAP cyan, QuickSight teal, Sigma violet), and the same tile art as the cloud storage tiles.

## 4. Platform-wide brief
- **Remove demo labels**: hide "Demo", "Demo environment" and similar badges and banners. No features are removed.
- **Spelling**: proofread every page, all in US English.
- **Drawers** close when you click outside them, without losing what you typed. Pop-up forms keep the rule that they don't close by accident.
- **Typed text stays**: switching tabs, opening drawers or picking options on a page never clears what you've entered.
- **Readability pass**: fix invisible or low-contrast text, button text that overflows, text overlapping icons, and misaligned controls, at desktop and tablet sizes.
- **Publishing Status**: add three realistic NuDaze records (one published, one scheduled, one needing attention) with real-looking dates. They're marked as sample records, not as verified live posts.
- **Repurpose Center**:
  - Buttons match the Dashboard.
  - Fix the error behind **Find Ideas**, confirm real ideas come back, and add clear loading, empty and error states.
  - Redesign the Review Ideas cards and every other card on the page so the title, description, details and actions are clearly separated.
- **Content Planner**: use the dark header from the Dashboard and Campaign Briefs, keeping all its controls.
- **Consistency sweep**: fix cards, buttons, headers and status markers that don't match the Dashboard. Pages that already match are left alone.

## 5. Navigation and naming fixes
- **Schedule**: the "Schedule" step in the drawer's checklist opens the drawer's own Schedule section (date, time, channels) instead of the edit dialog, which has no date controls.
- **Publishing Status empty state**: add a "Choose an approved post" button that goes to Approved Content.
- **Back links**: remove them from main pages (Dashboard, Daily Queue, Approved Content, Publishing Status, Strategy Studio, Asset Library). Keep them only on sub-pages, pointing to the parent (e.g. Team → "Back to Settings", User Guide → "Back to Help").
- **Workspace Settings**: rename the "Setup" menu group to "Workspace Settings", with the checklist inside as "Setup & Onboarding". Add Account Tags as its own item there, and update generator help text to "Workspace Settings → Account Tags".
- **Matching names**: the pipeline switcher uses the sidebar names: Daily Queue (Drafts & in review), Approved Content (Ready to publish), Publishing Status (Scheduled & published). Each shows only its own statuses.
- **Side menu groups**:
  - Core & Insights: Dashboard, Portfolio Insights
  - Strategy & Sources: Brand & Strategy Studio, Asset Library, Connected Sources
  - Create & Repurpose: Campaign Briefs, Social Post Generator, Comment Generator, Repurpose Center, Motive Media Studio
  - Plan & Review: Content Planner, Executive Review
  - Pipeline & Publishing: Daily Queue, Approved Content, Publishing Status
  - Workspace Settings: Setup Checklist, Team, Social Connections, Email Provider, Account Tags, Usage & Billing

## 6. Verification
- Click through every item above on screen at 887px wide and at desktop size.
- Work through the brief's 12-point checklist.
- Run the tests, plus a new test for hashtag formatting.

## Technical section
- `formatHashtags` in `src/lib/contentPresentation.ts` (tested), used by the drawer, cards, previews, bulk export and OpenPlatformButton.
- The publish run stays inside the drawer (existing PublishComposer logic). Approved Content, Daily Queue and Publishing Status only open the shared PostingPackageDrawer for a post id; there are no publish handlers on rows or cards.
- Comments: the publish action updates the `comments` status and invalidates cadence stats.
- index.css: `.sm-rep-card:hover` plus per-provider tone classes; ReportingConnectors applies the tone and art.
- Sheets dismiss on outside click while Dialogs keep the save-guard; drawer form state lives above the Sheet.
- Demo badges: hide the visuals only; `environment='demo'` stays for billing and QA logic.
- Find Ideas: diagnose from the `repurpose-content` logs before changing anything.
- Publishing seed: a migration adds three records flagged as samples, which are excluded from real delivery counts.

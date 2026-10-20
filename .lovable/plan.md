# Fix all outstanding demo issues

## 1. Post live from anywhere (simulated)
- **Publishing Status**: add a "Publish now" button on every approved/scheduled row. It runs the same channel-by-channel simulation that already exists, then moves the post to Published.
- **Approved Content drawer + Posting Package**: put "Publish now" in the main Posting Package tab's action row, so it isn't hidden in the Publish tab.
- **Daily Queue / Approved cards**: add a "Publish now" item to approved cards.
- Every button is labelled as a demo: nothing is sent to the platforms until the platform apps are approved.

## 2. Auto-post for comments
- **Comment Generator**: add "Auto-post" next to "Copy & open post". It plays the same short sending animation, shows "Comment auto-posted — live sending turns on once platform comment access is connected", marks the comment Commented, and adds it to today's comment count.
- Also add Auto-post to approved comment cards in the Daily Queue.

## 3. Posting Package drawer fixes
- **Button text overflow**: buttons wrap onto two rows cleanly, with shorter labels and no text spilling out. Tabs scroll sideways instead of squeezing six labels into a narrow drawer. Checked at your screen size (887px) and at desktop size.
- **Checksum**: the "Checksum fd1c…" line is removed from view. The fingerprint is still saved in the background for the export audit trail, and the downloaded file still includes it.
- **Hashtags**: show and copy them with "#" (for example #ThoughtLeadership), everywhere: the drawer, copy buttons, package text, the open-platform copy, previews, and cards. Stored tags without "#" get it added when they're shown or copied.
- **Drawer redesign to match the rest of the app**:
  - Header uses the same dark branded style as the other page headers, with the platform badge and the post's SM number.
  - Final copy, Hashtags, First comment, Media and Posting notes each sit in their own glowing, color-tinted card with a clear title and copy button. Text no longer floats on the background.
  - The "Ready to post" checklist uses the same colored status icons as the Dashboard (green check, amber warning, coral stop) inside tinted circles.
  - Tagging instructions become a collapsible section with a better look: people and organizations shown as tag chips with copy buttons.
  - The action buttons sit in a fixed bar at the bottom of the drawer.
- **Approved Content cards**: the button that opens the drawer is renamed **Post**.
- **Mark as posted**: shows in the drawer whenever the Posting package tab is open, with an optional box for the live post link. You no longer need to open the platform first.
- **Send for Executive Review in the drawer**: a new button in the drawer's action bar. It's greyed out, with a note pointing to Setup, when Executive Review is turned off in the Setup options. It's switched on for this demo copy, so the button works here.

## 4. Reporting connector tiles
- Add the missing hover effect: the tile lifts, the border brightens and the shadow deepens.
- Give each connector its own colour (Tableau blue, Power BI gold, SAP cyan, QuickSight teal, Sigma violet) and the same tile art and spacing as the cloud storage tiles.

## 5. Verification
- Click through each of these on screen: Publishing row, Approved drawer, Comment Generator, Connected Sources, and the drawer at 887px wide.
- Run the tests, plus one new test for hashtag formatting.

## Technical section
- Shared `formatHashtag`/`formatHashtags` in `src/lib/contentPresentation.ts` (with test), used in PostingPackageDrawer, PostCardItem, NativePostPreview, bulkExport and OpenPlatformButton copy text.
- Extract the simulation from PublishComposer into a `useSimulatedPublish` hook, reused by a `PublishNowButton` in PublishingStatus, PostingPackageDrawer and PostCardItem.
- CommentGenerator/CommentCardItem: Auto-post updates the `comments` status to posted/commented and invalidates the cadence stats.
- index.css: add `.sm-rep-card:hover` to the hover rule; add tone classes; ReportingConnectors applies the tone and ribbon art per provider.
- Drawer: `flex-wrap` buttons with `whitespace-normal`, and a scrollable TabsList.

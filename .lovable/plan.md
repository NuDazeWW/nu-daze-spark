# Fix all outstanding issues + platform-wide UX brief

## 1. Publish Live Now everywhere
- **Wording**: every button or menu item that starts live posting ("Auto Post", "Publish now", and the like) is renamed **Publish Live Now**.
- **Publishing Status**: add Publish Live Now on every approved or scheduled row. It runs the existing channel-by-channel delivery, then moves the post to Published.
- **Posting Package drawer**: Publish Live Now sits in the main action bar, not hidden in the Publish tab.
- **Daily Queue / Approved cards**: add Publish Live Now to approved cards.
- **Comments**: add Publish Live Now next to "Copy & open post" in the Comment Generator and on approved comment cards. It marks the comment Commented and adds it to today's count.
- Until the platform apps are approved, the confirmation says the item was staged for delivery, not that it went live.

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
- **Approved Content cards**: the button that opens the drawer is renamed **Post**.

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

## 5. Verification
- Click through every item above on screen at 887px wide and at desktop size.
- Work through the brief's 12-point checklist.
- Run the tests, plus a new test for hashtag formatting.

## Technical section
- `formatHashtags` in `src/lib/contentPresentation.ts` (tested), used by the drawer, cards, previews, bulk export and OpenPlatformButton.
- Extract the PublishComposer simulation into a `useSimulatedPublish` hook plus a shared `PublishLiveNowButton`.
- Comments: the publish action updates the `comments` status and invalidates cadence stats.
- index.css: `.sm-rep-card:hover` plus per-provider tone classes; ReportingConnectors applies the tone and art.
- Sheets dismiss on outside click while Dialogs keep the save-guard; drawer form state lives above the Sheet.
- Demo badges: hide the visuals only; `environment='demo'` stays for billing and QA logic.
- Find Ideas: diagnose from the `repurpose-content` logs before changing anything.
- Publishing seed: a migration adds three records flagged as samples, which are excluded from real delivery counts.

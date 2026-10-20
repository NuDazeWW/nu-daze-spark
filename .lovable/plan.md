# SocialMotive corrective update (consolidated brief)

This brief replaces any parts of the earlier plan that conflict with it. It's one pass, done in this order: publishing truth, navigation, saved work and Repurpose, then copy, visuals and checks.

## 1. One place to publish posts
- The Posting Package drawer is the only place where a post gets published, scheduled, handed off or confirmed.
- Approved Content cards get a **Publish / Schedule** button that opens the drawer at its Publish section. Buttons that only open the drawer never say "Publish live now".
- Daily Queue cards keep their usual review and edit actions. Clicking a post in Publishing Status opens the same drawer, showing where delivery stands.
- Inside the drawer: Publish now, Schedule, Manual handoff, Mark as posted and Send for Executive Review.
- Opening the drawer or switching its tabs never changes a post. View-only users can look but can't publish, schedule or override.

## 2. Honest delivery status
- Each channel only shows live sending if it's actually set up for it. A saved account alone doesn't count.
- The button says **Publish live now** ("Sends immediately to [the accounts you picked]") or **Stage for delivery** ("Saves this post for delivery. It will not be sent to a platform.").
- When some channels can send and others can't, the drawer says which is which before anything goes out.
- Each channel gets its own result: Scheduled; Staged, not sent; Sending; Published live (confirmed); Failed; Skipped (with the reason); Marked as posted by hand.
- If only some channels succeed, the post shows that. Retrying sends only the failed channels, and double-clicks never cause a second send.

## 3. Comments
- No live comment button until real comment posting is available. Until then: **Copy & open post**, plus a separate **Mark as commented**. A note explains that copying doesn't post the comment.
- A comment counts once, and only when it's posted or confirmed by hand, using the workspace's time zone. Drafts, staged comments, samples and repeat confirmations don't count.

## 4. One readiness answer everywhere
- The same readiness check feeds the drawer, cards, Daily Queue, review screens and Dashboard.
- Messages: "Checks pending", "Checks unavailable", "Approved · N required checks remain", "Approved · Advisory notes available", "Ready to publish", "Ready to publish · Warnings acknowledged".
- Fixes the SM-0019 mismatch. A good Motive Score never hides required fixes, and the screen explains that.
- Editing a post resets its checks. An acknowledgment applies only to the version it was given on.
- New wording: "Revise draft with AI", then "Draft updated. Review the changes and run checks again." "Acknowledge warnings and continue" appears only where the rules allow it, and records who acknowledged, when, and which findings.

## 5. Scheduling inside the drawer
- Every Schedule link opens the drawer's Schedule section: date, time, time zone shown, the channels and whether each can send, and clear save and error messages.
- Past or invalid times are rejected with a clear fix. Rescheduling moves the existing slot instead of adding a second one, and already published posts are never resent.
- Content Planner keeps its controls and drag-and-drop. A note explains that planning a date is not the same as scheduling a send.

## 6. Executive Review
- Stays on for NuDaze. If a workspace turns it off, the button explains why and links to the setting.
- Missing permission, already sent, or still sending each get their own message. Items can't be sent twice.

## 7. Posting Package drawer
- Dark branded header with the platform, the account and the SM number.
- Final copy, Hashtags, First comment, Media and Posting notes each get their own titled, tinted card. Copy buttons only appear where there's something to copy.
- Status icons are never shown by color alone. Tagging sits in a section you can open and close, with copyable chips and a note that tagged names may need re-selecting on the platform.
- The checksum is hidden on screen but kept in the audit history and the downloaded file.
- Tabs scroll sideways. The bottom action bar wraps instead of spilling over, and never covers fields.
- Handoff buttons: **Copy full package**, **Open [platform]**, **Copy & open [platform]**, and **Mark as posted** (optional link). Marking a post as posted records your confirmation only. "Copy & Send" is removed.

## 8. Hashtags
- Everywhere hashtags are shown, copied or exported, each one starts with exactly one "#". Repeats and blanks are removed.
- Character limits are checked against the final text, including the AI disclosure and hashtags.

## 9. Navigation and naming
- Side menu groups:
  - **Core & Insights:** Dashboard, Portfolio Insights
  - **Strategy & Sources:** Brand & Strategy Studio, Asset Library, Connected Sources
  - **Create & Repurpose:** Campaign Briefs, Social Post Generator, Comment Generator, Repurpose Center, Motive Media Studio
  - **Plan & Review:** Content Planner, Executive Review
  - **Pipeline & Publishing:** Daily Queue, Approved Content, Publishing Status
  - **Workspace Settings:** Setup & Onboarding, Team, Social Connections, Email Provider, Brand Profiles, Account Tags, Notifications, Usage & Billing
- Help and What's new stay easy to reach. Old links still work.
- The generator's tagging hint reads "Workspace Settings → Account Tags", with a working link.
- Main pages lose their "Back to…" links. Sub-pages keep a fixed link to their parent page.
- The pipeline switcher uses the same names as the side menu:
  - Daily Queue: "Drafts & in review" (drafts, in review, needs revision)
  - Approved Content: "Approved & awaiting publication" (including exported posts not yet confirmed)
  - Publishing Status: "Scheduled & delivery history"
- A direct link to a post always opens it, even when it belongs on a different page. The screen then shows where it lives.
- Publishing Status gets a "Choose an approved post" button. Empty messages match the active filter (e.g. "No scheduled posts yet").

## 10. Copy and trust
- Every affected page proofread in US English. "Storys" fixed and platform names spelled correctly.
- Work pages get plain task descriptions instead of the repeated slogan. "Sources used" and "Scheduled publishing runs" replace the old terms. "Staged", "skipped", "exported" and "marked by hand" are explained where they appear.
- Generate buttons drop the "(0)". The number selected shows separately, and each generator gets its own hint.
- Comment labels: "No brand risks flagged" (with a note that automated checks are no guarantee), "High relevance" only where relevance is really measured, and engagement numbers named after what they actually count. "Hot" stays unless a real time-based measure exists.
- Number tiles say what they count and over what period. Wrong totals get fixed at the source, not hidden.
- Error messages say what failed, whether your work was kept, and what to do next. Success messages appear only after the action has worked.

## 11. Typed text stays put
- Switching tabs, closing or reopening a drawer, or picking options never clears what you typed. Reopening a post brings back its unsaved text, and a different post starts clean.
- Drawers close on an outside click or Escape and keep your text. Pop-up forms keep their save/discard check. Leaving a page with unsaved work asks first.
- Saved typing is cleared on sign-out or a workspace switch. Passwords and keys are never stored this way.

## 12. Other fixes
- **Reporting connector tiles**: cloud-storage tile art and hover effect, a color per connector (Tableau blue, Power BI gold, SAP cyan, QuickSight teal, Sigma violet), a visible keyboard focus, and reduced motion for people who turn animations off.
- **Repurpose Center**: find and fix the real cause of the Find Ideas error, confirm real ideas come back, and add loading, no-results and error states. A second click doesn't submit twice, and your inputs stay on failure. Buttons match the Dashboard, and Review Ideas cards separate the title, description, details and actions.
- **Content Planner**: same dark header as Dashboard and Campaign Briefs.
- **Look and feel**: fix low-contrast text, cut-off labels, overlaps and spilling buttons, using the existing shared parts. Pages that already match are left alone.
- **Demo labels**: "Demo" badges removed. Labels for limits, samples and staged sends stay.
- **Sample records**: exactly three NuDaze samples in Publishing Status (published, scheduled, needs attention), each marked "Sample". They're left out of totals, Dashboard and cadence counts, billing, scheduled sends, notifications and retries.

## 13. Checks before calling it done
The 12 acceptance checks from the brief, tested at 887px and 1440px wide, using test data only, with nothing posted for real. Also: the existing tests, new tests (hashtags, readiness, comment counting, delivery results), type checks and the production build. The final report marks each check Passed, Failed or Blocked, with evidence and anything that needs outside action.

## Technical section
- Readiness: new shared `evaluateReadiness(card, review, workspace, channels)` in `src/lib/`, built on `preflightGate` and used everywhere the readiness label shows. Acknowledgments store the checksum and the IDs of the acknowledged findings.
- Delivery: an additive table (or JSON on the existing run row) for per-channel outcomes, with an idempotency key per post+channel+attempt. Live capability comes from integration config, not `connection_status`. `post_cards.publishing_status` is derived as an aggregate (`partial` added). Approval status stays separate.
- PublishComposer stays inside PostingPackageDrawer. Callers open it via `?post=<id>&section=publish|schedule`. Row and card publish handlers are removed.
- Comments: `mark_commented` sets a `confirmation_source` (`manual`|`platform`). Cadence counting dedupes and uses the reporting timezone, excluding sample and staged records.
- `formatHashtags` in `contentPresentation.ts`, tested, replaces inline `#` mapping in ReadinessPanel, PublishComposer, OpenPlatformButton, bulkExport and previews.
- Drawer draft state lives in a store keyed by user+client+post, cleared on sign-out or client switch. Sheets dismiss freely while Dialogs keep the guard.
- PipelineNav, AppSidebar and BackLink are updated, and `PARENT_ROUTE` is limited to sub-pages. Redirects keep old URLs working.
- Samples: an idempotent, NuDaze-only migration with `is_sample=true`, excluded in `process_scheduled_posts`, stats and notifications. No provider IDs.
- Find Ideas: check the `repurpose-content` logs first, then fix the cause.
- `roadmap.md` gets this brief's task list once building starts.

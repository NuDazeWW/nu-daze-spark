# Portfolio Insights header: Power BI "Go" label and accurate Summaries status

## 1. Live Connectors drop-down
- Change the small tag next to "Power BI" from "Demo" to "Go". Clicking it behaves the same as today (shows the "not connected" message). Nothing else in the list changes.

## 2. Summaries drop-down shows the real email setting
Today the heading always reads "Email summaries turned on", even when none are on, so it contradicts the "Turn on summaries" button.

New behaviour, read from the saved email notification settings:
- **None on:** heading "Email summaries are off", line "No email summaries are turned on.", button "Turn on summaries" (opens Notification settings).
- **One or more on:** heading "Email summaries turned on", then each active one listed (Daily digest, Weekly summary, Post went out, Publishing report, Scheduled report with its frequency), with the recipient email and time zone; "Manage summaries" link at the bottom. No "Turn on" button.
- Turned-off recipients are not counted.
- The list refreshes when opened, so it reflects changes just made in Notification settings.

## Technical details
- File: `src/components/insights/InsightsHeaderActions.tsx` only.
- Badge text "Demo" -> "Go".
- Fix the `Pref` type to the real columns: `recipient_email` (not `email`), add `post_went_out`, `publishing_report`; include those in the active list.
- Heading becomes conditional on `summaries.length`.
- Query uses `refetchOnMount: "always"` / refetch on dropdown open.
- Verify in the browser at 1415x925 with summaries off and on.

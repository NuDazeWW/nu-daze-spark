# Content Planner (6–12 month calendar)

## What you'll get
A new **Content Planner** page (sidebar, next to Daily Queue) for stocking posts months ahead. Nothing ever publishes automatically.

1. **Month and quarter views** of scheduled posts for the selected client, with a range of up to 12 months ahead.
2. **Coverage against cadence targets**: each week shows how many posts are scheduled compared with the weekly targets from Strategy (for example "LinkedIn 5/5, Reels 1/3"). Full weeks show green, weeks with gaps show amber, and empty weeks show coral. A summary strip at the top reads like "Q1 fully stocked, Q2: 14 Reel gaps".
3. **Drag to reschedule**: drag a post to another day. It keeps its time of day, and the move is logged in the post's history.
4. **"Fill from Approved library"**: pick a date range, platforms and content types. The planner suggests open slots for approved posts that aren't scheduled yet, spread evenly to meet the weekly targets with no two posts in the same slot. You review the proposed dates first, then click **Apply**. You can undo the whole fill at once.
5. **Unscheduled tray**: a side panel lists approved posts without a date, with filters by platform and type. Drag a post onto any day to schedule it.
6. **Bulk actions**: select several posts to shift them by N days or weeks, or clear their dates.
7. **Freshness warning**: a post scheduled past its source asset's expiry date gets a warning flag, so outdated content isn't posted months from now.

## Rules kept
- Only Approved or Exported posts can be auto-filled. Drafts can be shown, faded, but are never auto-slotted.
- Every post still shows its SM-NNNN number, status colors, and copy-and-open buttons.
- Only editors, admins and owners can reschedule. Reviewers and viewers can only look.

## Technical section
- New page `src/pages/ContentPlanner.tsx`, route `/planner`, sidebar link.
- Reads `post_cards` (scheduled_for, approval_status, platform, content_type) and `cadence_targets` for the active client. No schema change is needed. Dates are written to `scheduled_for`, and each change creates an `activity_log` entry.
- The slot-fill algorithm is a pure function in `src/lib/plannerFill.ts`, with unit tests. It uses default posting times per platform and round-robins posts across weeks with gaps.
- Drag and drop uses `@dnd-kit/core`.
- Undo for a fill keeps the previous `scheduled_for` values in memory for that session.

# Dashboard finish: panel descriptions, extra links, narrower sidebar

Three Dashboard follow-ups from the approved-rendering comparison. All other wording, data, and behavior stay as-is.

## 1. Panel descriptions

Add one short description line at the top of each pop-out menu, in the same muted style as the page description:

- **Weekly Cadence** — "Progress toward this week's posting targets."
- **Daily Comments** — "Today's progress toward engagement targets."
- **Content Pipeline** — "Posts by approval stage. Click a stage to filter the queue."
- **Asset Health** — "Assets by permission state."
- **Recent Activity** — "Latest post cards across all platforms."

These are new helper text only — no existing copy changes.

## 2. Extra header links

Match the "View all" / "Library" pattern already used on Content Pipeline and Asset Health:

- **Weekly Cadence** — add a "Strategy →" ghost link in the header (navigates to `/strategy`, same destination as the existing "Configure targets →" empty-state link).
- **Daily Comments** — add a "Strategy →" ghost link in the header (same destination).

No new routes or pages.

## 3. Narrower sidebar that expands on hover if needed

Reduce the desktop sidebar width in `src/components/ui/sidebar.tsx` from `16rem` to `13.5rem` so content pages get more room, matching the approved rendering's proportions. Mobile sidebar width (18rem sheet) and the collapsed icon width (3rem) stay unchanged.

Check the longest nav labels still fit without wrapping at the new width; if any wrap, keep them on one line with slightly tighter padding rather than truncating.

## Verification

- View Dashboard at desktop width: descriptions visible under all five panel titles, both new links navigate to Strategy, sidebar noticeably narrower with no label wrapping.
- Check one other page (e.g. Queue) to confirm the narrower sidebar doesn't break its layout.
- Confirm build is clean.
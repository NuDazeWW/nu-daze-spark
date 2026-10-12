# Fix "Post to" links, add Fix links and Copy & post everywhere

## 1. Fix the 404 in "Post to"
- Cause: the "add link" items point to a page address that doesn't exist (Clients lives under Settings).
- Point them to the Clients settings page and open that client's Social Accounts window directly, so admins can paste each real profile address (e.g. linkedin.com/company/nudaze).
- Add a short hint under "Post to": "Profile links are set in Settings > Clients > Accounts."
- Saved links that don't start with http(s) are fixed to https:// when saved, so they don't open as broken in-app pages.

## 2. Posting Package: "Fix" links for blocking issues
Each failing or warning check gets a Fix button that opens the right place:
- Copy too long / too many hashtags / no scheduled time / not approved -> Daily Queue, opening that post (SM-NNNN) for editing.
- No media attached -> Daily Queue edit for that post (attach media) with a secondary link to Asset Library.
- Asset not cleared -> Asset Library filtered to that asset.
- Preflight blocked or stale -> switches to the Preflight tab in the same panel (rerun / apply / override there).

## 3. Copy & post always visible in the Posting Package
- Move "Copy & open [Platform]" into the main action row next to "Copy full package", shown for every post.
- If the post isn't ready, the button stays visible but locked, with the reason ("Approve first", "Fix 2 blocking issues", "Add a profile link").
- After opening, the "Mark as posted" + live link prompt appears as today.

## 4. Same buttons in other screens
- **Daily Queue cards (approved/exported):** "Copy & open [Platform]" button.
- **Calendar:** approved items show a small platform-open icon on the chip.
- **Comment Generator & comment cards:** "Copy & open post" copies the comment and opens the original external post (its saved link). Disabled with a reason if no link was captured.

## Rules kept
- Nothing is published automatically; buttons only copy and open pages.
- Links only come from saved account or post data; nothing guessed.

## Technical details
- `SidebarPostTo`: link to `/settings/clients?accounts=<clientId>`; `Clients.tsx` reads the param and opens `SocialAccountsDialog`. URL normalization in `SocialAccountsDialog` save.
- Drawer: extend `Check` with optional `fix: { label, to?: string, tab?: "preflight" }`; controlled Tabs value for in-panel jump; Daily Queue already supports `?post=<id>` — extend it to also open the edit dialog via `&edit=1`. Asset Library gets `?asset=<id>` highlight if not already supported.
- Reuse `OpenPlatformButton` (add `reason` prop for locked tooltip) in `PostCardItem`, `WeeklyCalendarView`, `CommentCardItem`, `CommentGenerator` (opens `external_posts.external_url`).

# Remove Decision Clarity OS link + one-click "Open to post" links

## 1. Left panel
- Remove the "Decision Clarity OS" link (and its lock state) from the sidebar.
- Add a "Post to" section showing the selected client's saved social accounts (LinkedIn, Instagram, Facebook) with platform icon + handle. Each opens the account's page in a new tab.
- Accounts without a saved profile link show "Add link", opening the existing Social Accounts dialog (admins only).

## 2. Where else "Open to post" appears
- **Posting Package drawer**: "Copy all & open [Platform]" button — copies caption + hashtags (first comment copied separately), then opens the matching account. Enabled only when the post is approved and passes preflight (existing gates).
- **Approved Content cards**: small "Open [Platform]" button next to copy buttons.
- **Mark as Posted prompt**: after opening the platform, a reminder lets the user mark the post Posted (SM-NNNN) and optionally paste the live post URL for tracking.
- **Comment Generator**: "Copy & open post" opens the external post being commented on.
- **Calendar / Daily Queue**: platform icon on approved items links to the account.

## 3. Rules
- Never auto-publish; links only open the page — the human posts.
- Links come only from saved account data; nothing is guessed.
- Facebook/Instagram/LinkedIn "create post" URLs used where the platform supports them (e.g. LinkedIn share composer); otherwise the profile page.

## Technical details
- Read `social_accounts.profile_url` for the active client; shared `useClientSocialAccounts` hook + `OpenPlatformButton` component.
- Optional `posted_url` text column on `post_cards` (small migration) for the live-post link.
- Remove sidebar block in `AppSidebar.tsx`; leave the incoming-handoff hook untouched.

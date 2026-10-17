# Keep pop-ups and drawers open when switching browser tabs

## What's causing it
Clicking outside a box no longer closes it. Switching tabs is a separate problem. When you come back to the tab, the sign-in system quietly refreshes your login. The app treats that refresh as a brand-new sign-in: it re-checks your role and shows a loading screen for a moment. That loading screen replaces the whole page, so every open pop-up, drawer and unsaved edit is wiped.

This affects every page, not just Daily Queue.

## The fix
1. Only treat a login refresh as a change when a different person signs in. If it's the same user, the page stays put and nothing reloads.
2. Show the full-page loading screen only on the first load, never during a background refresh.
3. Leave the existing "click outside doesn't close" behavior in place for all pop-ups, side panels, confirm boxes and drawers.

## How I'll verify
On Daily Queue, signed in as the QA account: open Edit on a post, type text, switch to another tab, wait for the login to refresh, and come back. The box should still be open with the text in it. I'll repeat this once with the Posting Package side panel.

## Technical details
- `src/hooks/useAuth.tsx`: in `applySession`, keep the previous `user` object when `nextSession.user.id` matches the current one (the session still updates). The role-check effect depends on `user?.id`, not the `user` object.
- Track a `hasLoadedOnce` flag so `loading` only covers the initial auth and role resolution. Later role re-checks don't flip `loading`, so `ProtectedRoute` never unmounts the app mid-session.
- No changes to the database or to any page.

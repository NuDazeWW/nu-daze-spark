# SocialMotive visual-only redesign (binding requirements included)

## Ground rules
- The existing app is the baseline. The uploaded package is a visual reference and component source only: keep current URLs, sign-in, client context, data, calculations, buttons, permissions, validation and workflows.
- No wording, content or data changes. No sample numbers, thumbnails, accounts or setup progress from the package.
- Reference hierarchy: the five supplied page designs govern layout; the UI treatment card governs shared components; the existing app governs wording, data, controls and behavior. Where keeping a control breaks a reference layout, keep the control and record the difference.
- Styling direction (your choice): extend the package's stronger glow and supplemental blue/violet/magenta accents across all pages, with dark command areas and light focused forms/details.

## 1. Coverage checklist (persistent, in the project)
Built from the real router and component tree before any styling. One row per route or nested view with: file, page pattern, dark/light surface, implementation status, visual check, interaction check, screenshot reference, remaining differences/blockers.

Routes: `/`, `/insights`, `/assets`, `/sources`, `/strategy`, `/briefs`, `/generator`, `/queue`, `/review`, `/planner`, `/comments`, `/approved`, `/publishing`, `/repurpose`, `/media-studio`, `/setup`, `/help`, `/whats-new`, `/pricing`, `/auth`, `/reset-password`, not-found, and all `/settings/*` (workspace, team, usage, billing, notifications, connections, brand-kit, email-provider, clients, tags).

Nested views: Strategy's 10 tabs, Connections' 3 tabs, Posting Package's 6 tabs, Executive Review steps, all dialogs/drawers (asset upload/edit/lightbox/picker, connected folders with OneDrive/SharePoint/Google Drive, source import, brief edit, split platforms, bulk export, schedule import, post/comment edit, team invite, provider setup, billing/demo confirmations), sidebar hover lists, menus, selects, tooltips, and loading/empty/error/locked/permission states.

A shared sidebar or color change does not count as a page redesign.

## 2. Shared foundations
- Design package treatment added under its own namespaced variables so it never collides with existing color roles; contrast checked on both dark and light surfaces.
- Shell: glowing sidebar background with highlighted active item, translucent top bar, dark atmosphere on command pages, warm light atmosphere on reading/form pages.
- Shared buttons (luminous primary, outlined secondary), inputs/selects (glowing focus), tabs, cards (dark luminous cards; light focus panels), badges, tables, dialogs, drawers, menus and tooltips themed explicitly, including those that open outside the page.
- Icon fixes: sidebar Help uses the life-buoy icon; generator info icons use the supported info icon; icon references stay typed.
- Existing font loading and dependencies reused.
- Logo: the package crops a remotely hosted logo sheet, which conflicts with the brand rule against cropping. Keep the current approved logo file; any bird-only artwork is used only if an approved standalone file exists, otherwise documented as missing.

## 3. Five reference pages first, then compare
Dashboard `/`, Portfolio Insights `/insights`, Asset Library `/assets`, Workspace setup `/setup`, Social Post Generator `/generator` — matched to the supplied compositions with real data. Screenshot and compare against the designs; fix major differences before broad rollout.

## 4. Roll out to every remaining pattern
Lists/libraries, briefs/strategy/editors, queue/planner, review/detail, settings/onboarding, account/pricing/support pages — each page's content area and nested views adapted individually, not just inherited from shared styles.

## 5. Evidence before calling it done
- Every route checked at desktop; each pattern and distinct responsive layout at tablet and mobile.
- Report totals: inventoried, implemented, visually verified; list unchecked or blocked views.
- Screenshots of all five reference pages plus representative screenshots for each other pattern.
- Existing tests run; representative interactions checked with real records (no resets, approvals, billing changes or credit spend just for checks).
- Intentional layout differences and missing assets listed. If work spans several passes, the checklist carries over and partial completion is reported accurately.

## Technical notes
- Presentation-only edits to shared styles, shared controls, layout shell and page markup; no backend, route, hook or handler changes.
- Architecture guidance updated with the namespaced visual-treatment rule; your styling preference saved to project memory.

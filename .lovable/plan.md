# Campaign Briefs redesign + consolidated visual and local navigation update

Presentation and local navigation only. Publishing, scheduling, readiness, review permissions, billing, integrations, content and draft persistence stay unchanged. Header and side navigation structure stay as they are (except the Post Office rename).

## 1. Campaign Briefs page body (match reference image)
- Intro strip: one wide card, three columns, each with an outlined icon (target, layers, shield).
- Left "Campaign briefs" panel with search icon; brief tiles with a stronger selected border and status pill.
- Selected brief panel: status pill above title; actions on two rows (Edit, Campaign one-pager, AI completeness review; then brand voice, Test 3 angles, Generate content set). Labels unchanged.
- Brief completeness: thick progress bar with %; "Ready to generate" checklist in its own card with real check/incomplete states.
- New "Strategy & messaging" section: each field is its own icon tile (Objective, Target audience, Core message, Proof points as bullets; CTA, URL, Success metric, Timing, Channels, Constraints as compact tiles).
- Feedback & discussion and Master content objects restyled as sections with icon headings; master objects in a two-column tile grid with platform icon, type, status and menu.

## 2. Shared luminous card system
- One shared treatment built from the supplied glow CSS, with accent (cyan, magenta, violet, gold, lime, neutral), emphasis (subtle, standard, featured) and surface (dark, light) options.
- Accent by purpose: cyan = AI creation, magenta = comments/engagement, violet = planning/queues, gold = uploads/imports/review, lime = verified ready/success only, neutral = supporting info. Assigned from one central configuration per card identity, never by position. Provider colors on connector tiles kept.
- Repeated cards in one collection share a treatment; only clickable cards lift on hover; no nested glows; reduced-motion respected.

## 3. Dark vs light surfaces
- Dark headers: bright white title and tagline with crisp contrast shadow; "Turn strategy into social momentum" keeps its wording and position (restored where it was removed, never added elsewhere).
- Light pages stay light: dark text, readable placeholders, light-context borders and shadows.

## 4. Non-brand icon treatment
- Dashboard-style tinted, lit icon treatment applied to non-brand icons app-wide without changing glyph or size. Social and provider logos untouched. Status meaning preserved.

## 5. Top-of-page local navigation for every menu group
- Built from the same menu definition the sidebar uses, so both stay in sync. Ordered button-style links, current item highlighted (cyan, plus non-color cue), tabs and anchors handled, works with Back/Forward and refresh, wraps or scrolls on small screens. Existing controls upgraded, not duplicated.

## 6. Dashboard onboarding
- The eight setup links become luminous navigation buttons with their existing status icons; completion (green check / hollow) shown separately from the current step. Counts and Continue setup kept.

## 7. Brand & Strategy Studio
- The ten top links become luminous navigation buttons in the same order with the correct one selected.

## 8. Connected Sources
- Search field gets a stronger gradient frame and focus ring, readable placeholder, semibold supporting text. Bulk import and Manage connectors use the Campaign Briefs button style.

## 9. Post Office rename and Post to card
- Social Post Generator renamed "Post Office" in heading and menu; "Generate Post Cards" section becomes "Generation Station" (the generate button keeps its wording). Existing address kept.
- Post to card moves from Workspace Settings to a left column on Post Office (stacks on small screens), behavior unchanged; Social Connections stays in Workspace Settings. New "Post Connector" menu item jumps to it.

## Check
- Screenshots at 887px, 1440px and mobile across affected pages; menus, tabs, anchors and Back/Forward; onboarding statuses; tests, typecheck and build. No real posts or emails. Report any pages not yet covered honestly.

## Technical details
- Extend `src/index.css` with `.sm-glow` variants mapped to tokens plus light-surface variants; accent map in a new `src/lib/cardAccents.ts`.
- Shared nav metadata extracted from `AppSidebar.tsx` into `src/lib/navigation.ts`, consumed by sidebar and a new `LocalNav` component rendered by `PageHeader`.
- `CampaignBriefs.tsx`, `BriefCollaboration.tsx`, `Dashboard`/`SetupChecklist`, `Strategy.tsx`, `ConnectedSources.tsx`, `PostGenerator.tsx`, `SidebarPostTo.tsx`/Setup markup only.
- Record the shared accent/nav-metadata rules in `AGENTS.md`; save the accent-by-purpose preference to memory.

# SocialMotive — Consolidated Visual and Local Navigation Update (reconciled plan)

The full brief "SocialMotive — Consolidated Visual and Local Navigation Update" is the acceptance contract. This plan summarizes it; it does not narrow it. Presentation and local navigation only — publishing, scheduling, readiness, permissions, billing, integrations, content and saved drafts are unchanged.

## 1. CSS source confirmation

- `SocialMotive_-_Luminous_Glass_UI_Treatment_pasted.md` (Oct 15) is a **prose specification only** (208 lines, no stylesheet). It describes the three lighting layers, palette and states; it contains no executable CSS.
- `socialmotive.css` (Oct 14 design package, with `socialmotive.tailwind-preset.js` and `SocialMotiveApp.tsx`) is the only supplied executable CSS. Relevant blocks: `.sm-root` tokens (line 25), `.sm-heading-glow` (61), `.sm-btn-glow` and its hover (232–241), `.sm-modal-glow` (439). It has no card-glow class.
- Therefore: button, heading and modal glow are taken from `socialmotive.css`; the card, icon, navigation, metric and status treatments are **written new from the prose spec**, and will be labeled that way in code comments and the final report. No approximation will be presented as supplied code.
- Integration points: tokens and treatments in `src/index.css` (alongside existing `.sm-route-themed`, `.sm-studio-rules`, `.sm-briefs` blocks); variants applied through shared components `src/components/ui/card.tsx`, `button.tsx`, `tabs.tsx`, `input.tsx`, `dialog.tsx`/`sheet.tsx`, `src/components/shared/PageHeader.tsx`, and a new accent map `src/lib/cardAccents.ts`.
- Palette preserved exactly: Navy #0B0F26, Cyan #00E5FF, Magenta #FF3D8D, Violet #9B5CFF, Lime #B6FF37, Gold #FFD43B.
- Three layers kept on every lit element: illuminated border, soft exterior bloom, interior color diffusion. Emphasis levels subtle / standard / featured; strongest level reserved for featured or selected states.
- Light surfaces: a light variant (tinted border, pale diffusion, soft colored shadow) so white headers and bodies stay white.

## 2. Shared treatments (cards and beyond)

- Cards, action buttons (primary, outline, ghost), icons (non-brand), local navigation buttons, metric tiles, status pills, search fields, tabs, dialogs and drawers.
- Accent by purpose from one central map: cyan = AI creation, magenta = comments/engagement, violet = planning/queues, gold = uploads/imports/review, lime = verified ready/success only, neutral = supporting info. Provider and social logos keep their own colors and artwork.
- Repeated cards in one collection share one treatment; only clickable items lift on hover; no nested glows.
- States: focus (cyan halo), hover, selected (color plus non-color cue such as underline/check), pressed, disabled (no glow, readable), loading.
- Reduced motion respected; glow never reduces label contrast.

## 3. Route / component coverage matrix

Legend — S: shared inheritance only; P: page-specific change; LN: local navigation.

| Route / view | Surface | Cards / buttons / icons / fields | Header | LN | Inherits | Page-specific | Exceptions |
|---|---|---|---|---|---|---|---|
| `/` Dashboard | Dark | KPI metrics, readiness, onboarding | Own art | Core group | S | P: 8 onboarding buttons | Header art kept |
| `/insights` | Dark | Metric tiles, empty state | Dark | Core group | S | — | — |
| `/strategy` (10 tabs) | Light body | Rule cards, badges, dialogs | Dark | 10 tab destinations | S | P: 10 top buttons | — |
| `/assets` | Dark | Asset tiles, search, folders | Dark | Strategy group | S | — | Thumbnails unlit |
| `/sources` | Light | Source, cloud, reporting tiles | Dark | Strategy group | S | P: search frame, 2 button styles | Provider colors kept |
| `/briefs` | Light | Brief list, detail, collaboration, masters | Dark | Create group | S | P: see section 5 | — |
| `/generator` Post Office | Dark | Settings, source assets, Generation Station | Dark | Create group + Post Connector anchor | S | P: rename, Post to column | — |
| `/comments` | Light | Post cards, author context | Dark | Create group | S | — | — |
| `/repurpose` | Light | Suggestion cards | Dark | Create group | S | — | — |
| `/media-studio` | Light | Controls, canvas, variations | Dark | Create group | S | — | — |
| `/planner` | Light | Calendar cells, chips, tray | Dark | Plan group | S | — | Drag targets unchanged |
| `/review` | Own | Review cards | Own | Plan group | S | — | Own layout kept |
| `/queue` | Light | Board/list/calendar cards | Dark | Pipeline nav | S | P: PipelineNav upgraded | — |
| `/approved` | Light | Approved cards | Dark | Pipeline nav | S | — | — |
| `/publishing` | Light | Status rows, runs panel | Dark | Pipeline nav | S | — | Samples stay labeled |
| `/setup` | Light | 8 step cards, forms | Dark | Settings group | S | — | — |
| `/settings/team`, `/connections` (3 tabs), `/email-provider`, `/brand-kit`, `/tags`, `/clients`, `/notifications`, `/usage`, `/billing` | Light | Forms, tables, meters | Dark | Settings group (+ tabs on connections) | S | Connections: Post to removed | — |
| `/help`, `/help/guide`, `/whats-new` | Light | Articles, cards | Dark | Help group | S | — | — |
| `/auth`, `/reset-password`, `/pricing`, `/terms`, `/privacy`, not-found | Own | Buttons, fields | Own | None | S (buttons/fields) | — | Public pages: no app nav |
| Posting Package drawer (6 tabs) | Inherits | Tabs, actions, fields | — | Drawer tabs | S | — | No new publish UI |
| All dialogs and sheets | Inherits | Frame, fields, buttons | — | — | S | — | — |

## 4. Local navigation metadata

- One definition (`src/lib/navigation.ts`) feeds sidebar and page-top navigation. Each entry is typed as page route, same-page anchor, tab destination, or route plus target section.
- Built from each dropdown's actual subtopics in their existing order (e.g. Strategy: Brand Voice, Voices, Guardrails, Platform Rules, Audiences, Campaigns, Hashtags, CTAs, Cadence, Engagement). It is not a repeat of the six sidebar group names.
- Correct selected state from path, tab parameter or hash; direct links; Back/Forward and refresh restore the selection; anchors scroll with header offset; full keyboard access (Tab, Enter, visible focus, `aria-current`); wraps or scrolls on small screens. Existing controls (PipelineNav, Strategy tabs) are upgraded, not duplicated.

## 5. Campaign Briefs reconstruction (approved, in scope)

- The approved reconstruction is implemented in full, not reduced to styling: intro strip (one wide card, three icon columns), brief list (search, stronger selected border, status pill), selected-brief panel (status pill above title, actions on two rows), completeness bar and separate "Ready to generate" checklist with real states, "Strategy & messaging" field tiles, discussion section, and master content objects in a two-column tile grid.
- Shared luminous card, button and non-brand icon treatments applied throughout.
- Existing content, action labels, data, permissions and functionality preserved.
- This reconstruction and the Post to relocation (section 6) are the two explicit exceptions to the general rule of preserving existing layouts.

## 6. Carried-forward requirements

- Icon artwork and sizes unchanged; social and provider logos excluded.
- Onboarding: all eight destinations; completion (green check / hollow) separate from current-step selection; missing indicators restored.
- Brand & Strategy Studio: all ten destinations as lit buttons, correct one selected.
- Dark headers only: bright white title and tagline with restrained contrast shadow. Light surfaces: dark readable text, readable placeholders, framed search fields.
- Tagline "Turn strategy into social momentum" keeps wording and established placement; not added elsewhere.
- Post Office (heading and menu), Generation Station section (button wording unchanged), Post Connector menu item jumping to Post to.
- Post to moves from Workspace Settings to a left column on Post Office with identical behavior; no second publishing interface; Social Connections stays in Settings.
- Reduced motion, readable contrast, unchanged permissions, preserved typed input.

## 7. Verification

- Every matrix row checked at 887px, 1440px and mobile, signed in, with screenshots; local navigation, tabs, anchors, Back/Forward, refresh and keyboard checked per group; onboarding states checked.
- Report separates shared-component checks from page-level visual checks, lists any row not verified, and makes no app-wide completion claim without per-row evidence. Tests, typecheck and build run. No real posts or emails.

## Technical details

- `src/index.css`: `.sm-lit` base with `data-accent` and `data-emphasis`, dark and light variants; port `.sm-btn-glow`, `.sm-heading-glow`, `.sm-modal-glow` from `socialmotive.css`.
- `src/lib/cardAccents.ts` accent map by card identity; `src/lib/navigation.ts` typed nav metadata consumed by `AppSidebar.tsx`, `SidebarHoverList.tsx` and a new `LocalNav` in `PageHeader.tsx`.
- Page edits: `Dashboard`/`SetupChecklist`, `Strategy.tsx`, `ConnectedSources.tsx`, `PostGenerator.tsx`, `SidebarPostTo.tsx`, `Connections.tsx`, `CampaignBriefs.tsx`, `BriefCollaboration.tsx`, `PipelineNav.tsx`.
- Record nav-metadata and accent-map rules in `AGENTS.md`; save accent-by-purpose preference to memory; update `docs/redesign-coverage.md` with per-row evidence.

# SocialMotive visual-only redesign

## Scope and safeguards
- Apply the uploaded design package across all existing pages, including its stronger luminous effects and supplemental blue, violet, and magenta accents, as selected.
- Preserve **all existing wording, content, real data, calculations, routes, permissions, validation, and workflows**. Do not import the package’s static preview data or replace working pages with its sample routes.
- Use the five supplied redesigns as layout references; keep existing controls and information even when absent from those references. Necessary layout differences will be documented.
- Retain approved SocialMotive branding and platform-native preview appearance. Use dark command surfaces and light focused forms/details, with the package’s visual treatment adapted to each page type.
- Treat the roadmap PDF as reference only: no new product functionality, backend changes, demo resets, publishing changes, or subscription changes.

## 1. Inventory and preservation baseline
Create a route-and-view checklist before styling. The router currently includes these page groups:

| Page pattern | Existing routes |
|---|---|
| Dashboard / insights | `/`, `/insights` |
| Lists / libraries / tracking | `/assets`, `/sources`, `/approved`, `/publishing`, `/settings/tags`, `/settings/clients` |
| Briefs / strategy / generators | `/briefs`, `/strategy`, `/generator`, `/comments`, `/repurpose`, `/media-studio` |
| Queue / calendar | `/queue`, `/planner` |
| Standalone review | `/review` |
| Settings / forms | `/settings/workspace`, `/settings/team`, `/settings/usage`, `/settings/billing`, `/settings/notifications`, `/settings/connections`, `/settings/brand-kit`, `/settings/email-provider` |
| Onboarding / account | `/setup`, `/auth`, `/reset-password` |
| Pricing / supporting pages | `/pricing`, `/help`, `/whats-new`, not-found view |

Include nested views in the checklist:
- Strategy’s ten tabs; Connections’ channel, developer-app, and AI-tool tabs; media and brand-kit views.
- Posting Package’s package, native preview, Preflight, changes, AI media, and publish tabs; Executive Review and post edit views.
- Asset upload/edit/lightbox/picker, connected-folder browser and provider views, source import/edit, brief editing, platform splitting, export, scheduling, team/invite, provider configuration, and billing confirmation dialogs.
- Existing loading, empty, failure, validation, locked/permission, disabled, selected, and success states.

Capture baseline screenshots and visible wording on the five reference pages and important workflows using existing records. No destructive operations or paid AI calls are needed for the visual baseline.

## 2. Shared design foundations and icon corrections
- Adapt the existing sidebar, utility header, workspace/client switcher, page headers, and visible navigation buttons to the package’s visual language. Preserve collapsible navigation, hover lists, all destinations, and role-dependent controls.
- Centralize colors, typography, spacing, border treatments, radii, tonal depth, glow, and motion. Extend existing shared buttons, inputs, selects, tabs, tables, badges, cards, dialogs, drawers, and notifications instead of introducing a parallel application.
- Carry the package’s enhanced effects into meaningful action, hover, focus, and selected states without repeating large decorative artwork on every page.
- Include the supplied icon corrections: use the library-supported life-buoy for sidebar Help and info icon for the generator. Retain typed icon references and validate every imported icon against the installed library. The current source uses `HelpCircle` and `Info`; no broken reference was confirmed in the inspected files.
- Keep Space Grotesk, Inter, and IBM Plex Mono in their established roles. Use fixed responsive font sizes and visible keyboard focus.

## 3. Match the five supplied reference pages first
Adapt the supplied layouts to the existing working pages:
1. Dashboard → `/`
2. Portfolio Insights → `/insights`
3. Asset Library → `/assets`
4. Workspace setup → `/setup`
5. AI Post Generator → `/generator`

Match hierarchy, proportions, card treatments, toolbar styling, and focused forms closely. Populate everything from the existing application, keeping current titles, labels, metrics, and actions unchanged. Compare screenshots and correct discrepancies before extending the design.

## 4. Extend by page pattern
- **Lists and libraries:** consistent toolbars, filters, efficient rows/grids, permission indicators, and real thumbnails.
- **Briefs, strategy, and editors:** focused panels, clear tabs, readable forms, preserved source and approval information.
- **Queue and planner:** retain existing calendar behavior, controls, SM identifiers, and distinct content-type/status treatments.
- **Review and details:** readable evidence and copy, unchanged native previews, clear existing approval and revision actions.
- **Settings and onboarding:** coherent light focus surfaces inside the dark application shell; preserve every configuration option.
- **Account, pricing, and supporting pages:** adapt shared treatments without changing pricing, billing options, help copy, or account behavior.

## 5. Verification and completion report
- Check every route and each inventoried nested view; mark **implemented and visually checked**, **implemented but unchecked**, or **blocked with reason**.
- Capture the five reference screens plus examples of every other page type at desktop, tablet, and mobile widths. Check navigation, overflow, stacked panels, dialog sizing, readable contrast, keyboard focus, and reduced motion.
- Compare visible wording against the baseline and review the change set for accidental changes to data access, handlers, calculations, permissions, or business rules.
- Exercise representative existing flows with real records: open connected folders, inspect a brief and its controls, open a queued post’s preview/Preflight, inspect calendar and export options, navigate review links, and open settings dialogs. Do not reset content, approve posts, change billing, or spend credits solely for styling verification.
- Run relevant existing tests and inspect preview diagnostics. Report any workflow that cannot be verified without changing live data.
- Provide screenshots and explicitly list unmatched reference details, unchecked views, or asset blockers. Do not declare the redesign complete after checking only the dashboard.

## Technical approach and assets
- Keep React/Vite, the current router, authentication/providers, hooks, and backend intact. Do not follow the upload’s sample route-replacement instructions.
- Translate the uploaded CSS/preset into the project’s HSL semantic tokens and existing design-system variants. Avoid conflicting global `--accent` definitions and raw visual values in page code; ensure portalled menus/dialogs inherit the correct surface.
- Reuse the current font loading rather than importing a remote font URL through CSS. Add dependencies only when genuinely required by the adapted design.
- The package references a remotely hosted logo sheet and sample thumbnails. Do not use sample thumbnails in place of real assets. Reuse approved logo artwork; verify the referenced sheet before storing approved artwork through the app asset flow. If a needed standalone mark is unavailable, report that difference rather than redraw or crop an approved logo.
- Record the shared presentation approach in architecture guidance and maintain the route checklist during implementation. Save the selected package styling preference when build mode begins.

**Deliverable:** one cohesive SocialMotive visual system across the entire existing application, with unchanged content and working behavior.
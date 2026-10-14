# SocialMotive visual redesign — coverage checklist

Legend: Impl = implementation (Shared = only shared shell/components applied; Page = page content area adapted). Visual / Interaction = verified (Y), not yet (—).
Pass 1 (2026-10-14): shared foundations only. Per the plan, shared styling does NOT count as a page redesign.

| Route / view | File | Pattern | Surface | Impl | Visual | Interaction | Evidence | Remaining |
|---|---|---|---|---|---|---|---|---|
| `/` | pages/Dashboard.tsx | Dashboard (reference 1) | Dark | Page | Y (desktop/tablet/mobile) | Y (navigation) | /tmp/browser/redesign/after-dashboard.png | Readiness retained above KPIs; supplied full stacked logo instead of cropped bird |
| `/insights` | pages/PortfolioInsights.tsx | Dashboard (reference 2) | Dark | Page | Y (desktop/tablet/mobile) | Read-only page | /tmp/browser/redesign/after-insights.png | Real empty portfolio retained; no sample metrics |
| `/assets` | pages/AssetLibrary.tsx | List (reference 3) | Dark | Page | Y (desktop/tablet/mobile) | Y (search, folders) | /tmp/browser/redesign/after-assets.png | Extra Connected Folders control retained; toolbar wraps to preserve every action |
| `/setup` | pages/Setup.tsx | Onboarding (reference 4) | Light | Page | Y (desktop/tablet/mobile) | Y (step navigation) | /tmp/browser/redesign/after-setup.png | All eight actual steps and original forms retained; no sample completion or tagline |
| `/generator` | pages/PostGenerator.tsx | Editor (reference 5) | Dark | Page | Y (desktop/tablet/mobile) | Y (real asset selection, enabled generation) | /tmp/browser/redesign/after-generator.png | Existing source rows retained; generation not run to avoid credit spend/data changes |
| `/sources` | pages/ConnectedSources.tsx | List | Light | Shared | — | — | — | Page pass |
| `/approved` | pages/ApprovedContent.tsx | List | Light | Shared | — | — | — | Page pass |
| `/publishing` | pages/PublishingStatus.tsx | List | Light | Shared | — | — | — | Page pass |
| `/settings/tags` | pages/AccountTags.tsx | List | Light | Shared | — | — | — | Page pass |
| `/settings/clients` | pages/Clients.tsx | List | Light | Shared | — | — | — | Page pass |
| `/briefs` | pages/CampaignBriefs.tsx | Editor | Light | Shared | — | — | — | Page pass |
| `/strategy` (10 tabs) | pages/Strategy.tsx + components/strategy/* | Editor | Light | Shared | — | — | — | Page pass |
| `/comments` | pages/CommentGenerator.tsx | Editor | Light | Shared | — | — | — | Page pass |
| `/repurpose` | pages/RepurposeCenter.tsx | Editor | Light | Shared | — | — | — | Page pass |
| `/media-studio` | pages/MediaStudioPage.tsx | Editor | Light | Shared | — | — | — | Page pass |
| `/queue` | pages/DailyQueue.tsx | Queue | Light | Shared | — | — | — | Page pass |
| `/planner` | pages/ContentPlanner.tsx | Calendar | Light | Shared | — | — | — | Page pass |
| `/review` | pages/ExecutiveReview.tsx (no shell) | Review | Own layout | — | — | — | — | Not inside shell; page pass |
| `/settings/workspace` | pages/settings/WorkspaceSettings.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/team` | pages/settings/Team.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/usage` | pages/settings/Usage.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/billing` | pages/settings/Billing.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/notifications` | pages/settings/Notifications.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/connections` (3 tabs) | pages/settings/Connections.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/brand-kit` | pages/settings/BrandKit.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/settings/email-provider` | pages/settings/EmailProvider.tsx | Settings | Light | Shared | — | — | — | Page pass |
| `/help`, `/whats-new` | pages/Help.tsx, WhatsNew.tsx | Support | Light | Shared | — | — | — | Page pass |
| `/pricing` | pages/Pricing.tsx (no shell) | Public | Own layout | — | — | — | — | Page pass |
| `/auth`, `/reset-password` | pages/Auth.tsx, ResetPassword.tsx | Account | Own layout | — | — | — | — | Page pass |
| not-found | pages/NotFound.tsx | Support | Own layout | — | — | — | — | Page pass |
| Posting Package (6 tabs) | components/queue/PostingPackageDrawer.tsx | Drawer | Inherits | Shared | — | — | — | Nested pass |
| Dialogs (assets, folders, sources, split, export, schedule, edit, invite, provider, billing/demo) | components/** | Dialog | Inherits | Shared (glow frame) | — | — | — | Nested pass |
| Sidebar + hover lists, menus, selects, tooltips | components/layout/*, ui/* | Shell | Dark | Shared | — | — | — | Verify |

## Asset notes
- Package logo is a remotely hosted sprite sheet cropped with CSS; not imported. Newly supplied standalone bird and horizontal mark have baked-in checkerboard pixels (RGB, not transparency), so they are reference-only until clean files are supplied. Supplied black-background stacked lockup is used whole on Dashboard and for the padded 64px favicon. Current sidebar logo retained.
- Package sample thumbnails/metrics not imported.

## Five-reference pass evidence (2026-10-14)
- Five page content areas implemented and visually checked at 1440px, 768px and 390px. Remaining routes and nested views are still awaiting their page-level pass.
- Exact rendered page-text comparison passed on all five routes against the pre-change signed-in workspace. No application data written.
- Generator: selected a real cleared library asset, closed the picker, confirmed the asset in Source Assets and enabled generation. Picker now uses a light focused surface.
- Asset Library: search empty-result state and Connected Folders opening verified. Setup: Organization type step and existing radio choices verified.
- 11 tests passed (contentPresentation + nativePreview); build OK and no runtime page errors in verification.
- Local Vite does not serve Lovable CDN assets; browser verification intercepted only that image path and fetched the actual image from hosted preview. Hosted image returned 200 image/png. No production code workaround.
- Evidence: `/tmp/browser/redesign/after-*.png`, `tablet-*.png`, `mobile-*.png`, `picker.png`, `selected.png`, `folders.png`, `setup-step.png`.

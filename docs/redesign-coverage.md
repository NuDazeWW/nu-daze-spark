# SocialMotive visual redesign — coverage checklist

Legend: Impl = implementation (Shared = only shared shell/components applied; Page = page content area adapted). Visual / Interaction = verified (Y), not yet (—).
Pass 1 (2026-10-14): shared foundations only. Per the plan, shared styling does NOT count as a page redesign.

| Route / view | File | Pattern | Surface | Impl | Visual | Interaction | Evidence | Remaining |
|---|---|---|---|---|---|---|---|---|
| `/` | pages/Dashboard.tsx | Dashboard (reference 1) | Dark | Shared | Shell only | — | /tmp/browser/rd/dash.png | Match reference composition |
| `/insights` | pages/PortfolioInsights.tsx | Dashboard (reference 2) | Light | Shared | — | — | — | Match reference |
| `/assets` | pages/AssetLibrary.tsx | List (reference 3) | Light | Shared | Shell only | — | /tmp/browser/rd/assets.png | Match reference |
| `/setup` | pages/Setup.tsx | Onboarding (reference 4) | Light | Shared | — | — | — | Match reference |
| `/generator` | pages/PostGenerator.tsx | Editor (reference 5) | Light | Shared | — | — | — | Match reference |
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
- Package logo is a remotely hosted sprite sheet cropped with CSS; this conflicts with the brand rule against cropping. Current approved logo file kept. No approved standalone bird mark supplied — missing asset.
- Package sample thumbnails/metrics not imported.

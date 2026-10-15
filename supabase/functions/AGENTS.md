# Edge function rules

- Connected-folder browsing (OneDrive, SharePoint, Google Drive) goes through `browse-cloud-storage`, which returns Graph-shaped items for every provider so one browser UI serves all drives.
- Text generators (`generate-from-brief`, `generate-comments`) meter the `text_drafts` bucket via `consume_usage`: dry-run before the AI call, deduct only for drafts actually saved.
- `scrape-posts` prefers Firecrawl and falls back to direct public-page fetching (OpenGraph/meta/JSON-LD) so Find Posts never hard-fails without a paid key.
- `_shared/feedbackLearning.ts` feeds reviewer revision notes and manually logged `post_results` into generation prompts, so the AI learns only from real stored outcomes.
- `notifications` builds email links from `workspace_settings.app_domain` when set, so each sold copy points to its own address.
- Reporting connectors (Tableau, SAP, Power BI, Sigma, QuickSight) use the read-only `reporting-feed` function with per-provider hashed keys from `create_reporting_key`, so BI tools never get user sessions.
- `generate-reels` runs entirely on the caller's session (RLS applies) and accepts either `asset_ids` or a text-led `topic` (+ `count` variants, `client_id`), so posts no longer require media.

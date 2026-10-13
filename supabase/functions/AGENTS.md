# Edge function rules

- Connected-folder browsing (OneDrive, SharePoint, Google Drive) goes through `browse-cloud-storage`, which returns Graph-shaped items for every provider so one browser UI serves all drives.
- Text generators (`generate-from-brief`, `generate-comments`) meter the `text_drafts` bucket via `consume_usage`: dry-run before the AI call, deduct only for drafts actually saved.
- `scrape-posts` prefers Firecrawl and falls back to direct public-page fetching (OpenGraph/meta/JSON-LD) so Find Posts never hard-fails without a paid key.

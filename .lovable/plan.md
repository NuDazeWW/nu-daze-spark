
# Add Multi-Client Support (NuDaze + PSRC)

Introduce a `clients` concept so Content Copilot can serve multiple brands. NuDaze becomes the default client; PSRC is added with its social handles pre-seeded. All content-scoped data (assets, sources, strategy, generation, queue, approvals, comments) is filtered by an active client selected in the top bar.

## Scope

### 1. Database (one migration)
- New table `public.clients`: `id`, `slug`, `name`, `is_active`, `created_at`, `updated_at`.
- New table `public.client_members` (`client_id`, `user_id`, unique) — controls which clients a user can see. Admins (via `has_role`) see all clients automatically.
- Security-definer helper `public.user_can_access_client(_user_id uuid, _client_id uuid) returns boolean` — true if admin OR row exists in `client_members`.
- Add nullable `client_id uuid references public.clients(id)` to the following content-scoped tables:
  - `source_assets`, `connected_sources`, `asset_summaries`
  - `brand_voice_rules`, `platform_rules`, `audience_definitions`, `campaign_rules`, `hashtag_banks`, `cta_banks`, `cadence_targets`, `engagement_targets`
  - `post_cards`, `post_versions`, `generation_batches`, `comments`, `external_posts`, `repurpose_suggestions`, `account_tags`
- Update existing RLS policies: add `AND public.user_can_access_client(auth.uid(), client_id)` on SELECT/INSERT/UPDATE/DELETE where `client_id` is set. Rows with `client_id IS NULL` remain visible (legacy NuDaze data) until backfilled.
- Backfill: seed `clients` with `nudaze` and `psrc`; set all existing rows' `client_id` to the NuDaze client id.
- Seed PSRC `account_tags` for the three handles (LinkedIn company "Partnership Readiness Standards Council", Instagram `@prscstandards`, LinkedIn personal Shirley Johnson).
- Grants + RLS on new tables per platform rules.

### 2. Frontend
- `ClientContext` + `useActiveClient` hook. Persists selected client in `localStorage`, hydrates from `clients` filtered by membership.
- `ClientSwitcher` component in the app header (top of `AppLayout`) — dropdown showing accessible clients, badge with active client name.
- Update all data hooks (`useAssets`, `useConnectedSources`, `useStrategyTable`, `usePostCards`, `useExternalPosts`, `useHashtagBanks`, `useAccountTags`, `useDashboardStats`) to:
  - Filter queries by `client_id = activeClientId`.
  - Set `client_id` on inserts.
  - Include `activeClientId` in query keys so switching refetches.
- Admin-only "Clients" settings page (`/settings/clients`) to create clients and manage member access. Sidebar entry under Settings.

### 3. Deferred (not in this pass)
- Per-client theming/branding, per-client edge-function prompts, per-client storage buckets, and audit backfill of `client_id NOT NULL`. These can follow once flow is validated.

## Technical Notes
- Legacy rows (`client_id IS NULL`) stay readable to avoid a hard cutover; a follow-up migration can enforce NOT NULL after review.
- `user_can_access_client` is SECURITY DEFINER to avoid recursive RLS on `client_members`.
- Query-key strategy: `["assets", clientId]`, etc., so React Query cache is per-client.
- Edge functions that write rows will read `client_id` from the request body and validate membership before insert.

## Out of scope
- Auto-publishing to PSRC socials (product still export-only).
- Migrating role storage — `user_roles` unchanged.
- DDI handoff receiver changes.

Proceed?

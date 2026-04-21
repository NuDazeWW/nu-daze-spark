# Project Memory

## Core
NuDaze Content Copilot — activation module of the federated NuDaze Motorsport Platform. Dark mode only. NuDaze brand: deep navy bg, teal primary, gold accent.
Plus Jakarta Sans font. Lovable Cloud backend with strict RLS via has_role() security definer.
Roles in user_roles table (admin/member). Never store roles on profiles.
Quota counts at Approved status. Comments use separate engagement_targets table. Repurpose suggestions on ingest.
Edge function generate-reels is misnamed — it generates post cards. Rename deferred to avoid deploy risk; document only.
DDI cross-launch: sidebar link to drift-signal-engine.lovable.app. Receiver via useDdiHandoff hook (from=ddi, entityId, assessmentId, surface).

## Memories
- [Brand tokens](mem://design/brand-tokens) — Full NuDaze color palette, gradients, shadows, typography
- [Database schema](mem://features/database-schema) — All 22 tables, enums, RLS policy summary
- [Auth flow](mem://features/auth) — Email/password, auto-profile creation, has_role RPC
- [Build plan](mem://features/build-plan) — 13-step implementation order with hardening guardrails
- [DDI handoff contract](mem://features/ddi-handoff) — Cross-launch URL params and receiver hook

# Project Memory

## Core
NuDaze Social Engine — internal content ops tool. Dark mode only. NuDaze brand: deep navy bg, teal primary, gold accent.
Plus Jakarta Sans font. Lovable Cloud backend with strict RLS via has_role() security definer.
Roles in user_roles table (admin/member). Never store roles on profiles.
Quota counts at Approved status. Comments use separate engagement_targets table. Repurpose suggestions on ingest.

## Memories
- [Brand tokens](mem://design/brand-tokens) — Full NuDaze color palette, gradients, shadows, typography
- [Database schema](mem://features/database-schema) — All 22 tables, enums, RLS policy summary
- [Auth flow](mem://features/auth) — Email/password, auto-profile creation, has_role RPC
- [Build plan](mem://features/build-plan) — 13-step implementation order with hardening guardrails

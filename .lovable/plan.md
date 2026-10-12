# SocialMotive: Commercial-Ready Demo Edition

Goal: add every feature a buyer needs to run their own copy, while this copy stays the NuDaze demo. NuDaze content, clients and admins stay. Every new setup step shows as already completed for NuDaze, but each one fully works and can be edited or rerun.

## What gets built

### 1. Workspace Branding (prefilled with NuDaze / SocialMotive)
- New Settings page: company name, logo, accent color, favicon.
- Prefilled with the current look. Changes apply across the app right away.

### 2. First-run setup wizard (shown as complete for NuDaze)
Steps: company profile and branding, organization type, first client or department with its social accounts, brand voice basics, cadence targets, invite teammates.
- The Dashboard shows a setup checklist marked done for NuDaze. Any step can be reopened.
- "Preview as new buyer" button lets an admin walk the wizard without changing data.

### 3. Agency or Brand mode with departments
- Setting: Agency (many clients) or Brand (many departments). Changes the label everywhere ("Clients" or "Departments").
- NuDaze is set to Agency mode with NuDaze Flagship already in place.
- Each client/department can hold several social accounts per platform (e.g. two LinkedIn pages). The current platform selections become accounts automatically.

### 4. Team, roles and seat limits
- Invite by email with a role: Owner, Admin, Editor, Reviewer, Viewer; assign to specific clients/departments.
- Current admins keep their access; Shirley becomes Owner.
- Owner can transfer ownership and remove users; seat limit shown and enforced.

### 5. Plans and usage (optional per sale)
- Plan settings with seat and client limits, off by default for NuDaze (unlimited).
- Usage page: AI generations this month, posts approved, seats used.

### 6. Easy updates across sold copies
- This project stays the master; each sale is a remix.
- All buyer settings live in the database, so updates don't overwrite them.
- Version number in the footer and a "What's new" page.
- "Reset to clean workspace" admin tool (with strong confirmation) that buyers use once to clear demo data; NuDaze never needs to run it.

### 7. Commercial polish
- Help pages and empty-state guidance on each screen.
- Data export: download all content per client/department.
- Admin activity log of key actions (invites, role changes, approvals, settings).

## Build order
1. Branding + Agency/Brand mode + social accounts
2. Setup wizard and checklist
3. Team roles, invites and seat limits
4. Usage, plans, version and What's new
5. Export, activity log, help and reset tool

## Technical details
- New `workspace_settings` table (single row): name, logo path, colors, org type, entity label, setup progress, plan limits, version. Seeded with NuDaze values and all setup steps complete.
- New `social_accounts` table per client (platform, handle, profile URL), backfilled from `clients.platforms` (kept, later deprecated).
- New `workspace_invites` and `activity_log` tables with RLS and grants.
- Extend `app_role` with owner/editor/reviewer/viewer; permissions checked via `has_role()`; prevent removing the last owner by trigger.
- NuDaze domain auto-admin trigger kept for this copy, controlled by a setting so buyers can turn it off.
- Branding colors applied as runtime overrides of existing tokens, with SocialMotive defaults.
- Record "buyer settings live in data, not code" in AGENTS.md.

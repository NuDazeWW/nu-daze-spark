# SocialMotive: Commercial-Ready Edition (first sold copy)

Goal: turn this NuDaze-run build into a clean, self-managed product that any buyer (agency or multi-department brand) can set up and run in their own Lovable account.

## Recommendations, in build order

### 1. Remove NuDaze from the product ("white-label clean")
- Move all NuDaze-specific wording, starter content, sample posts, strategy rules and default client out of the app and into an optional "demo data" pack.
- Add a Workspace Branding page: buyer's company name, logo, accent color, favicon. The SocialMotive look stays the default.
- Remove the NuDaze-email auto-admin rule and hard-coded admin accounts; the first person to sign up becomes the owner.

### 2. First-run setup wizard
Walks the owner through, in order:
1. Company profile and branding
2. Organization type: Agency (many clients) or Brand (many departments)
3. First client or department, with its social accounts (LinkedIn, Instagram, Facebook)
4. Brand voice basics, content pillars, banned phrases
5. Weekly cadence targets per platform
6. Invite teammates
Progress shows on the Dashboard until complete; can be skipped and resumed.

### 3. Flexible structure: clients and departments
- Rename "Clients" to a configurable label ("Clients" for agencies, "Departments" or "Brands" for companies).
- Each client/department has its own social accounts, strategy rules, cadence, assets and team — already isolated by existing data rules.
- Allow several accounts per platform per department (e.g. two LinkedIn pages).

### 4. Team, roles and seat limits
- Invite by email with a role: Owner, Admin, Editor, Reviewer, Viewer.
- Assign people to specific clients/departments.
- Owner-only: transfer ownership, remove users.
- Seat limit setting tied to the plan.

### 5. Billing for the buyer's end users (optional per sale)
- Only needed if a buyer resells access. Default: off, since each buyer already pays you for their copy.
- If switched on: plans with seat and client limits, enforced in the app.

### 6. Easy updates across sold copies
- Keep one "master" project (this one, cleaned) as the source; each sale is a remix of it.
- Keep all buyer-specific settings in the database, never in code, so updates can be copied into each copy without overwriting the buyer's setup.
- Add a visible version number and "What's new" page.
- Write a short release checklist for pushing updates to buyer copies.

### 7. Commercial polish
- In-app help pages and empty-state guidance on every screen.
- Terms, privacy and data export (buyer can download all their content).
- Usage page: AI generations this month, posts approved, seats used.
- Error-friendly messages and an admin activity log.

## Suggested first slice
Steps 1, 2 and 3 together: a buyer can install a clean copy, brand it, pick agency or brand mode and set up departments. Then 4, then 6, then 5 and 7.

## Technical details
- New `workspace_settings` table (single row): name, logo path, colors, org type, entity label, setup progress, version.
- New `social_accounts` table per client (platform, handle, profile URL), replacing reliance on `clients.platforms` (kept, deprecated later).
- Extend `app_role` enum with owner/editor/reviewer/viewer; keep checks in `has_role()`; bootstrap owner via signup trigger only when no owner exists.
- Drop the NuDaze domain admin trigger; move NuDaze seed data to an admin-triggered "load demo data" function.
- Brand tokens read from workspace settings at runtime with SocialMotive defaults.
- Record "buyer settings live in data, not code" in AGENTS.md.



# NuDaze Social Copilot — Final Implementation Guardrails

These five additions complete the operational hardening layer. All are baked into the 13-step build.

---

## 1. Storage Security

All Supabase Storage buckets are **private by default**. No public buckets.

| Bucket | Purpose | Access Policy |
|---|---|---|
| `source-assets` | Uploaded files (images, PDFs, videos, decks) | Authenticated users can read; uploader or admin can insert/delete |
| `generated-assets` | AI-suggested or attached visuals | Authenticated users can read; service role inserts |
| `summaries` | Stored summary artifacts if needed | Authenticated users can read; service role inserts |

RLS policies on `storage.objects`:
- **SELECT**: `auth.role() = 'authenticated'` (all team members can view)
- **INSERT**: `auth.uid() = owner` OR `has_role(auth.uid(), 'admin')`
- **DELETE**: `has_role(auth.uid(), 'admin')` only
- **UPDATE**: `has_role(auth.uid(), 'admin')` only

File URLs are generated via signed URLs with expiration — never raw public URLs. Frontend uses `supabase.storage.from('bucket').createSignedUrl()` for all file access.

---

## 2. Semantic Validation

Applied in edge functions **after** Zod schema validation and **before** writing to DB. Lightweight checks, not AI re-evaluation.

### Post Cards
- `draft_copy` length: min 20 chars, max 3000 chars
- `draft_copy` not placeholder-like (reject if matches patterns like "Lorem ipsum", "TODO", "placeholder", "test post")
- `hashtags` array: max 30 items, no duplicates within a card
- `source_references` array: must have at least 1 entry
- `platform` + `content_type` combination validated against allowed pairs (e.g., no `instagram` + `article`, no `linkedin` + `reel`)
- `rationale` not empty

### Comment Drafts
- `draft_copy` min 10 chars, max 500 chars
- Not placeholder-like
- `external_post_id` must reference an existing, non-blocked external post

### Summaries
- `summary` min 50 chars
- `key_topics` array: at least 1 entry

### Repurpose Suggestions
- `repurpose_type` must be a valid enum value
- `target_platform` + `target_content_type` must be a valid combination
- `rationale` not empty

On validation failure: return structured error with field-level messages, do not save, mark background job as `failed` with `failure_reason = 'semantic_validation'`.

---

## 3. Background Job Observability

Expanded `background_jobs` table:

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| job_type | enum | scrape, summarize, generate_batch, generate_comments, suggest_repurpose |
| status | enum | queued, running, completed, failed, retrying |
| progress_current | int | Items processed so far |
| progress_total | int | Total items in batch |
| created_by | uuid → auth.users | Who triggered it |
| created_at | timestamptz | When queued |
| started_at | timestamptz | When execution began |
| completed_at | timestamptz | When finished (success or final failure) |
| duration_ms | int | `completed_at - started_at` in ms, computed on completion |
| retry_count | int | Default 0, incremented on each retry |
| max_retries | int | Default 3 |
| last_error_code | text | e.g. `RATE_LIMITED`, `SCHEMA_INVALID`, `TIMEOUT` |
| last_error_message | text | Human-readable error detail |
| failure_reason | text | Final reason if status = failed |
| metadata | jsonb | Job-specific context (batch settings, asset IDs, etc.) |

UI: Top bar shows active/recent jobs. Clicking opens a jobs panel with status, progress, duration, and error details. Failed jobs show retry button.

---

## 4. Retention and Cleanup

A scheduled edge function (`cleanup-old-records`) runs weekly (invoked via Supabase cron or manual trigger in v1A):

| Table | Retention Rule |
|---|---|
| `post_versions` | Keep all versions for cards in active statuses. For `archived` cards older than 90 days, keep only version 1 (AI original) and the final approved version, delete intermediate edits |
| `approval_log` | Keep all entries for 180 days. Archive entries older than 180 days to a `approval_log_archive` table (same schema, no RLS needed — admin-only access) |
| `background_jobs` | Delete `completed` jobs older than 30 days. Keep `failed` jobs for 90 days. Running/queued jobs never cleaned |
| `external_posts` | Delete posts with `risk_flag = blocked` older than 30 days. Keep `safe` posts for 90 days unless linked to an approved comment |
| `asset_summaries` | Delete summaries for assets with `permission_state = archived` and older than 90 days |

Cleanup runs are logged as a `background_job` entry themselves for observability.

A `retention_settings` table stores these thresholds so admins can adjust without code changes:

```text
id, table_name, rule_description, retention_days, is_active, updated_by
```

---

## 5. Seed / Demo Data

Loaded via a one-time edge function or migration seed script. Covers all modules so the app is immediately testable.

### Cadence Targets (5 rows)
- LinkedIn posts: 5/week
- Instagram feed: 5/week
- Instagram Stories: 14/week (2/day)
- Instagram Reels: 3/week
- (Comments handled separately)

### Engagement Targets (2 rows)
- LinkedIn comments: 5/day, min relevance 0.7, safe only
- Instagram comments: 5/day, min relevance 0.6, safe only

### Strategy Tables
- **Brand voice**: 3 rules (professional-but-human tone, no jargon list, personality descriptors)
- **Platform rules**: 2 entries (LinkedIn constraints, Instagram constraints with char limits and format preferences)
- **Audience definitions**: 3 segments (CMOs/VPs, founders, marketing managers)
- **Campaign rules**: 2 active campaigns ("Q2 Growth Push", "Brand Awareness Always-On")
- **Hashtag banks**: 3 categorized sets (brand, industry, campaign-specific, ~30 hashtags total)
- **CTA banks**: 2 sets (engagement CTAs, traffic CTAs, ~10 CTAs total)

### Source Assets (8 items)
- 2 images (sample brand graphics, stored in `source-assets` bucket)
- 1 PDF (sample case study, permission: generation_allowed)
- 1 link (sample blog post, permission: generation_allowed)
- 1 text snippet (testimonial, permission: generation_allowed)
- 1 video placeholder (permission: summarization_only)
- 1 deck placeholder (permission: blocked — for testing blocked state)
- 1 archived asset (permission: archived — for testing expiry)

### Post Cards (10 cards across statuses)
- 2 Draft (LinkedIn post, Instagram feed)
- 2 In Review (LinkedIn post, Instagram Reel)
- 1 Needs Revision (Instagram Story with revision notes)
- 2 Approved (LinkedIn post, Instagram feed)
- 1 Exported (LinkedIn post)
- 1 Posted (Instagram feed)
- 1 Archived (LinkedIn post, expired)
- Each with realistic copy, hashtags, tags, source references, rationale
- At least 2 with multiple versions (AI original + human edit)

### External Posts + Comments (5 posts, 8 comments)
- 3 safe posts (relevance 0.7-0.9) with 2 comment drafts each
- 1 review_needed post (relevance 0.5) with 1 comment draft
- 1 blocked post (relevance 0.3, risk flagged)

### Repurpose Suggestions (4 items)
- 1 repost_as_is suggestion
- 1 cross_platform_rewrite (LinkedIn → Instagram)
- 1 story_adaptation
- 1 reel_adaptation

All demo data uses realistic NuDaze-style copy (marketing/growth/brand content), not lorem ipsum.

---

## Updated Implementation Order

No change to the 13-step sequence. These guardrails are integrated as follows:

| Guardrail | Integrated Into Step |
|---|---|
| Storage security | Step 1 (bucket creation + RLS) and Step 5 (asset uploads) |
| Semantic validation | Step 7 (post generator), Step 8 (post cards), Step 10 (comments) |
| Background job observability | Step 1 (table creation), then every step that adds background jobs |
| Retention and cleanup | Step 13 (polish phase — cleanup function + retention_settings) |
| Seed data | Step 13 (final step — seed script after all modules built) |

Ready to build on approval.


# Plan: Executive Voice Engine + Content Motive Score™

Two roadmap Stage-2 features, built so they work together: voice profiles feed generation, and every draft gets an objective quality score.

## 1. Executive Voice Engine (Section 13)

Personal voice profiles for executives/leaders, so drafts can be written "as" a specific person — not just the brand.

### Database
- `voice_profiles` table: `id, client_id, name, role_title, linkedin_url, sample_posts (text[]), voice_traits (text[]), topics (text[]), banned_phrases (text[]), pov_statement, is_active, created_by, timestamps`. RLS: tenant-scoped, members read, editors+ write.
- `post_cards.voice_profile_id` (nullable FK) — which voice a draft was written in.

### Edge function `analyze-voice`
- Input: name, role, LinkedIn URL, 3–10 pasted sample posts.
- AI extracts: voice traits, sentence style, signature topics, point-of-view statement, words/phrases to avoid.
- Returns a reviewable draft profile — nothing saves until a human confirms (same pattern as Strategy Builder).

### UI
- New **Voices** tab in Strategy & Rules: list profiles, create/edit via dialog, "Analyze samples" AI assist, activate/archive.
- Post Generator + Campaign Briefs: optional "Write as" voice selector; chosen voice traits injected into the `generate-from-brief` prompt alongside brand voice rules.
- Post cards show a small voice badge (e.g. "as Sarah · CEO") when set.

## 2. Content Motive Score™ (Section 14)

A 0–100 quality score on every draft, shown consistently, feeding Preflight.

### Scoring (shared module `supabase/functions/_shared/motiveScore.ts` + mirrored client helper)
Weighted rubric, computed deterministically + one AI judgment call:
- **Hook strength** (25) — first line specificity vs generic openers
- **Strategic fit** (25) — matches brief objective/pillar/audience when linked
- **Voice fit** (20) — brand voice + executive voice alignment (AI-rated)
- **Platform fit** (15) — length, hashtag count, format conventions per platform
- **Originality** (15) — duplicate-hook / repeated-CTA / repeated-hashtag checks against recent cards

### Integration
- Computed inside `preflight-review` and stored as `motive_score` + `motive_breakdown` (jsonb) on `preflight_reviews`.
- Preflight panel + Posting Package show the score as a labeled dial with the 5 sub-scores expandable.
- Queue cards show a compact score chip; Dashboard "At risk" gains a low-score (<60) flag.
- Score bands: 80+ Strong, 60–79 Workable, <60 Needs work — with one-line "how to improve" hints from the weakest sub-score.

## Order of work
1. Migration: `voice_profiles`, `post_cards.voice_profile_id`, `preflight_reviews.motive_score/breakdown`
2. `analyze-voice` edge function + Voices tab
3. Voice selector in generators + prompt injection
4. Motive Score module + preflight integration + UI surfaces
5. Verify end-to-end: create voice → generate draft as that voice → preflight shows score

## Notes
- No auto-publishing, no schema changes to managed tables; all additive.
- NuDaze demo data untouched; blank copies start with zero voice profiles.

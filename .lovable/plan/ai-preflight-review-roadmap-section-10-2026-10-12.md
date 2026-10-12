# AI Preflight Review (Roadmap Section 10)

An automated quality check that runs on a draft before it moves to approval, so reviewers see problems up front instead of catching them by eye.

## What the team will see

- A **Run preflight** button on every post card (Daily Queue) and inside the edit dialog.
- Preflight runs automatically when a draft is sent to **In Review**.
- A compact **Preflight badge** on each card: Pass, Warnings, or Blocked, with the date it last ran.
- A **Preflight panel** listing each finding with its severity, the exact phrase involved, and a suggested fix.

## What preflight checks

Rule checks (instant, no AI):
- Banned phrases from Strategy and Rules
- Required language missing
- Character limit and hashtag count per platform
- Duplicate hook, CTA, or hashtag set compared with the client's last 30 days of posts
- Missing or uncleared media for visual formats
- Weak source: no linked brief, master content, or source references

AI checks (Lovable AI):
- Brand voice fit against the client's brand voice and platform rules, scored 0-100
- Generic AI phrasing and vague claims
- Claims not supported by the linked brief or sources (flags possible fabrication)
- Story/Reel completeness (full storyboard or script present)

## Severity and workflow

- **Blocking** (banned phrase, over limit, unsupported claim, missing required language): admins cannot approve or mark exported until fixed or explicitly overridden with a reason.
- **Advisory** (voice drift, repetition, generic phrasing): reviewers can acknowledge and continue.
- Overrides and acknowledgements are written to the approval log with who and why.
- Editing the draft marks the last preflight as out of date.
- Preflight never rewrites a draft on its own; suggested fixes are copy-to-apply only.

## Technical details

- New table `preflight_reviews` (client-scoped RLS matching post_cards): post_card_id, draft checksum, overall status, voice score, findings JSON, model, run_by, created_at. Latest row per card is the current result; history is kept.
- New edge function `preflight-review` using the caller's session so tenant RLS applies; runs rule checks in code, then one streamed Lovable AI call (default model) with a strict JSON schema for AI findings; merges results and inserts the review.
- Approval and Posting Package export gates read the latest preflight; stale or blocked results disable approve/export unless overridden.
- Shared `src/lib/preflightRules.ts` for the rule checks, with vitest tests.
- AGENTS.md gets one rule describing the preflight gate.

## Verification

- Unit tests for rule checks.
- Run preflight on real drafts in the queue (one clean, one with a seeded banned phrase), confirm badges, panel, blocking gate, override logging, and stale-after-edit behavior in the running app.

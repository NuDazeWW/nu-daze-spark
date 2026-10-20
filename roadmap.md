# Pricing, scheduled delivery, and usage guardrails (approved 2026-10-18)
- [x] Update listed prices, setup options, brands/seats, X cap, and pricing copy everywhere
- [x] Separate draft/premium clip allowances, rollover, and Enterprise/Surge Pro video gate
- [x] Meter five AI functions and hard-stop with same-view admin-granted add-ons
- [x] Admin-granted add-on ledger and reusable 24-item payment catalog
- [x] Test 3 angles off by default with visible draft cost
- [x] Five-minute staged scheduled delivery job, Jobs view, inactive dispatch function
- [x] Daily digest at 08:00 UTC, Demo environment indicator
- [x] Notification-only 60% progress and 80%-in-24-hours velocity alerts
- [x] Tests, browser checks, project guidance
- [ ] Outside this build: platform app approvals, usage limits, 30-day cost measurement


# Combined build: navigation, non-profit, legal gate, copy (approved 2026-10-19)
- [x] Spark Start non-profit display (annual $159, note) everywhere; catalog corrected to 22 items
- [x] Non-profit form: country routing, IRS lookup US only, ProPublica attribution, CRA search + copy
- [x] Admin review queue + permanent decision log
- [x] Yearly re-check scheduled job (nonprofit-annual-recheck, daily 06:00 UTC)
- [x] Back button + breadcrumbs + clickable side-menu pop-out rows
- [x] Legal acceptance at sign-up and re-acceptance, new legal pages, subprocessors (ProPublica, IRS)
- [x] Copy cleanup (Upload → Add/Import, unlimited → real limit wording)
- [x] Outside-the-app checklist document with links and steps
- [ ] Outside the app: attorney review, legal contacts, DMCA agent, ProPublica terms, email domain, Stripe live products (NuDaze)

# Corrective update — consolidated brief (approved 2026-10-20)
- [ ] Finish uploaded continuation safeguards: authoritative delivery/readiness, confirmation provenance, usage isolation regression tests, and evidence-backed 12-check report; no real publishing or notifications
- [x] Shared hashtag formatting (one "#", no repeats) used in drawer, cards, exports, calendar, dashboard
- [x] Shared readiness answer (`src/lib/readiness.ts`) in the Posting Package drawer; SM-0019 "Preflight cleared" mismatch fixed
- [x] Honest staging wording: "Stage for delivery", "Staged — not sent"; past-time schedule rejected
- [x] Drawer: Schedule opens drawer's Publish tab, checksum hidden, Mark as posted always available with link check, tabs scroll
- [x] Approved Content "Publish / Schedule" opens drawer at Publish
- [x] Preflight wording (Revise draft with AI, Acknowledge warnings and continue)
- [x] Side menu groups, pipeline names, Back links only on sub-pages, Account Tags hint
- [x] Comment labels, generate buttons without "(0)", Publishing Status empty states
- [x] Reporting connector tones, hover, focus
- [x] Find Ideas root cause fixed (usage metering update lacked WHERE; also affected every AI action)
- [ ] Per-channel delivery_operations/attempts tables with stable idempotency key + server-side readiness gate
- [ ] Comments: Mark as commented confirmation_source + timezone-aware dedupe counting
- [ ] Drawer visual redesign (dark header, tinted cards, fixed bottom bar); draft state store across Sheet close
- [ ] Use readiness evaluator on cards, queue, review, dashboard
- [ ] Three sample Publishing Status records; Content Planner dark header; Repurpose card redesign; demo badge removal; US-English sweep
- [ ] Full 12-check browser verification at 887px and 1440px

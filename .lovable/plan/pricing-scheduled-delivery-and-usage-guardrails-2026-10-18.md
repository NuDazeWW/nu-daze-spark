# Pricing, scheduled delivery, and usage guardrails

## Decisions applied
- Use the exact listed dollar amounts; describe discounts as 20%, 40%, and 25%.
- Force Enterprise includes 50 draft and 10 premium video clips monthly; Surge Pro includes 10 draft clips; Spark Start and Team Flow include none.
- Draft and premium clip packs are available on all tiers.
- Scheduled processing runs every five minutes inside the database, exits immediately when nothing is due, and makes no platform calls.
- The 20% pause rule is replaced with two notification-only alerts: a progress alert when 60% of the monthly allowance is used, and a velocity alert when 80% of the monthly allowance is used within 24 hours. Spending stops only at 100%.
- AI models remain unchanged.

## 1. Pricing
Update current plan definitions and every visible price location: pricing page, plan cards, upgrade prompts, comparison tables, billing pages, invoice/report templates, and non-profit toggle copy.

| Tier | Monthly | Annual/mo | Annual billed | Non-profit annual/mo | Non-profit billed | Setup | Non-profit setup | Brands | Seats |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Spark Start | $199 | $159 | $1,908 | $95 | $1,140 | $1,499 | $1,124 | 1 | 1 |
| Team Flow | $349 | $279 | $3,348 | $167 | $2,004 | $1,795 | $1,346 | 3 | 3 |
| Surge Pro | $499 | $399 | $4,788 | $239 | $2,868 | $2,250 | $1,687 | 5 | 5 |
| Force Enterprise | $1,299 | $1,039 | $12,468 | $623 | $7,476 | $4,499 | $3,374 | 14 | 14 |

- Non-profit pricing is annual only; monthly billing is unavailable.
- Non-profit setup offers two choices: white-glove setup at 25% off ($1,124 / $1,346 / $1,687 / $3,374), or self-guided setup at 50% off ($750 / $898 / $1,125 / $2,250).
- Copy explains that the subscription discount reflects the mission-driven buyer, while setup covers configuration, connector wiring, account setup, strategy import, and training.
- Surge Pro remains highlighted and the "Annual - save 20%" badge remains.
- Force Enterprise X allowance increases from $50 to $150.
- New prices apply to everyone; no grandfathering or new plan-version logic is added.

## 2. Separate video allowance and add-ons
- Track draft clips and premium clips separately from media credits.
- Draft clips: 4-6 seconds, vertical, 720p. Premium clips: 1080p.
- Restrict video generation to Surge Pro, Force Enterprise, or purchased clip packs.
- Block generation at zero remaining clips and show the relevant pack in the same view.
- Add-on packs: 10 draft clips for $19; 10 premium clips for $39.
- Included clips are granted monthly, including on annual billing, and roll over for one billing month only: Surge Pro holds at most 20 draft clips; Force Enterprise holds at most 100 draft and 20 premium clips.
- Purchased clip packs remain valid for 12 months.
- Copy will state that Force Enterprise includes 10 premium 1080p clips monthly and premium packs are available on all four tiers.
- Pricing copy will state: "Media credits are for images only; video uses separate clip allowances."

## 3. AI usage limits and top-ups
Charge AI drafts before these actions run:

| Action | Drafts |
| --- | ---: |
| Preflight review | 1 |
| Preflight rewrite | 1 |
| Repurpose ideas | 1 |
| Voice analysis | 5 |
| Brand strategy extraction | 5 |

- Usage is blocked at the allowance; the same view offers the matching add-on as an admin-granted request.
- Launch add-ons are granted manually by owners/admins from the admin panel; no self-serve payment checkout is enabled.
- Add-ons: 100 media credits for $4; 100 AI drafts for $2; 10 draft clips for $19; 10 premium clips for $39.
- Every grant is recorded once in an audit ledger; repeated submissions cannot grant twice.
- Define the reusable 24-item payment catalog: 12 subscriptions, 8 setup fees, and 4 add-ons. Self-serve payment remains disabled per instance until that instance's payments are confirmed.

## 4. Test 3 angles
- Default the toggle to off.
- Before generation, show the actual draft cost, for example 9 drafts instead of 3 for three channels.

## 5. Scheduled publishing
Every five minutes, the database will:
1. Exit immediately when no scheduled posts are due.
2. Claim up to 25 due posts safely so overlapping runs cannot process the same post.
3. Create one result per target channel.
4. Mark disconnected channels "skipped", not "failed".
5. Mark processed posts published with a delivery timestamp.
6. Record run history and counts in a visible Jobs view.

No platform API calls are made. For later approved client apps, include an inactive authenticated dispatch function and document the handoff path.

## 6. Notifications and demo environment
- Change the daily digest schedule from hourly to daily at 08:00 UTC.
- Add a visible environment indicator showing whether the instance is Demo.

## Verification
- Add tests for each listed price, discount display, video allowance, draft charge, top-up bundle, both alert thresholds, and 25-post run cap.
- Confirm overspending is blocked at 100% and no pause occurs below 100%.
- Confirm a scheduled post moves to Published and appears in Publishing Status without platform calls.
- Check desktop and mobile pricing screenshots for accurate prices and no overflow.

## Technical details
- Update current tier definitions in place, add separate clip balances, and use audited payment fulfillment.
- Use a security-definer, row-locked batch function with SKIP LOCKED and idempotent channel results.
- Use pg_cron for both the five-minute staged job and digest schedule.
- Add migrations without breaking existing columns.
- Record durable billing, video allowance, and scheduled-processing decisions in project guidance.

## Force Enterprise video budget
Recorded usage contains no video generations, so these are planning estimates using your assumed 1.5-3.5 credits per clip:

| Included clips | Video credits/mo | With ~43-credit base | Over 100-credit plan |
| --- | ---: | ---: | ---: |
| 50 draft + 10 premium | 90-210 | 133-253 | 33-153 |
| 25 draft + 5 premium | 45-105 | 88-148 | 0-48 |

Decision: keep 50 draft + 10 premium clips for Force Enterprise; do not substitute 25 + 5.

## Launch checklist outside this build
- Start platform app approvals with Meta, Instagram, and LinkedIn.
- Set each sold instance's Run usage limit and blocking threshold in workspace usage settings.
- Confirm the included Cloud allowance applies per workspace on the selected plan.
- Measure the first live instance for 30 days before setting later thresholds.
- Measure actual cost per clip over the first 30 days of live use; above 3 credits per clip, raise the draft pack from $19 to $24 and revisit included counts.

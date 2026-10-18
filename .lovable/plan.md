# Pricing, scheduled delivery, and usage guardrails

## Decisions applied
- Use the exact listed dollar amounts; describe discounts as 20%, 40%, and 25%.
- Force Enterprise includes 50 draft and 10 premium video clips monthly; Surge Pro includes 10 draft clips; Spark Start and Team Flow include none.
- Draft and premium clip packs are available on all tiers.
- Scheduled processing runs every five minutes inside the database, exits immediately when nothing is due, and makes no platform calls.
- The 20% pause rule is replaced with notifications only at 60% and 80% of monthly allowance within 24 hours; spending stops only at 100%.
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
- Surge Pro remains highlighted and the "Annual - save 20%" badge remains.
- Force Enterprise X allowance increases from $50 to $150.
- Existing subscribers stay on their current plan version until renewal.

## 2. Separate video allowance and add-ons
- Track draft clips and premium clips separately from media credits.
- Draft clips: 4-6 seconds, vertical, 720p. Premium clips: 1080p.
- Restrict video generation to Surge Pro, Force Enterprise, or purchased clip packs.
- Block generation at zero remaining clips and show the relevant pack in the same view.
- Add-on packs: 10 draft clips for $19; 10 premium clips for $39.
- Copy will state that Force Enterprise includes 10 premium 1080p clips monthly and premium packs are available on all four tiers.

## 3. AI usage limits and top-ups
Charge AI drafts before these actions run:

| Action | Drafts |
| --- | ---: |
| Preflight review | 1 |
| Preflight rewrite | 1 |
| Repurpose ideas | 1 |
| Voice analysis | 5 |
| Brand strategy extraction | 5 |

- Usage is blocked at the allowance with the matching top-up shown in the same view.
- Top-ups: 100 media credits for $4; 100 AI drafts for $2.
- Verify that each purchase grants the correct balance once only.
- Hosted payment availability will be reported as unverified unless payment configuration can be confirmed.

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
- Add tests for each listed price, discount display, video allowance, draft charge, top-up bundle, alert threshold, and 25-post run cap.
- Confirm overspending is blocked at 100% and no pause occurs below 100%.
- Confirm a scheduled post moves to Published and appears in Publishing Status without platform calls.
- Check desktop and mobile pricing screenshots for accurate prices and no overflow.

## Technical details
- Use new tier versions, separate clip balances, and audited payment fulfillment.
- Use a security-definer, row-locked batch function with SKIP LOCKED and idempotent channel results.
- Use pg_cron for both the five-minute staged job and digest schedule.
- Add migrations without breaking existing columns.
- Record durable billing, video allowance, and scheduled-processing decisions in project guidance.

## Budget note
Current recorded usage contains no video generations, so Force Enterprise video spend remains unmeasured. Using your assumed 1.5-3.5 credits per clip, 60 included clips imply about 90-210 video credits monthly before other usage.

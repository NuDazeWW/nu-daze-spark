# Publishing build — consolidated status (Oct 2026)

## Done
- Publish composer: channel picker, scheduling, time zone, AI disclosure, media attach (simulated sends on demo instance)
- Publishing Status page: Upcoming / Published / Failed views, per-channel status, X spend vs cap
- Per-attempt history (`publish_attempts`), sequential SM-NNNN tracking across screens
- Connections: multiple accounts per client, token storage service-role only
- Preflight + approval gates before export/publish; bulk export (ZIP/CSV/JSON)
- Notification email: daily digest, post-went-out, weekly summary (Mondays)
- Results tracking: manual results logging per posted post, history, feeds weekly summary
- Feedback learning: revision notes + best-performing results injected into new drafts
- Per-copy web address field, DNS check and handover steps; email links follow it

## Not done (blocked)
- Live platform sending (Meta, LinkedIn, X): needs approved platform developer apps and real OAuth
- Dispatcher + automatic retries for scheduled sends: depends on live sending
- Automatic results import from platform APIs: depends on live OAuth (manual logging covers it now)
- Live Stripe billing: needs the workspace's Stripe account
- AI video via third-party tools
- TikTok, Pinterest, Threads: "Notify me" only

## Next up
1. Stripe test mode for demo checkout
2. LinkedIn live OAuth + sending, then Meta, then X
3. Scheduled dispatcher with retries and failure alerts
4. Auto-import results once OAuth is live

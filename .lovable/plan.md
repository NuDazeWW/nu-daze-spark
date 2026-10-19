# Combined build: navigation, non-profit verification, legal gate, copy cleanup

Prices, allowances, discounts and setup fees stay as they are. The one approved change: Spark Start no longer gets non-profit pricing.

## A. Navigation (from the earlier plan)
- Every row in the side-menu pop-outs becomes clickable and opens the page, tab, section or dialog it describes (today most rows are plain text).
- A "Back to <previous page>" button on every page. If you opened the page directly, it goes to the page's parent (Email Provider → Setup, Setup → Dashboard). Nested pages also get a breadcrumb such as "Setup / Email Provider".
- Pages with their own header (Executive Review, User Guide, Pricing, legal pages, 404) get the same Back button.
- Test: click every side-menu link and pop-out row while signed in. I'll report each link, where it goes, and whether it worked.

## B. Copy cleanup
- Replace "Upload" in all on-screen text with "Add", "Import" or "Ingest". That covers buttons, empty states, errors, tooltips, alt text and emails.
- Replace leverage/orchestrate/paradigm with plain verbs. Replace seamless/robust/best-in-class with a specific outcome. "Fully automated" becomes "scheduled, with manual handoff available". "Unlimited" becomes the real allowance.
- I'll report every change, plus anything left alone because it isn't on-screen text (for example the banned-word list in Guardrails, which has to keep those words to catch them).

## C. Non-profit verification
- **Eligibility:** US 501(c)(3) organizations and Canadian registered charities, annual billing only. Spark Start shows no non-profit price anywhere: not on its card, the toggle, the comparison table, checkout, upgrades or downgrades. The non-profit prices are Team Flow $167, Surge Pro $239 and Force Enterprise $623 a month, billed annually.
- **Application form** (replaces the current panel): legal name exactly as it appears on the IRS letter, EIN, address, contact name and email, the documents, and a consent box for storing them. The form lists the accepted documents:
  - Required: IRS determination letter and EIN letter (CP 575 or 147c)
  - Supporting: latest Form 990, 990-EZ or 990-N
  - Optional: state charity registration or certificate of good standing
  - Canada: CRA registration number and latest T3010
  - Other countries: equivalent documents, sent to manual review
- **Live IRS check:** the moment the applicant enters their EIN, we look it up in ProPublica's free non-profit database, which uses IRS data. Nothing from the IRS is stored in the app.
  - Match (501(c)(3) code, plus matching name and state): shows "Verified against IRS records" and moves to document review.
  - Miss, error or timeout: goes to manual review. The applicant is never blocked, because small non-profits that file only the 990-N often aren't in the database.
- **Admin review queue:** approve, reject with a reason, or ask for more information. The reviewer gets an IRS search link with the EIN already filled in. Every decision is recorded permanently and can't be edited: reviewer, time, outcome, IRS check result, matched name, source, and the plan applied.
- **Pricing changes only after approval.** Until then the screen plainly says the account is on standard pricing. Approved plans show a "Verified 501(c)(3)" badge.
- **Yearly re-check:** the same lookup runs again each year, with a notice before verification expires. If verification lapses, the organization returns to standard pricing after written notice and a grace period.
- **Documents:** stored privately and only admins can see them. They're kept while the organization subscribes plus 1 year; the decision record is kept 7 years. Both periods are stated in the privacy policy and on the form.

## D. Legal acceptance at sign-up
- One scrolling box shows all four documents: Terms of Service, Privacy Policy, Acceptable Use Policy and Cookie Notice, each with its own link. "Create account" stays disabled until the applicant has scrolled to the end and checked the box.
- Marketing email and SMS consent are separate, optional boxes that don't block sign-up.
- We record the version accepted, the time, and the browser and device. When a document changes materially, users accept it again at their next sign-in, and their earlier acceptance stays on record.
- I'll draft or extend all four documents to cover everything in the brief. Each gets a version number and effective date, and all of them are labelled **"Draft — pending legal review."**
- Every page footer links to the four documents with their version and date.

## E. Other text and pages
- Before any checkout: a billing authorization stating the plan renews automatically, how often, and for how much. A 30-day notice before any price change.
- An "AI-assisted" label option in the publishing composer.
- A cookie banner with opt-out, but only if we find non-essential cookies (I'll check first).
- A delete-account option that explains the retention period.
- New pages for the DMCA notice, security contact, accessibility statement and list of outside services (subprocessors).
- The verification notice next to the non-profit form. The "Demo environment" badge stays on, and I'll check its wording is accurate.

## F. What NuDaze must do outside the app (I'll deliver this as a list; I won't file or register anything)
- Hire an attorney to review all four legal documents and the non-profit terms
- Decide governing state and county, a mailing address, and legal, privacy and security contact emails (these show as placeholders until you provide them)
- Register a DMCA agent with the US Copyright Office
- Verify a sending domain for email
- Set up live payment products in Stripe

## Technical details
- Navigation: `NAV_HOVER_LISTS` rows get `to` (tab params, `#anchors` with scroll-on-load, `?open=` dialog flags); a shared `BackLink` in `PageHeader` uses `location.state.from`, else a single `PARENT_ROUTE` map.
- Non-profit: extend the existing `nonprofit_applications` table with new nullable columns (EIN, matched name, corroboration JSON, decision fields, expiry). Add a new append-only `nonprofit_decision_log` with insert-only RLS and a decision RPC; the existing `review_nonprofit_application` is kept and reused. Add a new edge function, `verify-nonprofit`, that calls the ProPublica v2 organization endpoint with a timeout and stores only the result. Add a private storage bucket that only admins can read. Pricing, checkout and entitlements gain an `isNonprofitEligible(tier)` check that excludes spark_start, covered by unit tests in `pricing.test.ts`.
- Legal: add a `legal_acceptances` table (version, accepted_at, IP, user agent, doc) and a version constant per document; the sign-in check compares the current version with the latest accepted one.
- AI label: a new nullable `ai_assisted` column on `post_cards`.

## G. Additions (non-profit verification and related)

**1. Spark Start in the non-profit view.** With the non-profit toggle on, Spark Start's card always shows the annual price, $159 a month billed $1,908 a year. The non-profit view is annual only, so the $199 monthly price can't be bought there. The card adds one line: "Non-profit pricing starts at Team Flow." It never shows a blank or a dash. The same treatment applies wherever a non-profit price doesn't exist: the comparison table, checkout, and upgrade and downgrade screens.

**2. No IRS check outside the US.** The form asks for the country first. US applicants get the live IRS check. Canadian applicants enter their CRA registration number and add their latest T3010; other countries add equivalent documents. Both go straight to manual review with no lookup and no "not found" message. The screen says "Manual review — CRA documents" or "Manual review — international documents". The admin queue shows the same label, plus a link to the CRA charity search for Canadian applicants. During the build I'll check whether that search accepts a pre-filled registration number. If it does, the link fills it in. If it doesn't, the link opens the search page and the number appears beside it with a Copy button so the reviewer can paste it in.

**3. ProPublica terms and credit.**
- Before going live, NuDaze agrees to ProPublica's Data Store terms (see F).
- Wherever a check result appears (applicant screen, admin queue, decision record), it shows: "Source: ProPublica Nonprofit Explorer, using IRS Form 990 and Exempt Organization data", with ProPublica's citation text and a link to the organization's ProPublica page. The citation is saved on the decision record.
- The outside services page lists ProPublica (non-profit lookup) and the IRS (original data source), with what is sent (the EIN only) and what is kept (the match result and citation).
- The attorney checklist gets an extra item: confirm that the ProPublica terms allow use in a commercial product, and confirm the attribution wording.

**4. Outside-the-app list with links and steps.** Section F is delivered as a checklist document. Each item has a direct link and numbered steps:
- Attorney review: what to send (the four documents, the non-profit terms, the ProPublica terms), and the questions to ask.
- Governing law, address and contacts: the exact fields to fill in, and where to send them to me.
- DMCA agent: https://dmca.copyright.gov/osp/ — create an account, register NuDaze as a service provider, name the agent, pay the $6 fee, renew every 3 years, then send me the agent details for the DMCA page.
- ProPublica terms: https://www.propublica.org/about/propublica-data-terms-of-use — read the Data Terms of Use, agree to them for API use, and keep a dated copy of that page. The attorney checklist uses the same link. (The Data Store terms cover ProPublica's paid data marketplace, which is a separate product.)
- Email sending domain: how to verify your domain in Lovable's email settings and which DNS records to add at your domain host.
- Stripe live products: https://dashboard.stripe.com/products — create each product and price from the payment catalog, turn on live mode, then send me the confirmation so self-serve checkout can be turned on. The catalog has 24 items as the app builds it today: 12 plan prices (4 plans, each monthly, annual and non-profit annual), 8 setup fees (4 plans, each standard and non-profit) and 4 add-on packs. Any document that says 28, including the operational guide, will be corrected to 24 with this breakdown.
- Lovable settings for sold copies: the usage limit, with blocking on.
I'll check every link is live before I hand the list over.

**5. A real scheduled job for the yearly re-check.** A new scheduled job, `nonprofit-annual-recheck`, runs every day at 06:00 UTC. It looks for approved organizations within 30 days of their verification anniversary.
- US organizations: it runs the IRS lookup again. A match extends verification for one more year. A miss sends the organization to manual review and emails the admins.
- Canadian and other organizations: they're sent to manual review with a request for current documents.
- 30 days before expiry, and again at 7 days, the organization gets an email notice. On expiry it gets a 30-day grace period, and after that it returns to standard pricing with written notice.
- Each run is recorded in the run history (how many checked, extended or sent to review). When I report back, I'll name the job and its schedule and show its first logged run.

### Technical details (additions)
- `nonprofitDisplay(tier, billing)` helper in `src/lib/pricing.ts` returns `{ price, note }`. When the non-profit state is active it forces annual pricing, whatever the billing parameter says. spark_start returns $159/mo billed $1,908/yr plus the note. It's used on the cards, in the comparison table, at checkout and in upgrade/downgrade screens. Unit tests in `pricing.test.ts` cover: spark_start with monthly billing still returns $159, and `paymentCatalog()` returns exactly 24 items.
- `nonprofit_applications.country`. `verify-nonprofit` returns `skipped_non_us` without calling ProPublica when the country isn't US. It saves `source_citation` and `source_url` in the corroboration JSON.
- The `nonprofit-annual-recheck` edge function uses `authenticateCronRequest`, with the schedule created through the managed HTTP schedule tools (`0 6 * * *`). If those tools aren't available in this project, a pg_cron SQL job does the database work and calls the lookup through the existing function. New columns: `verified_until`, `grace_until`, `last_recheck_at`. Runs are logged in a `nonprofit_recheck_runs` table (admin-read RLS, grants included).

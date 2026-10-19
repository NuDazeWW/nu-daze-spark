import { ADDONS, nonprofitDisplay, isNonprofitEligible } from "@/lib/pricing";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowRight, Building2, Check, ChevronDown, Crown, HeartHandshake, Info, Waves, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import headerBirdUrl from "@/assets/brand/socialmotive-header-bird.png";
import socialMotiveLogo from "@/assets/socialmotive-logo.jpg";
import { cn } from "@/lib/utils";
import { fmtUsd, useTierDefinitions, type TierDefinition } from "@/hooks/useBilling";
import { useAuth } from "@/hooks/useAuth";
import { NonprofitIntakeDialog } from "@/components/billing/NonprofitIntakeDialog";

const AUDIENCE: Record<string, string> = {
  starter: "One person running one brand",
  team: "Small teams sharing a few brands",
  pro: "Growing teams across five brands",
  enterprise: "Agencies and multi-brand organizations",
};
const CHANNELS: Record<string, string> = {
  starter: "LinkedIn and Instagram Feed",
  team: "Facebook, LinkedIn, X, Instagram Feed and Reels",
  pro: "Facebook, LinkedIn, X, Instagram Feed and Reels",
  enterprise: "Every channel, plus YouTube and TikTok (when available)",
};
const EXTRAS: Record<string, string[]> = {
  starter: ["AI Post Generator", "Daily queue, planner and Preflight", "Comment drafting", "Asset library", "Brand & Strategy Studio", "Post to quick links"],
  team: ["Everything in Spark Start", "Repurpose / Repost Center", "Motive Media Studio and brand kit", "Split one post across platforms", "Campaign brief approvals", "Google Drive, OneDrive and SharePoint folders", "Post results tracking"],
  pro: ["Everything in Team Flow", "Executive voice profiles", "Content Motive Score™", "Learns from your feedback", "Portfolio insights and bulk export", "Downloadable publishing reports"],
  enterprise: ["Everything in Surge Pro", "Executive review mode", "Reporting tool connectors", "Your own email sender and domain", "Scheduled email summaries", "Invoice billing"],
};
const EXPLAIN: Record<string, string> = {
  "Daily queue, planner and Preflight": "Plan posts on a calendar, work through today's list, and get an automatic check for banned words, weak openings and length limits before anything is approved.",
  "Comment drafting": "Drafts thoughtful comments on other people's industry posts, using who wrote them and what they're about.",
  "Asset library": "One home for your photos, videos and documents, with clear rules on what the AI may use.",
  "Brand & Strategy Studio": "Your logo, colors, fonts, tone of voice and posting rules in one place, so every draft stays on brand.",
  "Post to quick links": "One click opens the right LinkedIn, Instagram or other page so you can paste the finished post.",
  "Motive Media Studio and brand kit": "Create on-brand images inside the app, with your logo added as a watermark.",
  "Split one post across platforms": "Turn one strong post into versions written for LinkedIn, Instagram, Facebook and X.",
  "Campaign brief approvals": "Send a brief to a named approver, discuss it in one comment thread, and only create posts once it's approved.",
  "Google Drive, OneDrive and SharePoint folders": "Browse your existing company folders in Google Drive, OneDrive or SharePoint so drafts can quote real documents, with the source shown.",
  "AI Post Generator": "Turns your approved assets, briefs and strategy into ready-to-edit post drafts for each platform, with sources shown.",
  "Repurpose / Repost Center": "Turn approved posts into reposts, quote excerpts, Story and Reel adaptations, and LinkedIn-to-Instagram rewrites.",
  "Post results tracking": "Log views, reactions, comments and clicks for each post to see what works.",
  "Executive voice profiles": "Learns how a specific leader writes from real samples, so their posts sound like them.",
  "Content Motive Score™": "A 0–100 score for each draft covering its opening, strategy, platform fit and originality.",
  "Learns from your feedback": "Reviewer notes and your best-performing posts shape future drafts automatically.",
  "Portfolio insights and bulk export": "Compare brands side by side and download approved posts and media in one package.",
  "Downloadable publishing reports": "A PDF or spreadsheet of what was posted, where, and how it performed.",
  "AI video clips": "Generate short video clips for Reels and Stories.",
  "Executive review mode": "A clean view for leaders to review and approve a week of content at once.",
  "Reporting tool connectors": "Send your posting numbers to Tableau, Power BI, SAP, Sigma or QuickSight.",
  "Your own email sender and domain": "Alerts come from your own email account, and the app lives at your own web address.",
  "Scheduled email summaries": "Weekly or monthly summary emails of what was approved, posted and how it did.",
  "Invoice billing": "Pay by invoice instead of card.",
  "media credits": "Media credits are for images only; video uses separate clip allowances.",
  "draft clips": "4-6 second vertical 720p AI video clips. Unused included clips roll over one month.",
  "premium 1080p": "Premium 1080p AI video clips. Included on Force Enterprise at 10 per month; available as an add-on pack on all four tiers.",
  "AI drafts": "How many AI-written post drafts your team can save each month.",
  "direct posts": "Posts sent straight to a social account from the app, once accounts are connected.",
};
const explainFor = (x: string) => EXPLAIN[x] ?? Object.entries(EXPLAIN).find(([k]) => x.includes(k))?.[1];

function FeatureLine({ text }: { text: string }) {
  const tip = explainFor(text);
  if (!tip) return <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{text}</li>;
  return (
    <li>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="sm-feature-line group flex w-full gap-2 rounded text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`More about ${text}`}>
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 break-words">{text}</span>
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-64 text-sm"><p className="font-semibold">{text}</p><p className="mt-1 text-muted-foreground">{tip}</p></PopoverContent>
      </Popover>
    </li>
  );
}
const TIER_ICON: Record<string, typeof Zap> = { starter: Zap, team: Waves, pro: Crown, enterprise: Building2 };
const SCOPE: Record<string, string[]> = {
  starter: ["Dedicated instance and DNS", "1 brand profile, 1 voice", "25 assets + 1 import", "LinkedIn and IG Feed setup", "45-minute handoff"],
  team: ["Dedicated instance and DNS", "3 brand profiles, 1 voice", "60 assets + 1 import", "Meta, LinkedIn, X and IG setup", "60-minute session + 7-day hypercare"],
  pro: ["Custom subdomain and SSL", "5 brand profiles, 3 executive voices", "100 assets + cloud sync", "Meta, LinkedIn, X and IG setup", "90-minute session + 14-day hypercare"],
  enterprise: ["Dedicated domain and branding", "14 brand profiles, bespoke tuning", "500 assets + SharePoint/Drive", "All channels incl. YouTube", "2 workshops + 30-day priority channel"],
};

export default function Pricing() {
  const [params, setParams] = useSearchParams();
  const nonprofit = params.get("nonprofit") === "true";
  const billing = nonprofit ? "annual" : params.get("billing") === "monthly" ? "monthly" : "annual";
  const tiers = useTierDefinitions();
  const { user } = useAuth();
  const nav = useNavigate();
  const [intake, setIntake] = useState(false);

  useEffect(() => { document.title = "Pricing — SocialMotive"; }, []);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null) next.delete(k); else next.set(k, v);
    if (k === "nonprofit" && v === "true") next.set("billing", "annual");
    setParams(next, { replace: true });
  };

  const choose = (t: TierDefinition) => {
    const q = `tier=${t.tier_slug}&billing=${billing}${nonprofit && isNonprofitEligible(t.tier_slug) ? "&nonprofit=true" : ""}`;
    if (t.tier_slug === "enterprise") return (window.location.href = "mailto:hello@nudaze.com?subject=SocialMotive%20Force%20Enterprise");
    nav(user ? `/settings/billing?${q}` : `/auth?next=${encodeURIComponent(`/settings/billing?${q}`)}`);
  };

  return (
    <div className="sm-pricing min-h-screen bg-background text-foreground">
      <header className="sm-pricing-header border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="SocialMotive home"><img src={socialMotiveLogo} alt="SocialMotive" className="h-9 w-auto rounded-md" /></Link>
          <Button variant="outline" size="sm" asChild><Link to={user ? "/" : "/auth"}>{user ? "Back to workspace" : "Sign in"}</Link></Button>
        </div>
      </header>

      <section className="sm-pricing-intro relative mx-auto max-w-7xl px-6 pb-10 pt-14 text-center">
        <img src={headerBirdUrl} alt="" aria-hidden className="sm-pricing-bird pointer-events-none absolute -right-2 -top-6 hidden w-52 select-none lg:block" />
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Plans that grow with your content team</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Every plan includes your own private workspace, human review on every post, and a live usage meter so there are never surprise charges.</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <div className="sm-billing-toggle inline-flex items-center gap-1 rounded-full border p-1" role="radiogroup" aria-label="Billing period">
          {(["monthly", "annual"] as const).map((b) => (
            <Button key={b} role="radio" aria-checked={billing === b} disabled={nonprofit && b === "monthly"}
              variant="ghost" size="sm" onClick={() => setParam("billing", b)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                billing === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {b === "monthly" ? "Monthly" : "Annual · save 20%"}
            </Button>
          ))}
        </div>
          <Button variant="outline" size="sm" className="whitespace-nowrap rounded-full" asChild>
            <a href="mailto:hello@nudaze.com?subject=SocialMotive%20custom%20pricing">Contact us for custom pricing</a>
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <HeartHandshake className="h-4 w-4 text-primary" />
          <label htmlFor="np" className="cursor-pointer">Non-profit program — 40% off annual plans</label>
          <Switch id="np" checked={nonprofit} onCheckedChange={(v) => setParam("nonprofit", v ? "true" : null)} />
        </div>
        {nonprofit && <p className="mt-2 text-xs text-muted-foreground">The non-profit program is annual only, so monthly billing is turned off. Prices apply once your 501(c)(3) or Canadian registered charity status is verified. Non-profit pricing starts at Team Flow. The subscription discount reflects your mission. Setup covers the work we do — configuration, connector wiring, social account setup, strategy import and team training — so white-glove setup is 25% off, or choose self-guided setup at 50% off and configure your own brand, connectors and accounts with our orientation guide.</p>}
      </section>

      <section className="sm-price-grid mx-auto grid items-stretch gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
        {(tiers.data ?? []).map((t) => {
          const hero = t.tier_slug === "pro";
          const disp = nonprofitDisplay(t, billing, nonprofit);
          const perMonth = disp.perMonthCents;
          const npApplies = disp.nonprofitApplied;
          const fee = npApplies ? t.nonprofit_implementation_fee_cents : t.implementation_fee_cents;
          const a = t.allowances;
          return (
            <article key={t.id} data-tier={t.tier_slug} className={cn("sm-price-card flex flex-col rounded-xl border bg-card p-6 text-card-foreground",
              hero && "sm-price-card-featured border-2 border-primary shadow-lg lg:-my-3 lg:py-9")}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="sm-tier-icon flex h-10 w-10 items-center justify-center rounded-lg">
                    {(() => { const Icon = TIER_ICON[t.tier_slug] ?? Zap; return <Icon className="h-5 w-5" />; })()}
                  </span>
                  <h2 className="font-display text-xl font-semibold whitespace-nowrap">{t.name}</h2>
                </div>
                {hero && <Badge className="shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[11px]">Most popular</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{AUDIENCE[t.tier_slug]}</p>
              <p className="mt-5"><span className="font-display text-4xl font-semibold">{fmtUsd(perMonth)}</span><span className="text-sm text-muted-foreground"> / month</span></p>
              <p className="text-xs text-muted-foreground">
                {disp.billedYearlyCents ? `Billed ${fmtUsd(disp.billedYearlyCents)} yearly` : "Billed monthly"}
                {!nonprofit && billing === "annual" && ` · ${fmtUsd(t.monthly_price_cents)} month-to-month`}
              </p>
              {disp.note && <p className="mt-1 text-xs font-medium text-foreground">{disp.note}</p>}
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{fmtUsd(Math.round(perMonth / a.seats), 2)} per seat</p>

              <ul className="mt-5 space-y-1.5 text-sm">
                {[`${a.brands} brand${a.brands > 1 ? "s" : ""} · ${a.seats} seat${a.seats > 1 ? "s" : ""}`, `${a.dispatches.toLocaleString()} direct posts / month`,
                  `${a.media_credits.toLocaleString()} media credits (images only)`, `${a.text_drafts.toLocaleString()} AI drafts / month`,
                  ...((a.video_draft_clips ?? 0) > 0 ? [`${a.video_draft_clips} draft clips / month`] : []),
                  ...((a.video_premium_clips ?? 0) > 0 ? [`${a.video_premium_clips} premium 1080p clips / month`] : []),
                  a.x_cap_cents ? `X posting up to ${fmtUsd(a.x_cap_cents)} / month` : "X not included", `${a.storage_gb} GB storage`, CHANNELS[t.tier_slug], ...EXTRAS[t.tier_slug]]
                  .map((x) => <FeatureLine key={x} text={x} />)}
              </ul>

              <div className="mt-auto pt-6">
                <Collapsible className="rounded-lg border p-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{npApplies ? "White-glove setup" : "One-time setup"}</span>
                    <span className="font-display font-semibold">{fmtUsd(fee)}</span>
                  </div>
                  {npApplies && a.self_guided_setup_cents ? (
                    <div className="mt-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium">Self-guided setup</span>
                      <span className="font-display font-semibold">{fmtUsd(a.self_guided_setup_cents)}</span>
                    </div>
                  ) : null}
                  <CollapsibleTrigger className="mt-1 flex items-center gap-1 text-xs text-primary">What's included <ChevronDown className="h-3 w-3" /></CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{SCOPE[t.tier_slug].map((s) => <li key={s}>• {s}</li>)}</ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">Extra scope: {fmtUsd(a.overage_hourly_cents)} / hour</p>
                  </CollapsibleContent>
                </Collapsible>
                <Button className="sm-tier-cta mt-4 w-full" size="lg" variant="outline" onClick={() => choose(t)}>
                  {t.tier_slug === "enterprise" ? "Talk to us" : `Start with ${t.name}`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="sm-usage-card mx-auto mt-10 max-w-7xl rounded-xl border bg-card p-6 lg:mx-6 xl:mx-auto">
        <h3 className="font-display text-lg font-semibold">Add-on packs</h3>
        <p className="mt-1 text-sm text-muted-foreground">Available on every plan. Media credits are for images only; video uses separate clip allowances. Clip packs stay valid for 12 months.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(ADDONS).map((x) => (
            <li key={x.label} className="rounded-lg border p-3 text-sm"><p className="font-medium">{x.label}</p><p className="font-display text-xl font-semibold">{fmtUsd(x.price_cents)}</p></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Premium 1080p clips are included on Force Enterprise at 10 per month and available as an add-on pack on all four tiers.</p>
      </section>

      {nonprofit && (
        <section className="mx-auto mt-10 max-w-3xl rounded-xl border bg-card p-6 text-center">
          <h3 className="font-display text-lg font-semibold">Apply for non-profit pricing</h3>
          <p className="mt-1 text-sm text-muted-foreground">US 501(c)(3) organizations and Canadian registered charities, starting at Team Flow. Add your IRS or CRA documents. Invoice and grant-funded billing is available once you are verified.</p>
          <Button className="mt-4" onClick={() => setIntake(true)}>Start verification</Button>
        </section>
      )}

      <section className="sm-usage-card mx-auto my-14 grid max-w-7xl gap-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center lg:mx-6 xl:mx-auto">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Custom pricing</h3>
          <p className="mt-1">Not seeing the features you need? We build tailored plans for agencies, enterprises and multi-brand teams. Contact us for a demo or custom pricing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="whitespace-nowrap" asChild><a href="mailto:hello@nudaze.com?subject=SocialMotive%20demo%20request">Book a demo</a></Button>
          <Button className="whitespace-nowrap" asChild><a href="mailto:hello@nudaze.com?subject=SocialMotive%20custom%20pricing">Contact us for pricing <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
        </div>
      </section>
      <NonprofitIntakeDialog open={intake} onOpenChange={setIntake} />
    </div>
  );
}

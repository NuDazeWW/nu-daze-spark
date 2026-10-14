import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowRight, Building2, Check, ChevronDown, Crown, HeartHandshake, Waves, Zap } from "lucide-react";
import headerBirdUrl from "@/assets/brand/socialmotive-header-bird.png";
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
  starter: ["Daily queue, planner and Preflight", "Comment drafting", "Asset library"],
  team: ["Everything in Spark Start", "Motive Media Studio and brand kit", "Split one post across platforms"],
  pro: ["Everything in Team Flow", "Executive voice profiles", "Portfolio insights and bulk export", "AI video clips"],
  enterprise: ["Everything in Surge Pro", "Executive review mode", "Your own email sender and domain", "Invoice billing"],
};
const TIER_ICON: Record<string, typeof Zap> = { starter: Zap, team: Waves, pro: Crown, enterprise: Building2 };
const SCOPE: Record<string, string[]> = {
  starter: ["Dedicated instance and DNS", "1 brand profile, 1 voice", "25 assets + 1 import", "LinkedIn and IG Feed setup", "45-minute handoff"],
  team: ["Dedicated instance and DNS", "3 brand profiles, 1 voice", "60 assets + 1 import", "Meta, LinkedIn, X and IG setup", "60-minute session + 7-day hypercare"],
  pro: ["Custom subdomain and SSL", "5 brand profiles, 3 executive voices", "100 assets + cloud sync", "Meta, LinkedIn, X and IG setup", "90-minute session + 14-day hypercare"],
  enterprise: ["Dedicated domain and branding", "10 brand profiles, bespoke tuning", "500 assets + SharePoint/Drive", "All channels incl. YouTube", "2 workshops + 30-day priority channel"],
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
    const q = `tier=${t.tier_slug}&billing=${billing}${nonprofit ? "&nonprofit=true" : ""}`;
    if (t.tier_slug === "enterprise") return (window.location.href = "mailto:sales@nudaze.com?subject=SocialMotive%20Force%20Enterprise");
    nav(user ? `/settings/billing?${q}` : `/auth?next=${encodeURIComponent(`/settings/billing?${q}`)}`);
  };

  return (
    <div className="sm-pricing min-h-screen bg-background text-foreground">
      <header className="sm-pricing-header border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">SocialMotive</Link>
          <Button variant="outline" size="sm" asChild><Link to={user ? "/" : "/auth"}>{user ? "Back to workspace" : "Sign in"}</Link></Button>
        </div>
      </header>

      <section className="sm-pricing-intro relative mx-auto max-w-7xl px-6 pb-10 pt-14 text-center">
        <img src={headerBirdUrl} alt="" aria-hidden className="sm-pricing-bird pointer-events-none absolute -right-2 -top-6 hidden w-52 select-none lg:block" />
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Plans that grow with your content team</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Every plan includes your own private workspace, human review on every post, and a live usage meter so there are never surprise charges.</p>

        <div className="sm-billing-toggle mt-8 inline-flex items-center gap-1 rounded-full border p-1" role="radiogroup" aria-label="Billing period">
          {(["monthly", "annual"] as const).map((b) => (
            <Button key={b} role="radio" aria-checked={billing === b} disabled={nonprofit && b === "monthly"}
              variant="ghost" size="sm" onClick={() => setParam("billing", b)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                billing === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {b === "monthly" ? "Monthly" : "Annual · save 20%"}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <HeartHandshake className="h-4 w-4 text-primary" />
          <label htmlFor="np" className="cursor-pointer">Non-profit program — 40% off annual plans</label>
          <Switch id="np" checked={nonprofit} onCheckedChange={(v) => setParam("nonprofit", v ? "true" : null)} />
        </div>
        {nonprofit && <p className="mt-2 text-xs text-muted-foreground">The non-profit program is annual only, so monthly billing is turned off. Prices apply once your 501(c)(3) is verified.</p>}
      </section>

      <section className="mx-auto grid max-w-7xl items-stretch gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
        {(tiers.data ?? []).map((t) => {
          const hero = t.tier_slug === "pro";
          const perMonth = nonprofit ? t.nonprofit_annual_price_cents : billing === "annual" ? t.annual_price_cents : t.monthly_price_cents;
          const fee = nonprofit ? t.nonprofit_implementation_fee_cents : t.implementation_fee_cents;
          const a = t.allowances;
          return (
            <article key={t.id} data-tier={t.tier_slug} className={cn("sm-price-card flex flex-col rounded-xl border bg-card p-6 text-card-foreground",
              hero && "sm-price-card-featured border-2 border-primary shadow-lg lg:-my-3 lg:py-9")}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="sm-tier-icon flex h-10 w-10 items-center justify-center rounded-lg">
                    {(() => { const Icon = TIER_ICON[t.tier_slug] ?? Zap; return <Icon className="h-5 w-5" />; })()}
                  </span>
                  <h2 className="font-display text-xl font-semibold whitespace-nowrap">{t.name}</h2>
                </div>
                {hero && <Badge className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px]">Most popular</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{AUDIENCE[t.tier_slug]}</p>
              <p className="mt-5"><span className="font-display text-4xl font-semibold">{fmtUsd(perMonth)}</span><span className="text-sm text-muted-foreground"> / month</span></p>
              <p className="text-xs text-muted-foreground">
                {billing === "annual" ? `Billed ${fmtUsd(perMonth * 12)} yearly` : "Billed monthly"}
                {!nonprofit && billing === "annual" && ` · ${fmtUsd(t.monthly_price_cents)} month-to-month`}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{fmtUsd(Math.round(perMonth / a.seats), 2)} per seat</p>

              <ul className="mt-5 space-y-1.5 text-sm">
                {[`${a.brands} brand${a.brands > 1 ? "s" : ""} · ${a.seats} seat${a.seats > 1 ? "s" : ""}`, `${a.dispatches.toLocaleString()} direct posts / month`,
                  `${a.media_credits.toLocaleString()} media credits`, `${a.text_drafts.toLocaleString()} AI drafts / month`,
                  a.x_cap_cents ? `X posting up to ${fmtUsd(a.x_cap_cents)} / month` : "X not included", `${a.storage_gb} GB storage`, CHANNELS[t.tier_slug], ...EXTRAS[t.tier_slug]]
                  .map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{x}</li>)}
              </ul>

              <div className="mt-auto pt-6">
                <Collapsible className="rounded-lg border p-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">One-time setup</span>
                    <span className="font-display font-semibold">{fmtUsd(fee)}</span>
                  </div>
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

      {nonprofit && (
        <section className="mx-auto mt-10 max-w-3xl rounded-xl border bg-card p-6 text-center">
          <h3 className="font-display text-lg font-semibold">Apply for non-profit pricing</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload your IRS determination letter and EIN. Invoice and grant-funded billing is available once verified.</p>
          <Button className="mt-4" onClick={() => setIntake(true)}>Start verification</Button>
        </section>
      )}

      <section className="sm-usage-card mx-auto my-14 grid max-w-7xl gap-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground md:grid-cols-[240px_1fr] md:items-center lg:mx-6 xl:mx-auto">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">How usage works</h3>
          <p className="mt-1 text-xs">Simple, transparent usage so you always know what to expect.</p>
        </div>
        <ul className="space-y-2">
          <li>• Posting to LinkedIn, Facebook, Instagram and YouTube never pauses because of AI or X limits.</li>
          <li>• Media credits cover AI images (3–12 credits) and AI video (40–250 credits). Top up anytime: 500 credits for $25.</li>
          <li>• X charges per post; posts with a link cost more. You see the cost before you publish.</li>
          <li>• Alerts reach you at 80%, and only an owner or admin can approve unusual spend.</li>
        </ul>
      </section>
      <NonprofitIntakeDialog open={intake} onOpenChange={setIntake} />
    </div>
  );
}

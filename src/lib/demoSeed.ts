import { supabase } from "@/integrations/supabase/client";
import { draftChecksum } from "@/lib/preflightRules";

/**
 * Camera-ready demo content for the NuDaze Flagship workspace.
 * Runs with the caller's session so normal access rules apply. Seeded posts are
 * tagged import_source = "demo_seed" so they're recognizable everywhere.
 */
export const DEMO_SEED_TAG = "demo_seed";
const BRIEF_TITLE = "NuDaze 2026 AI Content OS Launch";

type Seed = {
  platform: "linkedin" | "instagram" | "facebook";
  content_type: "post" | "carousel" | "reel" | "story";
  status: "draft" | "in_review" | "approved" | "posted";
  dayOffset: number;
  pillar: string;
  copy: string;
  hashtags: string[];
  asset: string;
  rationale: string;
  score: number;
  parts: [number, number, number, number, number];
};

const POSTS: Seed[] = [
  {
    platform: "linkedin", content_type: "post", status: "in_review", dayOffset: 1, pillar: "Thought leadership",
    copy: "Most content teams don't have a writing problem. They have a traceability problem.\n\nWhen a post goes live, can you answer three questions in under ten seconds?\n• Which approved message is it built on?\n• Which source proves the claim?\n• Who signed off, and when?\n\nAt NuDaze we rebuilt our content workflow around those questions. Every post now starts from one approved brief and carries its sources all the way to publish.\n\nThe result: fewer rewrites, faster approvals, and zero \"where did this number come from?\" moments.\n\nHow does your team track a post from idea to live?",
    hashtags: ["#ContentOperations", "#B2BMarketing", "#MarketingLeadership"],
    asset: "Clean diagram: Brief → Master message → Platform variants, NuDaze brand colors",
    rationale: "Opens with a contrarian reframe, grounded in the approved launch brief; ends with a genuine question to drive comments.",
    score: 94, parts: [24, 24, 18, 14, 14],
  },
  {
    platform: "linkedin", content_type: "post", status: "in_review", dayOffset: 2, pillar: "Founder story",
    copy: "Eighteen months ago our weekly content meeting took 90 minutes. Today it takes 20.\n\nWe didn't hire more writers. We stopped starting from a blank page.\n\nEvery Monday we approve one brief. Everything that week — LinkedIn, Instagram, Stories, Reels — traces back to it. Reviewers see a quality score before they read a word, so their time goes to judgment, not proofreading.\n\nThe lesson: speed came from structure, not shortcuts.",
    hashtags: ["#Leadership", "#ContentStrategy", "#Operations"],
    asset: "Candid photo of the NuDaze team at the Monday brief review",
    rationale: "Personal before/after story in the executive's voice; specific numbers from the internal ops case study.",
    score: 91, parts: [23, 23, 19, 13, 13],
  },
  {
    platform: "instagram", content_type: "carousel", status: "in_review", dayOffset: 3, pillar: "Education",
    copy: "5 signs your content workflow is costing you more than it should 👇\n\n1. Approvals live in email threads\n2. Nobody knows which version is final\n3. The same hook shows up three weeks in a row\n4. Sources are \"somewhere in the drive\"\n5. Posting day = copy-paste panic\n\nSwipe to see how we fixed each one. Save this for your next team meeting.",
    hashtags: ["#ContentMarketing", "#MarketingTips", "#SocialMediaStrategy", "#TeamWorkflow"],
    asset: "6-slide carousel, bold numbered cards on deep navy with teal accents",
    rationale: "Save-worthy listicle format suits Instagram; each point maps to a proof point in the brief.",
    score: 89, parts: [22, 22, 17, 14, 14],
  },
  {
    platform: "instagram", content_type: "reel", status: "approved", dayOffset: 4, pillar: "Product in action",
    copy: "From one approved idea to a full week of posts — in under a minute. ⏱️\n\nWatch a single brief become LinkedIn, Instagram and Story content, each with its own quality score.\n\nNo blank pages. No guessing. Just ship it.",
    hashtags: ["#BehindTheScenes", "#MarketingTeam", "#ContentCreation"],
    asset: "Vertical 30-second screen capture: brief → split across platforms → scores appear",
    rationale: "Video-first hook with a clear time promise; demonstrates the product without hard selling.",
    score: 92, parts: [24, 23, 17, 14, 14],
  },
  {
    platform: "linkedin", content_type: "post", status: "approved", dayOffset: 6, pillar: "Proof",
    copy: "A partner asked us last week: \"How do you know your content is on-message before it ships?\"\n\nOur answer: we score it.\n\nEvery draft gets a Content Motive Score across hook strength, strategic fit, voice, platform fit and originality. Anything under 80 goes back for a targeted rewrite — not a full redo.\n\nLast quarter, 87% of our posts were approved on the first review.",
    hashtags: ["#ContentQuality", "#B2BMarketing", "#MarketingOps"],
    asset: "Score card graphic showing a 94 with five sub-score bars",
    rationale: "Customer-question opener; concrete first-pass approval metric from the quarterly report.",
    score: 90, parts: [22, 24, 18, 13, 13],
  },
  {
    platform: "instagram", content_type: "story", status: "approved", dayOffset: 5, pillar: "Community",
    copy: "Quick poll 📊\nHow many tools does it take your team to publish one post?\n\n1–2 · 3–4 · 5+ 😅",
    hashtags: ["#MarketingLife"],
    asset: "Story poll sticker on NuDaze gradient background",
    rationale: "Low-effort engagement Story that feeds audience insight back into planning.",
    score: 88, parts: [23, 20, 17, 15, 13],
  },
  {
    platform: "facebook", content_type: "post", status: "posted", dayOffset: -2, pillar: "Announcement",
    copy: "We're opening early access to the NuDaze content workflow we use every day. If your team plans, writes and approves social content across several channels, we'd love to show you how one approved idea becomes a whole week of posts.",
    hashtags: ["#EarlyAccess", "#MarketingTools"],
    asset: "Launch banner with product screenshot",
    rationale: "Plain-language announcement suited to Facebook's broader audience.",
    score: 86, parts: [21, 23, 16, 13, 13],
  },
  {
    platform: "linkedin", content_type: "post", status: "draft", dayOffset: 8, pillar: "Thought leadership",
    copy: "AI won't replace your content team. But a content team with a system will outpace one without it.\n\nThe gap isn't the model. It's the workflow around it: approved sources, clear guardrails, and a human who signs off.\n\nTools generate. Systems compound.",
    hashtags: ["#AI", "#ContentStrategy", "#FutureOfWork"],
    asset: "Minimal typographic quote card",
    rationale: "Punchy point of view for executive voice; still a draft so it can be shown moving through review.",
    score: 84, parts: [22, 21, 16, 13, 12],
  },
];

const EXTERNAL = [
  { author: "Maya Chen", title: "VP of Brand, Northwind Health", topic: "Brand consistency at scale", content: "We now publish in 14 markets. The hardest part isn't translation — it's keeping one brand voice when 30 people are writing. Curious how others solve this.", angle: "Share how a single approved brief keeps many writers on one message." },
  { author: "Daniel Okafor", title: "Head of Growth, Brightline", topic: "AI in content teams", content: "Hot take: most AI content fails not because it's bad writing, but because nobody checked it against what the company actually believes.", angle: "Agree and add the value of a human sign-off step with sources attached." },
  { author: "Priya Raman", title: "Marketing Director, Atlas Partners", topic: "Approval bottlenecks", content: "Our approval cycle for a single LinkedIn post is 6 days. Six. What does yours look like?", angle: "Offer a practical tip: score drafts first so reviewers focus on judgment." },
];

export async function seedDemoContent(userId: string) {
  const { data: client } = await supabase.from("clients").select("id").eq("name", "NuDaze Flagship").maybeSingle();
  if (!client) throw new Error("NuDaze Flagship workspace not found");
  const clientId = client.id;

  // Brief (reuse if present)
  let { data: brief } = await supabase.from("campaign_briefs").select("id, version").eq("client_id", clientId).eq("title", BRIEF_TITLE).maybeSingle();
  if (!brief) {
    const { data, error } = await supabase.from("campaign_briefs").insert({
      client_id: clientId, title: BRIEF_TITLE, campaign_type: "product_launch",
      objective: "Position NuDaze as the operating system for strategic content teams",
      target_audience: "Marketing leaders and content operations teams at B2B companies",
      core_message: "Every post should trace back to one approved message — and ship faster because of it.",
      proof_points: ["Weekly content meeting cut from 90 to 20 minutes", "87% of posts approved on first review", "Every post carries its sources from draft to publish"],
      primary_cta: "Request early access", success_metric: "Early-access requests and first-review approval rate",
      timing_window: "Next 3 weeks", target_channels: ["linkedin", "instagram", "facebook"],
      status: "approved", approved_at: new Date().toISOString(), approved_by: userId, created_by: userId,
    } as never).select("id, version").single();
    if (error) throw error;
    brief = data;
  }

  const { data: master, error: mErr } = await supabase.from("master_content_objects").insert({
    client_id: clientId, brief_id: brief!.id, brief_version: brief!.version, title: "Traceable content, faster approvals",
    core_message: "One approved message powers every channel.", proof_points: ["90 → 20 minute meetings", "87% first-pass approvals"],
    cta: "Request early access", status: "approved", created_by: userId,
  } as never).select("id").single();
  if (mErr) throw mErr;

  const { data: voice } = await supabase.from("voice_profiles").select("id").eq("client_id", clientId).limit(1).maybeSingle();

  const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(9 + (Math.abs(n) % 4) * 2, 0, 0, 0); return d.toISOString(); };
  const rows = POSTS.map((p) => ({
    client_id: clientId, platform: p.platform, content_type: p.content_type, approval_status: p.status,
    objective: "Drive early-access requests", audience: "B2B marketing leaders", campaign_pillar: p.pillar,
    draft_copy: p.copy, hashtags: p.hashtags, suggested_asset_description: p.asset, rationale: p.rationale,
    source_references: ["NuDaze 2026 launch brief", "Q3 content operations report"],
    brief_id: brief!.id, master_content_id: master!.id, voice_profile_id: p.platform === "linkedin" ? voice?.id ?? null : null,
    scheduled_for: day(p.dayOffset), posted_at: p.status === "posted" ? day(p.dayOffset) : null,
    publishing_status: p.status === "posted" ? "published" : "idle",
    import_source: DEMO_SEED_TAG, created_by: userId,
  }));
  const { data: cards, error: cErr } = await supabase.from("post_cards").insert(rows as never).select("id, draft_copy, hashtags");
  if (cErr) throw cErr;

  const reviews = (cards ?? []).map((c, i) => {
    const p = POSTS[i];
    const [hook, strat, voiceFit, plat, orig] = p.parts;
    const keys = ["hook_strength", "strategic_fit", "voice_fit", "platform_fit", "originality"];
    const ratios = [hook / 25, strat / 25, voiceFit / 20, plat / 15, orig / 15];
    const w = ratios.indexOf(Math.min(...ratios));
    return {
      post_card_id: c.id, client_id: clientId, draft_checksum: draftChecksum(c), overall_status: "pass",
      voice_score: Math.round((voiceFit / 20) * 100), findings: [], model: "demo-seed", run_by: userId,
      motive_score: p.score,
      motive_breakdown: { hook_strength: hook, strategic_fit: strat, voice_fit: voiceFit, platform_fit: plat, originality: orig, total: p.score, band: p.score >= 80 ? "strong" : "workable", weakest: { key: keys[w], hint: "Small gains available here — try a targeted AI rewrite." } },
    };
  });
  if (reviews.length) {
    const { error } = await supabase.from("preflight_reviews").insert(reviews as never);
    if (error) throw error;
  }

  // External posts for the Comment Generator (skip ones already present)
  for (const e of EXTERNAL) {
    const url = `https://www.linkedin.com/feed/update/demo-${e.author.toLowerCase().replace(/\s+/g, "-")}`;
    const { data: exists } = await supabase.from("external_posts").select("id").eq("external_url", url).maybeSingle();
    if (exists) continue;
    await supabase.from("external_posts").insert({
      client_id: clientId, platform: "linkedin", external_url: url, author_name: e.author, post_content: e.content,
      topic: e.topic, relevance_score: 0.9, risk_flag: "safe", recommended_comment_angle: e.angle, estimated_engagement: 240,
      author_context: { title: e.title, provenance: "manual" },
    } as never);
  }

  // Repurpose ideas from the approved / posted posts
  const approved = (cards ?? []).filter((_, i) => ["approved", "posted"].includes(POSTS[i].status)).slice(0, 4);
  if (approved.length) {
    await supabase.from("repurpose_suggestions").insert(approved.map((c, i) => ({
      client_id: clientId, source_post_card_id: c.id, created_by: userId,
      repurpose_type: (["linkedin_to_instagram", "story_adaptation", "excerpt_quote", "reel_adaptation"] as const)[i % 4],
      target_platform: i % 2 ? "linkedin" : "instagram", target_content_type: (["carousel", "story", "post", "reel"] as const)[i % 4],
      rationale: "Strong performer with a clear, reusable proof point.",
      draft_copy: c.draft_copy.split("\n")[0], hashtags: c.hashtags ?? [], source_excerpt: c.draft_copy.slice(0, 140),
    })) as never);
  }

  return { posts: cards?.length ?? 0 };
}

export async function resetDemoToCameraReady(userId: string) {
  const { error } = await supabase.rpc("clear_demo_content", { _confirm: "CLEAR DEMO CONTENT", _purge_media: false });
  if (error) throw error;
  await supabase.rpc("reset_demo_allowances");
  return seedDemoContent(userId);
}

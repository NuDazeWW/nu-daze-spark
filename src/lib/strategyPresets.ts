import type { StrategyDraft } from "./strategyDraft";

export interface StrategyPreset { key: string; name: string; description: string; draft: StrategyDraft }

const P = (platform: "linkedin" | "instagram" | "facebook", rule_name: string, rule_content: string) => ({ platform, rule_name, rule_content });

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    key: "b2b_saas", name: "B2B Tech & SaaS", description: "Clear, credible, outcome-led content for software buyers.",
    draft: {
      voice_rules: [
        { rule_name: "Lead with the customer problem", rule_content: "Open with a specific pain your buyer feels before mentioning the product.", category: "tone" },
        { rule_name: "Show, don't hype", rule_content: "Use concrete examples, screenshots, and numbers you can source. No vague superlatives.", category: "language" },
        { rule_name: "Plain-English technical", rule_content: "Explain technical ideas in one simple sentence; define acronyms on first use.", category: "language" },
        { rule_name: "Confident, not arrogant", rule_content: "State a point of view clearly and acknowledge trade-offs.", category: "personality" },
      ],
      banned_phrases: ["revolutionary", "disruptive", "AI-powered everything", "all-in-one solution"],
      required_language: [],
      audiences: [
        { segment_name: "Economic buyer", description: "VP/C-level who owns budget and cares about ROI, risk, and time to value.", platforms: ["linkedin"] },
        { segment_name: "Hands-on evaluator", description: "Manager or practitioner comparing tools and workflows day to day.", platforms: ["linkedin", "instagram"] },
      ],
      pillars: [
        { name: "Customer outcomes", description: "Case studies and measurable results." },
        { name: "Product in practice", description: "Short walkthroughs of real workflows." },
        { name: "Industry point of view", description: "Opinions on trends affecting buyers." },
        { name: "Team & culture", description: "The people building the product." },
      ],
      platform_rules: [
        P("linkedin", "Insight-first posts", "First two lines state the insight; 150-250 words; max 3 hashtags; end with a genuine question or clear CTA."),
        P("instagram", "Visual product stories", "Carousels and short demos; caption under 125 words before the fold."),
        P("facebook", "Community updates", "Friendly product news and event posts; one link per post."),
      ],
      ctas: ["Book a 20-minute demo", "See how it works", "Read the full case study", "Start a free trial", "Download the guide"],
      hashtags: ["#SaaS", "#B2B", "#ProductLed", "#CustomerSuccess", "#FutureOfWork", "#Automation", "#TechLeadership", "#Productivity"],
    },
  },
  {
    key: "exec_thought", name: "Executive & Founder Thought Leadership", description: "First-person perspective that builds trust in a leader.",
    draft: {
      voice_rules: [
        { rule_name: "First-person and specific", rule_content: "Write as the leader, using 'I' and real moments, decisions, and lessons.", category: "personality" },
        { rule_name: "One idea per post", rule_content: "Each post makes a single, clearly stated point.", category: "formatting" },
        { rule_name: "Humble authority", rule_content: "Share what you've learned, including mistakes; avoid bragging.", category: "tone" },
      ],
      banned_phrases: ["I'm humbled and honored", "thrilled to announce", "hustle culture", "rise and grind"],
      required_language: [],
      audiences: [
        { segment_name: "Peer leaders", description: "Executives and founders facing similar decisions.", platforms: ["linkedin"] },
        { segment_name: "Future talent", description: "Candidates evaluating the leader and company culture.", platforms: ["linkedin", "instagram"] },
      ],
      pillars: [
        { name: "Lessons learned", description: "Decisions, mistakes, and what changed." },
        { name: "Market perspective", description: "Clear views on where the industry is going." },
        { name: "Leadership & people", description: "How the team is built and led." },
      ],
      platform_rules: [
        P("linkedin", "Story-to-lesson", "Hook, short story, lesson, question. Short paragraphs; 0-3 hashtags."),
        P("instagram", "Behind the scenes", "Candid photos or short video with a reflective caption."),
      ],
      ctas: ["What would you have done?", "Follow for more lessons from the build", "Share this with a leader who needs it", "Reply with your experience"],
      hashtags: ["#Leadership", "#Founders", "#CEO", "#Entrepreneurship", "#Management", "#LessonsLearned", "#Culture", "#Strategy"],
    },
  },
  {
    key: "pro_services", name: "Professional Services & Consulting", description: "Expertise-led content that earns trust before the sales call.",
    draft: {
      voice_rules: [
        { rule_name: "Advisor, not salesperson", rule_content: "Teach something useful in every post; sell lightly.", category: "tone" },
        { rule_name: "Evidence-backed", rule_content: "Reference frameworks, client outcomes (with permission), and data sources.", category: "language" },
        { rule_name: "Calm and precise", rule_content: "Measured language, no exaggeration, clear recommendations.", category: "personality" },
      ],
      banned_phrases: ["one-stop shop", "full-service solutions", "trusted partner", "we are passionate about"],
      required_language: [],
      audiences: [
        { segment_name: "Decision-makers", description: "Owners and executives buying expertise.", platforms: ["linkedin", "facebook"] },
        { segment_name: "Referral partners", description: "Adjacent professionals who send work your way.", platforms: ["linkedin"] },
      ],
      pillars: [
        { name: "Practical advice", description: "How-tos and checklists clients can use." },
        { name: "Client results", description: "Anonymized or approved success stories." },
        { name: "Firm expertise", description: "Your people and methodology." },
      ],
      platform_rules: [
        P("linkedin", "Teach a framework", "Numbered steps or a simple model; 120-220 words."),
        P("facebook", "Local trust", "Community involvement, team news, and client wins."),
      ],
      ctas: ["Book a consultation", "Download the checklist", "Talk to an advisor", "Read the full article"],
      hashtags: ["#Consulting", "#Advisory", "#SmallBusiness", "#Strategy", "#Operations", "#Growth", "#Expertise"],
    },
  },
  {
    key: "dtc", name: "DTC, Consumer & E-commerce", description: "Warm, visual, community-driven content that sells.",
    draft: {
      voice_rules: [
        { rule_name: "Talk like a friend", rule_content: "Warm, casual, and inclusive; short sentences.", category: "tone" },
        { rule_name: "Product benefits, not features", rule_content: "Describe how it feels or what it changes for the customer.", category: "language" },
        { rule_name: "Celebrate customers", rule_content: "Feature real customers and reviews (with permission).", category: "personality" },
      ],
      banned_phrases: ["best product ever", "you need this", "buy now before it's gone"],
      required_language: [],
      audiences: [
        { segment_name: "Loyal customers", description: "Repeat buyers who love the brand.", platforms: ["instagram", "facebook"] },
        { segment_name: "New shoppers", description: "People discovering the brand for the first time.", platforms: ["instagram"] },
      ],
      pillars: [
        { name: "Product in real life", description: "Usage, styling, and demos." },
        { name: "Customer love", description: "UGC, reviews, and community." },
        { name: "Behind the brand", description: "Makers, sourcing, and values." },
        { name: "Offers & drops", description: "Launches and promotions." },
      ],
      platform_rules: [
        P("instagram", "Visual first", "Strong first frame; Reels under 30s; caption hook in first line; 5-10 hashtags."),
        P("facebook", "Community and offers", "Questions, polls, and clear offer posts."),
      ],
      ctas: ["Shop the collection", "Tap to see it in action", "Tell us your favorite", "Share your look with us"],
      hashtags: ["#ShopSmall", "#NewArrivals", "#CustomerLove", "#BehindTheBrand", "#Lifestyle", "#MadeWithCare"],
    },
  },
  {
    key: "agency", name: "Agency & Creative Services", description: "Showcase work and thinking that wins clients.",
    draft: {
      voice_rules: [
        { rule_name: "Work speaks first", rule_content: "Lead with the creative, then explain the thinking.", category: "tone" },
        { rule_name: "Sharp and opinionated", rule_content: "Take clear creative positions; avoid jargon.", category: "personality" },
      ],
      banned_phrases: ["we're a team of passionate creatives", "full-service agency", "storytelling" ],
      required_language: [],
      audiences: [
        { segment_name: "Marketing leaders", description: "CMOs and brand directors hiring agencies.", platforms: ["linkedin", "instagram"] },
        { segment_name: "Creative talent", description: "Designers, writers, and strategists.", platforms: ["instagram"] },
      ],
      pillars: [
        { name: "Case work", description: "Before/after, results, and process." },
        { name: "Creative POV", description: "Opinions on brand and culture." },
        { name: "Studio life", description: "People and process." },
      ],
      platform_rules: [
        P("linkedin", "Case study breakdowns", "Challenge, idea, result in under 200 words."),
        P("instagram", "Portfolio-grade visuals", "Carousels of the work; minimal caption."),
      ],
      ctas: ["See the full case study", "Start a project", "Let's talk about your brand"],
      hashtags: ["#Branding", "#CreativeAgency", "#Design", "#Marketing", "#CaseStudy", "#BrandStrategy"],
    },
  },
];

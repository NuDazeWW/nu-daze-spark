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
  {
    key: "nonprofit", name: "Non-Profit & Cause", description: "Mission-led storytelling that inspires donors, volunteers, and advocates.",
    draft: {
      voice_rules: [
        { rule_name: "Mission first, always", rule_content: "Every post connects back to the cause and the people it serves.", category: "tone" },
        { rule_name: "Dignity in storytelling", rule_content: "Tell beneficiary stories with consent and respect; never exploit hardship for engagement.", category: "language" },
        { rule_name: "Gratitude and hope", rule_content: "Celebrate supporters and progress; acknowledge challenges with honesty and optimism.", category: "personality" },
        { rule_name: "Transparent impact", rule_content: "Use real numbers and outcomes; show where donations and effort go.", category: "language" },
      ],
      banned_phrases: ["guilt trip", "pity", "savior", "help the helpless", "these poor people"],
      required_language: ["Tax-deductible where applicable", "Donation disclosures required by law"],
      audiences: [
        { segment_name: "Donors & sponsors", description: "Individuals and businesses who fund the mission and want to see impact.", platforms: ["linkedin", "facebook"] },
        { segment_name: "Volunteers & advocates", description: "People who give time and amplify the cause in their networks.", platforms: ["instagram", "facebook"] },
        { segment_name: "Community served", description: "Beneficiaries and their families who engage with programs.", platforms: ["instagram", "facebook"] },
      ],
      pillars: [
        { name: "Impact stories", description: "Real outcomes and beneficiary journeys told with dignity." },
        { name: "Donor & volunteer spotlight", description: "Celebrate the people who make the work possible." },
        { name: "Behind the mission", description: "Day-to-day program work and team dedication." },
        { name: "Calls to action", description: "Campaigns, events, and giving drives." },
      ],
      platform_rules: [
        P("linkedin", "Impact & partnership", "Outcome data, corporate partnerships, and board-level updates; 120-200 words."),
        P("instagram", "Visual storytelling", "Photo-led stories and Reels of programs in action; hopeful, human captions."),
        P("facebook", "Community & events", "Event promotion, fundraiser updates, and volunteer recruitment; one clear ask per post."),
      ],
      ctas: ["Donate today", "Volunteer with us", "Share our mission", "Register for the event", "See your impact"],
      hashtags: ["#NonProfit", "#GiveBack", "#Community", #MakeADifference", "#Charity", "#Volunteer", "#SocialImpact", "#Fundraising"],
    },
  },
  {
    key: "healthcare", name: "Healthcare & Wellness", description: "Trustworthy, compliant content that educates and reassures patients.",
    draft: {
      voice_rules: [
        { rule_name: "Accuracy over engagement", rule_content: "Every health claim must be evidence-based and sourced; when in doubt, leave it out.", category: "language" },
        { rule_name: "Warm and reassuring", rule_content: "Write with empathy; avoid clinical coldness and fear-based messaging.", category: "tone" },
        { rule_name: "Plain-language health", rule_content: "Explain medical terms simply; write at an accessible reading level.", category: "language" },
        { rule_name: "Privacy first", rule_content: "Never share patient-identifiable information; use only consented, anonymized stories.", category: "compliance" },
      ],
      banned_phrases: ["miracle cure", "guaranteed results", "breakthrough treatment", "doctors hate this", "secret remedy"],
      required_language: ["Consult your physician", "Not medical advice", "Results may vary"],
      audiences: [
        { segment_name: "Patients & families", description: "People seeking care information and reassurance.", platforms: ["facebook", "instagram"] },
        { segment_name: "Referring professionals", description: "Physicians and partners who refer patients.", platforms: ["linkedin"] },
        { segment_name: "Community & employers", description: "Local organizations and workplace wellness buyers.", platforms: ["linkedin", "facebook"] },
      ],
      pillars: [
        { name: "Health education", description: "Preventive tips, myth-busting, and condition awareness." },
        { name: "Meet the team", description: "Provider profiles that build trust and familiarity." },
        { name: "Patient experience", description: "Consented testimonials and care journeys." },
        { name: "Community health", description: "Screenings, events, and local health initiatives." },
      ],
      platform_rules: [
        P("linkedin", "Professional credibility", "Clinical insights, practice news, and industry commentary; measured tone, 120-200 words."),
        P("instagram", "Accessible wellness", "Friendly tips, team intros, and facility tours; warm visuals, no graphic medical imagery."),
        P("facebook", "Community care", "Hours, services, events, and patient resources; clear and practical."),
      ],
      ctas: ["Book an appointment", "Learn more about this service", "Meet our providers", "Download the patient guide"],
      hashtags: ["#Healthcare", "#Wellness", "#PatientCare", "#HealthTips", "#PreventiveCare", "#CommunityHealth", "#HealthyLiving"],
    },
  },
  {
    key: "sports", name: "Sports & Athletics", description: "High-energy content that rallies fans, athletes, and sponsors.",
    draft: {
      voice_rules: [
        { rule_name: "Energy with substance", rule_content: "Match the excitement of the game while staying credible and specific.", category: "tone" },
        { rule_name: "Celebrate the team", rule_content: "Credit athletes, coaches, and staff; win together, lose together.", category: "personality" },
        { rule_name: "Fan-first language", rule_content: "Write like you're in the stands with them; inclusive, passionate, never corporate.", category: "language" },
      ],
      banned_phrases: ["guaranteed win", "crush the competition", "losers", "easy victory"],
      required_language: [],
      audiences: [
        { segment_name: "Fans & community", description: "Supporters who follow scores, stories, and events.", platforms: ["instagram", "facebook"] },
        { segment_name: "Sponsors & partners", description: "Businesses investing in the team or program.", platforms: ["linkedin"] },
        { segment_name: "Athletes & recruits", description: "Current and prospective players and their families.", platforms: ["instagram"] },
      ],
      pillars: [
        { name: "Game day", description: "Previews, live energy, and results." },
        { name: "Athlete stories", description: "Profiles, journeys, and behind-the-scenes training." },
        { name: "Community & fans", description: "Fan moments, youth programs, and local pride." },
        { name: "Partners & sponsors", description: "Sponsor recognition and partnership news." },
      ],
      platform_rules: [
        P("instagram", "Action-first visuals", "Game photos and Reels with punchy captions; Stories for live moments and polls."),
        P("facebook", "Event hub", "Schedules, ticket links, recaps, and community events."),
        P("linkedin", "Business of sport", "Sponsorship announcements, partnerships, and organizational milestones; professional tone."),
      ],
      ctas: ["Get your tickets", "Join us on game day", "Follow the season", "Become a sponsor", "Share your fan photos"],
      hashtags: ["#GameDay", "#TeamSpirit", "#Athletics", "#SportsCommunity", "#GoTeam", "#Champions", "#FanZone", "#TrainHard"],
    },
  },
];


-- Brand Voice Rules (add 2 more to reach 5)
INSERT INTO public.brand_voice_rules (rule_name, rule_content, category, is_active) VALUES
('Banned Phrases', 'Never use: "game-changer", "synergy", "circle back", "low-hanging fruit", "move the needle". These dilute brand authority.', 'restrictions', true),
('Hook Formula', 'Open with a pattern interrupt, contrarian take, or relatable pain point. Never start with "Did you know" or generic questions.', 'structure', true);

-- Platform Rules (add 3 more to reach 5)
INSERT INTO public.platform_rules (rule_name, rule_content, platform, char_limit, is_active) VALUES
('Instagram Caption Style', 'Lead with a strong hook in the first line (visible before "more"). Use emojis sparingly and purposefully. Include CTA before hashtag block.', 'instagram', 2200, true),
('Instagram Hashtag Strategy', 'Use 15-25 hashtags in a comment or separated by line breaks. Mix reach tiers: 5 broad, 10 mid-range, 5-10 niche.', 'instagram', NULL, true),
('Instagram Reel Captions', 'Keep captions under 150 characters for Reels. The video hook matters more than the caption. Include 1 CTA max.', 'instagram', 150, true);

-- Campaign Rules (add 1 more to reach 3)
INSERT INTO public.campaign_rules (campaign_name, description, content_pillars, start_date, end_date, is_active) VALUES
('Client Success Stories', 'Showcase transformation stories from NuDaze clients with measurable outcomes and authentic testimonials.', '{case_studies,testimonials,results}', '2026-04-01', NULL, true);

-- Hashtag Banks (add 2 more to reach 5)
INSERT INTO public.hashtag_banks (bank_name, category, hashtags, is_active) VALUES
('LinkedIn Reach', 'platform', '{#Leadership,#Marketing,#Branding,#Entrepreneurship,#Innovation}', true),
('Instagram Engagement', 'platform', '{#CreativeAgency,#BrandingAgency,#DesignInspiration,#MarketingTips,#ContentStrategy}', true);

-- CTA Banks (add 1 more to reach 3)
INSERT INTO public.cta_banks (bank_name, category, ctas, is_active) VALUES
('Community CTAs', 'community', '{"Follow for more strategic insights","Save this for later 🔖","Share with your marketing team","Join the conversation in comments"}', true);

-- Cadence Targets (add missing carousel)
INSERT INTO public.cadence_targets (platform, content_type, daily_target, weekly_target, is_active) VALUES
('instagram', 'carousel', 0, 2, true);

-- Engagement Targets (add 1 more to reach 3)
INSERT INTO public.engagement_targets (platform, daily_target, min_relevance_threshold, risk_tolerance, topic_category, is_active) VALUES
('instagram', 5, 0.70, 'safe_only', 'creative industry', true);

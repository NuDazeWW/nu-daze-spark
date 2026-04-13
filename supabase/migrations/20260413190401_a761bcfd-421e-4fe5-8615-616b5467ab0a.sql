
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.platform_type AS ENUM ('linkedin', 'instagram');
CREATE TYPE public.content_type AS ENUM ('post', 'story', 'reel', 'article', 'carousel', 'comment');
CREATE TYPE public.permission_state AS ENUM ('generation_allowed', 'summarization_only', 'blocked', 'archived');
CREATE TYPE public.approval_status AS ENUM ('draft', 'in_review', 'needs_revision', 'approved', 'exported', 'posted', 'archived');
CREATE TYPE public.risk_flag AS ENUM ('safe', 'review_needed', 'blocked');
CREATE TYPE public.job_type AS ENUM ('scrape', 'summarize', 'generate_batch', 'generate_comments', 'suggest_repurpose', 'cleanup');
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'retrying');
CREATE TYPE public.repurpose_type AS ENUM ('repost_as_is', 'cross_platform_rewrite', 'excerpt_quote', 'story_adaptation', 'reel_adaptation', 'linkedin_to_instagram', 'instagram_to_linkedin');
CREATE TYPE public.asset_type AS ENUM ('image', 'video', 'pdf', 'link', 'text_snippet', 'deck', 'testimonial', 'case_study');

-- ============================================================
-- UTILITY FUNCTION: update_updated_at_column
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================================
-- SECURITY DEFINER: has_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================
-- PROFILES RLS
-- ============================================================
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- USER ROLES RLS
-- ============================================================
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- CADENCE TARGETS
-- ============================================================
CREATE TABLE public.cadence_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform_type NOT NULL,
  content_type public.content_type NOT NULL,
  weekly_target INT NOT NULL DEFAULT 0,
  daily_target INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform, content_type)
);

ALTER TABLE public.cadence_targets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_cadence_targets_updated_at BEFORE UPDATE ON public.cadence_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view cadence targets" ON public.cadence_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cadence targets" ON public.cadence_targets FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update cadence targets" ON public.cadence_targets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cadence targets" ON public.cadence_targets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ENGAGEMENT TARGETS
-- ============================================================
CREATE TABLE public.engagement_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform_type NOT NULL,
  topic_category TEXT,
  daily_target INT NOT NULL DEFAULT 0,
  min_relevance_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  risk_tolerance TEXT NOT NULL DEFAULT 'safe_only' CHECK (risk_tolerance IN ('safe_only', 'include_review_needed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_targets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_engagement_targets_updated_at BEFORE UPDATE ON public.engagement_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view engagement targets" ON public.engagement_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert engagement targets" ON public.engagement_targets FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update engagement targets" ON public.engagement_targets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete engagement targets" ON public.engagement_targets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- BRAND VOICE RULES
-- ============================================================
CREATE TABLE public.brand_voice_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_voice_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_brand_voice_rules_updated_at BEFORE UPDATE ON public.brand_voice_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view brand voice rules" ON public.brand_voice_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert brand voice rules" ON public.brand_voice_rules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update brand voice rules" ON public.brand_voice_rules FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete brand voice rules" ON public.brand_voice_rules FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PLATFORM RULES
-- ============================================================
CREATE TABLE public.platform_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform_type NOT NULL,
  rule_name TEXT NOT NULL,
  rule_content TEXT NOT NULL,
  char_limit INT,
  format_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_platform_rules_updated_at BEFORE UPDATE ON public.platform_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view platform rules" ON public.platform_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert platform rules" ON public.platform_rules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update platform rules" ON public.platform_rules FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete platform rules" ON public.platform_rules FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- AUDIENCE DEFINITIONS
-- ============================================================
CREATE TABLE public.audience_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_name TEXT NOT NULL,
  description TEXT NOT NULL,
  demographics JSONB DEFAULT '{}',
  psychographics JSONB DEFAULT '{}',
  platforms public.platform_type[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audience_definitions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_audience_definitions_updated_at BEFORE UPDATE ON public.audience_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view audience definitions" ON public.audience_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert audience definitions" ON public.audience_definitions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update audience definitions" ON public.audience_definitions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete audience definitions" ON public.audience_definitions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- CAMPAIGN RULES
-- ============================================================
CREATE TABLE public.campaign_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  description TEXT,
  content_pillars TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_campaign_rules_updated_at BEFORE UPDATE ON public.campaign_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view campaign rules" ON public.campaign_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert campaign rules" ON public.campaign_rules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update campaign rules" ON public.campaign_rules FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete campaign rules" ON public.campaign_rules FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- HASHTAG BANKS
-- ============================================================
CREATE TABLE public.hashtag_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hashtag_banks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_hashtag_banks_updated_at BEFORE UPDATE ON public.hashtag_banks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view hashtag banks" ON public.hashtag_banks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert hashtag banks" ON public.hashtag_banks FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update hashtag banks" ON public.hashtag_banks FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete hashtag banks" ON public.hashtag_banks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- CTA BANKS
-- ============================================================
CREATE TABLE public.cta_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'engagement',
  ctas TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cta_banks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_cta_banks_updated_at BEFORE UPDATE ON public.cta_banks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view cta banks" ON public.cta_banks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cta banks" ON public.cta_banks FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update cta banks" ON public.cta_banks FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cta banks" ON public.cta_banks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SOURCE ASSETS
-- ============================================================
CREATE TABLE public.source_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  asset_type public.asset_type NOT NULL,
  file_path TEXT,
  external_url TEXT,
  text_content TEXT,
  permission_state public.permission_state NOT NULL DEFAULT 'generation_allowed',
  is_nudaze_origin BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.source_assets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_source_assets_updated_at BEFORE UPDATE ON public.source_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_source_assets_permission ON public.source_assets(permission_state, expires_at);

CREATE POLICY "Authenticated can view source assets" ON public.source_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert source assets" ON public.source_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin can update source assets" ON public.source_assets FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete source assets" ON public.source_assets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ASSET SUMMARIES
-- ============================================================
CREATE TABLE public.asset_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.source_assets(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  content_type_detected TEXT,
  is_nudaze_origin BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view asset summaries" ON public.asset_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete asset summaries" ON public.asset_summaries FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- CONNECTED SOURCES
-- ============================================================
CREATE TABLE public.connected_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  connection_config JSONB DEFAULT '{}',
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_sources ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_connected_sources_updated_at BEFORE UPDATE ON public.connected_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can view connected sources" ON public.connected_sources FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert connected sources" ON public.connected_sources FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update connected sources" ON public.connected_sources FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete connected sources" ON public.connected_sources FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- GENERATION BATCHES
-- ============================================================
CREATE TABLE public.generation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT,
  platform public.platform_type,
  content_type public.content_type,
  card_count INT NOT NULL DEFAULT 0,
  generator_version TEXT DEFAULT '1.0',
  schema_version TEXT DEFAULT '1.0',
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_batches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_generation_batches_updated_at BEFORE UPDATE ON public.generation_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view generation batches" ON public.generation_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert generation batches" ON public.generation_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin can update generation batches" ON public.generation_batches FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete generation batches" ON public.generation_batches FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POST CARDS
-- ============================================================
CREATE TABLE public.post_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.generation_batches(id) ON DELETE SET NULL,
  platform public.platform_type NOT NULL,
  content_type public.content_type NOT NULL,
  objective TEXT,
  audience TEXT,
  campaign_pillar TEXT,
  draft_copy TEXT NOT NULL,
  suggested_asset_description TEXT,
  hashtags TEXT[] DEFAULT '{}',
  people_tags TEXT[] DEFAULT '{}',
  org_tags TEXT[] DEFAULT '{}',
  source_references UUID[] DEFAULT '{}',
  rationale TEXT,
  approval_status public.approval_status NOT NULL DEFAULT 'draft',
  assigned_to UUID REFERENCES auth.users(id),
  revision_notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_cards ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_post_cards_updated_at BEFORE UPDATE ON public.post_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_post_cards_status ON public.post_cards(approval_status, assigned_to, platform);

CREATE POLICY "Authenticated can view post cards" ON public.post_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert post cards" ON public.post_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Assignee or admin can update post cards" ON public.post_cards FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete post cards" ON public.post_cards FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POST VERSIONS (append-only)
-- ============================================================
CREATE TABLE public.post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_card_id UUID NOT NULL REFERENCES public.post_cards(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  draft_copy TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  people_tags TEXT[] DEFAULT '{}',
  org_tags TEXT[] DEFAULT '{}',
  edit_source TEXT NOT NULL DEFAULT 'ai' CHECK (edit_source IN ('ai', 'human')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_versions_card ON public.post_versions(post_card_id);

CREATE POLICY "Authenticated can view post versions" ON public.post_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert post versions" ON public.post_versions FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- APPROVAL LOG (append-only)
-- ============================================================
CREATE TABLE public.approval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_card_id UUID NOT NULL REFERENCES public.post_cards(id) ON DELETE CASCADE,
  action public.approval_status NOT NULL,
  notes TEXT,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_approval_log_card ON public.approval_log(post_card_id);

CREATE POLICY "Authenticated can view approval log" ON public.approval_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert approval log" ON public.approval_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- ============================================================
-- EXTERNAL POSTS
-- ============================================================
CREATE TABLE public.external_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform_type NOT NULL,
  external_url TEXT NOT NULL,
  author_name TEXT,
  post_content TEXT,
  topic TEXT,
  relevance_score NUMERIC(3,2) DEFAULT 0,
  risk_flag public.risk_flag NOT NULL DEFAULT 'safe',
  risk_notes TEXT,
  recommended_comment_angle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_posts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_external_posts_updated_at BEFORE UPDATE ON public.external_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_external_posts_risk ON public.external_posts(risk_flag, relevance_score);

CREATE POLICY "Authenticated can view external posts" ON public.external_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update external posts" ON public.external_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete external posts" ON public.external_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_post_id UUID NOT NULL REFERENCES public.external_posts(id) ON DELETE CASCADE,
  draft_copy TEXT NOT NULL,
  tone TEXT,
  rationale TEXT,
  approval_status public.approval_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin can update comments" ON public.comments FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete comments" ON public.comments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- REPURPOSE SUGGESTIONS
-- ============================================================
CREATE TABLE public.repurpose_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_asset_id UUID REFERENCES public.source_assets(id) ON DELETE CASCADE,
  source_post_card_id UUID REFERENCES public.post_cards(id) ON DELETE CASCADE,
  repurpose_type public.repurpose_type NOT NULL,
  target_platform public.platform_type NOT NULL,
  target_content_type public.content_type NOT NULL,
  rationale TEXT NOT NULL,
  is_actioned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repurpose_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view repurpose suggestions" ON public.repurpose_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete repurpose suggestions" ON public.repurpose_suggestions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- BACKGROUND JOBS
-- ============================================================
CREATE TABLE public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type public.job_type NOT NULL,
  status public.job_status NOT NULL DEFAULT 'queued',
  progress_current INT DEFAULT 0,
  progress_total INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  last_error_code TEXT,
  last_error_message TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view background jobs" ON public.background_jobs FOR SELECT TO authenticated USING (true);

-- ============================================================
-- RETENTION SETTINGS
-- ============================================================
CREATE TABLE public.retention_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  rule_description TEXT NOT NULL,
  retention_days INT NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.retention_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_retention_settings_updated_at BEFORE UPDATE ON public.retention_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can view retention settings" ON public.retention_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert retention settings" ON public.retention_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update retention settings" ON public.retention_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE BUCKETS (all private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('source-assets', 'source-assets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-assets', 'generated-assets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('summaries', 'summaries', false);

-- Storage RLS
CREATE POLICY "Authenticated can view storage files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id IN ('source-assets', 'generated-assets', 'summaries'));
CREATE POLICY "Authenticated can upload to source assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'source-assets');
CREATE POLICY "Admins can delete storage objects" ON storage.objects
  FOR DELETE USING (bucket_id IN ('source-assets', 'generated-assets', 'summaries') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update storage objects" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('source-assets', 'generated-assets', 'summaries') AND public.has_role(auth.uid(), 'admin'));

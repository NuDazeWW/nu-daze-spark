export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_tags: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string | null
          handle: string
          id: string
          is_active: boolean
          is_default: boolean
          is_system: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          handle: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          handle?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      approval_log: {
        Row: {
          action: Database["public"]["Enums"]["approval_status"]
          actor_id: string
          created_at: string
          id: string
          notes: string | null
          post_card_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_status"]
          actor_id: string
          created_at?: string
          id?: string
          notes?: string | null
          post_card_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_status"]
          actor_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          post_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_log_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_summaries: {
        Row: {
          asset_id: string
          content_type_detected: string | null
          created_at: string
          created_by: string | null
          id: string
          is_nudaze_origin: boolean | null
          key_topics: string[] | null
          summary: string
        }
        Insert: {
          asset_id: string
          content_type_detected?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_nudaze_origin?: boolean | null
          key_topics?: string[] | null
          summary: string
        }
        Update: {
          asset_id?: string
          content_type_detected?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_nudaze_origin?: boolean | null
          key_topics?: string[] | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_summaries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "source_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          demographics: Json | null
          description: string
          id: string
          is_active: boolean
          platforms: Database["public"]["Enums"]["platform_type"][] | null
          psychographics: Json | null
          segment_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demographics?: Json | null
          description: string
          id?: string
          is_active?: boolean
          platforms?: Database["public"]["Enums"]["platform_type"][] | null
          psychographics?: Json | null
          segment_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demographics?: Json | null
          description?: string
          id?: string
          is_active?: boolean
          platforms?: Database["public"]["Enums"]["platform_type"][] | null
          psychographics?: Json | null
          segment_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          failure_reason: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          last_error_code: string | null
          last_error_message: string | null
          max_retries: number
          metadata: Json | null
          progress_current: number | null
          progress_total: number | null
          retry_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          failure_reason?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          last_error_code?: string | null
          last_error_message?: string | null
          max_retries?: number
          metadata?: Json | null
          progress_current?: number | null
          progress_total?: number | null
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          failure_reason?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          last_error_code?: string | null
          last_error_message?: string | null
          max_retries?: number
          metadata?: Json | null
          progress_current?: number | null
          progress_total?: number | null
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: []
      }
      brand_voice_rules: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          rule_content: string
          rule_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          rule_content: string
          rule_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          rule_content?: string
          rule_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cadence_targets: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string | null
          daily_target: number
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          updated_at: string
          updated_by: string | null
          weekly_target: number
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          daily_target?: number
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          updated_at?: string
          updated_by?: string | null
          weekly_target?: number
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          daily_target?: number
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["platform_type"]
          updated_at?: string
          updated_by?: string | null
          weekly_target?: number
        }
        Relationships: []
      }
      campaign_rules: {
        Row: {
          campaign_name: string
          content_pillars: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          campaign_name: string
          content_pillars?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          campaign_name?: string
          content_pillars?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          created_by: string
          draft_copy: string
          external_post_id: string
          id: string
          rationale: string | null
          tone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          created_by: string
          draft_copy: string
          external_post_id: string
          id?: string
          rationale?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          created_by?: string
          draft_copy?: string
          external_post_id?: string
          id?: string
          rationale?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_external_post_id_fkey"
            columns: ["external_post_id"]
            isOneToOne: false
            referencedRelation: "external_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_sources: {
        Row: {
          connection_config: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_connected: boolean
          last_synced_at: string | null
          source_name: string
          source_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connection_config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          source_name: string
          source_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connection_config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          source_name?: string
          source_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cta_banks: {
        Row: {
          bank_name: string
          category: string
          created_at: string
          created_by: string | null
          ctas: string[]
          id: string
          is_active: boolean
          last_used_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_name: string
          category?: string
          created_at?: string
          created_by?: string | null
          ctas?: string[]
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_name?: string
          category?: string
          created_at?: string
          created_by?: string | null
          ctas?: string[]
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      engagement_targets: {
        Row: {
          created_at: string
          created_by: string | null
          daily_target: number
          id: string
          is_active: boolean
          min_relevance_threshold: number
          platform: Database["public"]["Enums"]["platform_type"]
          risk_tolerance: string
          topic_category: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_target?: number
          id?: string
          is_active?: boolean
          min_relevance_threshold?: number
          platform: Database["public"]["Enums"]["platform_type"]
          risk_tolerance?: string
          topic_category?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_target?: number
          id?: string
          is_active?: boolean
          min_relevance_threshold?: number
          platform?: Database["public"]["Enums"]["platform_type"]
          risk_tolerance?: string
          topic_category?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      external_posts: {
        Row: {
          author_name: string | null
          created_at: string
          estimated_engagement: number
          external_url: string
          id: string
          is_commented: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          post_content: string | null
          recommended_comment_angle: string | null
          relevance_score: number | null
          risk_flag: Database["public"]["Enums"]["risk_flag"]
          risk_notes: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          estimated_engagement?: number
          external_url: string
          id?: string
          is_commented?: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          post_content?: string | null
          recommended_comment_angle?: string | null
          relevance_score?: number | null
          risk_flag?: Database["public"]["Enums"]["risk_flag"]
          risk_notes?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          created_at?: string
          estimated_engagement?: number
          external_url?: string
          id?: string
          is_commented?: boolean
          platform?: Database["public"]["Enums"]["platform_type"]
          post_content?: string | null
          recommended_comment_angle?: string | null
          relevance_score?: number | null
          risk_flag?: Database["public"]["Enums"]["risk_flag"]
          risk_notes?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      generation_batches: {
        Row: {
          batch_name: string | null
          card_count: number
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string
          created_by: string
          generator_version: string | null
          id: string
          metadata: Json | null
          platform: Database["public"]["Enums"]["platform_type"] | null
          schema_version: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_name?: string | null
          card_count?: number
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string
          created_by: string
          generator_version?: string | null
          id?: string
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          schema_version?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_name?: string | null
          card_count?: number
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string
          created_by?: string
          generator_version?: string | null
          id?: string
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          schema_version?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hashtag_banks: {
        Row: {
          bank_name: string
          category: string
          created_at: string
          created_by: string | null
          hashtags: string[]
          id: string
          is_active: boolean
          last_used_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_name: string
          category?: string
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_name?: string
          category?: string
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_rules: {
        Row: {
          char_limit: number | null
          created_at: string
          created_by: string | null
          format_preferences: Json | null
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          rule_content: string
          rule_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          char_limit?: number | null
          created_at?: string
          created_by?: string | null
          format_preferences?: Json | null
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          rule_content: string
          rule_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          char_limit?: number | null
          created_at?: string
          created_by?: string | null
          format_preferences?: Json | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["platform_type"]
          rule_content?: string
          rule_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      post_cards: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          assigned_to: string | null
          audience: string | null
          batch_id: string | null
          campaign_pillar: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string
          draft_copy: string
          hashtags: string[] | null
          id: string
          objective: string | null
          org_tags: string[] | null
          people_tags: string[] | null
          platform: Database["public"]["Enums"]["platform_type"]
          rationale: string | null
          revision_notes: string | null
          source_references: string[] | null
          suggested_asset_description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assigned_to?: string | null
          audience?: string | null
          batch_id?: string | null
          campaign_pillar?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by: string
          draft_copy: string
          hashtags?: string[] | null
          id?: string
          objective?: string | null
          org_tags?: string[] | null
          people_tags?: string[] | null
          platform: Database["public"]["Enums"]["platform_type"]
          rationale?: string | null
          revision_notes?: string | null
          source_references?: string[] | null
          suggested_asset_description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assigned_to?: string | null
          audience?: string | null
          batch_id?: string | null
          campaign_pillar?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string
          draft_copy?: string
          hashtags?: string[] | null
          id?: string
          objective?: string | null
          org_tags?: string[] | null
          people_tags?: string[] | null
          platform?: Database["public"]["Enums"]["platform_type"]
          rationale?: string | null
          revision_notes?: string | null
          source_references?: string[] | null
          suggested_asset_description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_cards_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "generation_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      post_versions: {
        Row: {
          created_at: string
          created_by: string
          draft_copy: string
          edit_source: string
          hashtags: string[] | null
          id: string
          org_tags: string[] | null
          people_tags: string[] | null
          post_card_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          draft_copy: string
          edit_source?: string
          hashtags?: string[] | null
          id?: string
          org_tags?: string[] | null
          people_tags?: string[] | null
          post_card_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          draft_copy?: string
          edit_source?: string
          hashtags?: string[] | null
          id?: string
          org_tags?: string[] | null
          people_tags?: string[] | null
          post_card_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_versions_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repurpose_suggestions: {
        Row: {
          created_at: string
          id: string
          is_actioned: boolean
          rationale: string
          repurpose_type: Database["public"]["Enums"]["repurpose_type"]
          source_asset_id: string | null
          source_post_card_id: string | null
          target_content_type: Database["public"]["Enums"]["content_type"]
          target_platform: Database["public"]["Enums"]["platform_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_actioned?: boolean
          rationale: string
          repurpose_type: Database["public"]["Enums"]["repurpose_type"]
          source_asset_id?: string | null
          source_post_card_id?: string | null
          target_content_type: Database["public"]["Enums"]["content_type"]
          target_platform: Database["public"]["Enums"]["platform_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_actioned?: boolean
          rationale?: string
          repurpose_type?: Database["public"]["Enums"]["repurpose_type"]
          source_asset_id?: string | null
          source_post_card_id?: string | null
          target_content_type?: Database["public"]["Enums"]["content_type"]
          target_platform?: Database["public"]["Enums"]["platform_type"]
        }
        Relationships: [
          {
            foreignKeyName: "repurpose_suggestions_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "source_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurpose_suggestions_source_post_card_id_fkey"
            columns: ["source_post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          retention_days: number
          rule_description: string
          table_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          retention_days?: number
          rule_description: string
          table_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          retention_days?: number
          rule_description?: string
          table_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      source_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          content_date: string | null
          contributors: string[]
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          event_name: string | null
          expires_at: string | null
          external_url: string | null
          file_path: string | null
          id: string
          is_event: boolean
          is_nudaze_origin: boolean
          last_used_at: string | null
          permission_state: Database["public"]["Enums"]["permission_state"]
          text_content: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          content_date?: string | null
          contributors?: string[]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          event_name?: string | null
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          is_event?: boolean
          is_nudaze_origin?: boolean
          last_used_at?: string | null
          permission_state?: Database["public"]["Enums"]["permission_state"]
          text_content?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          content_date?: string | null
          contributors?: string[]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          event_name?: string | null
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          is_event?: boolean
          is_nudaze_origin?: boolean
          last_used_at?: string | null
          permission_state?: Database["public"]["Enums"]["permission_state"]
          text_content?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      approval_status:
        | "draft"
        | "in_review"
        | "needs_revision"
        | "approved"
        | "exported"
        | "posted"
        | "archived"
      asset_type:
        | "image"
        | "video"
        | "pdf"
        | "link"
        | "text_snippet"
        | "deck"
        | "testimonial"
        | "case_study"
      content_type:
        | "post"
        | "story"
        | "reel"
        | "article"
        | "carousel"
        | "comment"
      job_status: "queued" | "running" | "completed" | "failed" | "retrying"
      job_type:
        | "scrape"
        | "summarize"
        | "generate_batch"
        | "generate_comments"
        | "suggest_repurpose"
        | "cleanup"
      permission_state:
        | "generation_allowed"
        | "summarization_only"
        | "blocked"
        | "archived"
      platform_type: "linkedin" | "instagram"
      repurpose_type:
        | "repost_as_is"
        | "cross_platform_rewrite"
        | "excerpt_quote"
        | "story_adaptation"
        | "reel_adaptation"
        | "linkedin_to_instagram"
        | "instagram_to_linkedin"
      risk_flag: "safe" | "review_needed" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      approval_status: [
        "draft",
        "in_review",
        "needs_revision",
        "approved",
        "exported",
        "posted",
        "archived",
      ],
      asset_type: [
        "image",
        "video",
        "pdf",
        "link",
        "text_snippet",
        "deck",
        "testimonial",
        "case_study",
      ],
      content_type: ["post", "story", "reel", "article", "carousel", "comment"],
      job_status: ["queued", "running", "completed", "failed", "retrying"],
      job_type: [
        "scrape",
        "summarize",
        "generate_batch",
        "generate_comments",
        "suggest_repurpose",
        "cleanup",
      ],
      permission_state: [
        "generation_allowed",
        "summarization_only",
        "blocked",
        "archived",
      ],
      platform_type: ["linkedin", "instagram"],
      repurpose_type: [
        "repost_as_is",
        "cross_platform_rewrite",
        "excerpt_quote",
        "story_adaptation",
        "reel_adaptation",
        "linkedin_to_instagram",
        "instagram_to_linkedin",
      ],
      risk_flag: ["safe", "review_needed", "blocked"],
    },
  },
} as const

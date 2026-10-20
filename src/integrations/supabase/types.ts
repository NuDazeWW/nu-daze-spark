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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "account_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      addon_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          kind: string
          note: string | null
          packs: number
          price_cents: number
          quantity: number
          remaining: number
          request_key: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          kind: string
          note?: string | null
          packs: number
          price_cents: number
          quantity: number
          remaining: number
          request_key: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          packs?: number
          price_cents?: number
          quantity?: number
          remaining?: number
          request_key?: string
        }
        Relationships: []
      }
      ai_provider_credentials: {
        Row: {
          api_key: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          provider?: string
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
          {
            foreignKeyName: "asset_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_definitions: {
        Row: {
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "audience_definitions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      brand_kits: {
        Row: {
          client_id: string
          colors: Json
          created_at: string
          fonts: string[]
          id: string
          logo_path: string | null
          product_image_paths: string[]
          tone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          colors?: Json
          created_at?: string
          fonts?: string[]
          id?: string
          logo_path?: string | null
          product_image_paths?: string[]
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          colors?: Json
          created_at?: string
          fonts?: string[]
          id?: string
          logo_path?: string | null
          product_image_paths?: string[]
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_voice_rules: {
        Row: {
          category: string
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          rule_content?: string
          rule_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_voice_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_approval_log: {
        Row: {
          action: string
          actor_id: string
          brief_id: string
          brief_version: number
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          actor_id: string
          brief_id: string
          brief_version: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          brief_id?: string
          brief_version?: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_approval_log_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "campaign_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_approval_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_comments: {
        Row: {
          author_id: string
          body: string
          brief_id: string
          brief_version: number
          client_id: string | null
          created_at: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          author_id: string
          body: string
          brief_id: string
          brief_version?: number
          client_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          brief_id?: string
          brief_version?: number
          client_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_comments_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "campaign_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_targets: {
        Row: {
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "cadence_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_briefs: {
        Row: {
          approval_mode_enabled: boolean
          approved_at: string | null
          approved_by: string | null
          assigned_approver_id: string | null
          campaign_type: string
          client_id: string | null
          constraints: string | null
          core_message: string | null
          created_at: string
          created_by: string
          destination_url: string | null
          id: string
          objective: string | null
          primary_cta: string | null
          proof_points: string[]
          status: string
          success_metric: string | null
          target_audience: string | null
          target_channels: string[]
          timing_window: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approval_mode_enabled?: boolean
          approved_at?: string | null
          approved_by?: string | null
          assigned_approver_id?: string | null
          campaign_type?: string
          client_id?: string | null
          constraints?: string | null
          core_message?: string | null
          created_at?: string
          created_by?: string
          destination_url?: string | null
          id?: string
          objective?: string | null
          primary_cta?: string | null
          proof_points?: string[]
          status?: string
          success_metric?: string | null
          target_audience?: string | null
          target_channels?: string[]
          timing_window?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          approval_mode_enabled?: boolean
          approved_at?: string | null
          approved_by?: string | null
          assigned_approver_id?: string | null
          campaign_type?: string
          client_id?: string | null
          constraints?: string | null
          core_message?: string | null
          created_at?: string
          created_by?: string
          destination_url?: string | null
          id?: string
          objective?: string | null
          primary_cta?: string | null
          proof_points?: string[]
          status?: string
          success_metric?: string | null
          target_audience?: string | null
          target_channels?: string[]
          timing_window?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rules: {
        Row: {
          campaign_name: string
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "campaign_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          platforms: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          platforms?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          platforms?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          client_id: string | null
          confirmation_source: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          draft_copy: string
          external_post_id: string
          id: string
          is_sample: boolean
          rationale: string | null
          tone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          client_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          draft_copy: string
          external_post_id: string
          id?: string
          is_sample?: boolean
          rationale?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          client_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          draft_copy?: string
          external_post_id?: string
          id?: string
          is_sample?: boolean
          rationale?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "connected_sources_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_weight_definitions: {
        Row: {
          capability: string
          credits: number
          label: string
          sort_order: number
          unit_cost_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          capability: string
          credits: number
          label: string
          sort_order?: number
          unit_cost_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          capability?: string
          credits?: number
          label?: string
          sort_order?: number
          unit_cost_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cta_banks: {
        Row: {
          bank_name: string
          category: string
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          ctas?: string[]
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cta_banks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          id: string
          operation_id: string
          reason: string | null
          status: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string
          id?: string
          operation_id: string
          reason?: string | null
          status: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          id?: string
          operation_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "delivery_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_capabilities: {
        Row: {
          dispatch_ready: boolean
          live_enabled: boolean
          platform: string
          verified_at: string | null
        }
        Insert: {
          dispatch_ready?: boolean
          live_enabled?: boolean
          platform: string
          verified_at?: string | null
        }
        Update: {
          dispatch_ready?: boolean
          live_enabled?: boolean
          platform?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      delivery_operations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          intended_at: string | null
          intent: string
          platform: string
          platform_post_id: string | null
          post_card_id: string
          reason: string | null
          revision: number
          social_account_id: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          intended_at?: string | null
          intent: string
          platform: string
          platform_post_id?: string | null
          post_card_id: string
          reason?: string | null
          revision: number
          social_account_id: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          intended_at?: string | null
          intent?: string
          platform?: string
          platform_post_id?: string | null
          post_card_id?: string
          reason?: string | null
          revision?: number
          social_account_id?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_operations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_operations_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_operations_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider_secrets: {
        Row: {
          id: boolean
          secret: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          secret: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_provider_settings: {
        Row: {
          connected_as: string | null
          from_email: string | null
          from_name: string | null
          id: boolean
          last_test_at: string | null
          last_test_error: string | null
          last_test_ok: boolean | null
          provider: string
          sending_paused: boolean
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean
          smtp_username: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connected_as?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: boolean
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_ok?: boolean | null
          provider?: string
          sending_paused?: boolean
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean
          smtp_username?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connected_as?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: boolean
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_ok?: boolean | null
          provider?: string
          sending_paused?: boolean
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean
          smtp_username?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      engagement_targets: {
        Row: {
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "engagement_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      external_posts: {
        Row: {
          author_context: Json | null
          author_name: string | null
          client_id: string | null
          confirmation_source: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          estimated_engagement: number
          external_url: string
          id: string
          is_commented: boolean
          is_sample: boolean
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
          author_context?: Json | null
          author_name?: string | null
          client_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          estimated_engagement?: number
          external_url: string
          id?: string
          is_commented?: boolean
          is_sample?: boolean
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
          author_context?: Json | null
          author_name?: string | null
          client_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          estimated_engagement?: number
          external_url?: string
          id?: string
          is_commented?: boolean
          is_sample?: boolean
          platform?: Database["public"]["Enums"]["platform_type"]
          post_content?: string | null
          recommended_comment_angle?: string | null
          relevance_score?: number | null
          risk_flag?: Database["public"]["Enums"]["risk_flag"]
          risk_notes?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_batches: {
        Row: {
          batch_name: string | null
          card_count: number
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "generation_batches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_counts: {
        Row: {
          client_id: string | null
          id: string
          image_count: number
          video_count: number
          year_month: string
        }
        Insert: {
          client_id?: string | null
          id?: string
          image_count?: number
          video_count?: number
          year_month: string
        }
        Update: {
          client_id?: string | null
          id?: string
          image_count?: number
          video_count?: number
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_counts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_alerts: {
        Row: {
          bucket: string
          created_at: string
          id: string
          projected_month_end_cents: number
          requires_owner: boolean
          resumed_at: string | null
          resumed_by: string | null
          spend_cents: number
          status: string
          threshold_label: string
          threshold_type: string
          trip_number: number
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          projected_month_end_cents?: number
          requires_owner?: boolean
          resumed_at?: string | null
          resumed_by?: string | null
          spend_cents?: number
          status?: string
          threshold_label: string
          threshold_type: string
          trip_number?: number
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          projected_month_end_cents?: number
          requires_owner?: boolean
          resumed_at?: string | null
          resumed_by?: string | null
          spend_cents?: number
          status?: string
          threshold_label?: string
          threshold_type?: string
          trip_number?: number
        }
        Relationships: []
      }
      guardrail_settings: {
        Row: {
          client_id: string | null
          created_at: string
          custom_terms: Json
          disabled_terms: string[]
          enabled_tiers: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          custom_terms?: Json
          disabled_terms?: string[]
          enabled_tiers?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          custom_terms?: Json
          disabled_terms?: string[]
          enabled_tiers?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_banks: {
        Row: {
          bank_name: string
          category: string
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_banks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          doc: string
          id: string
          marketing_email: boolean
          marketing_sms: boolean
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          doc: string
          id?: string
          marketing_email?: boolean
          marketing_sms?: boolean
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          doc?: string
          id?: string
          marketing_email?: boolean
          marketing_sms?: boolean
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      master_content_objects: {
        Row: {
          brief_id: string
          brief_version: number
          client_id: string | null
          core_message: string
          created_at: string
          created_by: string
          cta: string | null
          destination_url: string | null
          id: string
          is_stale: boolean
          owner_id: string | null
          proof_points: string[]
          rationale: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brief_id: string
          brief_version?: number
          client_id?: string | null
          core_message: string
          created_at?: string
          created_by?: string
          cta?: string | null
          destination_url?: string | null
          id?: string
          is_stale?: boolean
          owner_id?: string | null
          proof_points?: string[]
          rationale?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief_id?: string
          brief_version?: number
          client_id?: string | null
          core_message?: string
          created_at?: string
          created_by?: string
          cta?: string | null
          destination_url?: string | null
          id?: string
          is_stale?: boolean
          owner_id?: string | null
          proof_points?: string[]
          rationale?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_content_objects_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "campaign_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_content_objects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_applications: {
        Row: {
          address: string | null
          consent_at: string | null
          contact_email: string
          contact_name: string
          corroboration: Json | null
          country: string
          cra_number: string | null
          created_at: string
          decided_at: string | null
          document_paths: Json
          ein: string
          grace_until: string | null
          id: string
          intended_tier: string | null
          last_recheck_at: string | null
          legal_name: string
          letter_path: string
          matched_name: string | null
          reverification_due: string | null
          review_notes: string | null
          review_route: string | null
          reviewer_id: string | null
          status: string
          submitted_by: string
          verification_method: string
          verified_until: string | null
        }
        Insert: {
          address?: string | null
          consent_at?: string | null
          contact_email: string
          contact_name: string
          corroboration?: Json | null
          country?: string
          cra_number?: string | null
          created_at?: string
          decided_at?: string | null
          document_paths?: Json
          ein: string
          grace_until?: string | null
          id?: string
          intended_tier?: string | null
          last_recheck_at?: string | null
          legal_name: string
          letter_path: string
          matched_name?: string | null
          reverification_due?: string | null
          review_notes?: string | null
          review_route?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_by: string
          verification_method?: string
          verified_until?: string | null
        }
        Update: {
          address?: string | null
          consent_at?: string | null
          contact_email?: string
          contact_name?: string
          corroboration?: Json | null
          country?: string
          cra_number?: string | null
          created_at?: string
          decided_at?: string | null
          document_paths?: Json
          ein?: string
          grace_until?: string | null
          id?: string
          intended_tier?: string | null
          last_recheck_at?: string | null
          legal_name?: string
          letter_path?: string
          matched_name?: string | null
          reverification_due?: string | null
          review_notes?: string | null
          review_route?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_by?: string
          verification_method?: string
          verified_until?: string | null
        }
        Relationships: []
      }
      nonprofit_decision_log: {
        Row: {
          application_id: string
          created_at: string
          id: string
          irs_result: string | null
          matched_name: string | null
          notes: string | null
          outcome: string
          plan_applied: string | null
          reviewer_id: string | null
          source: string | null
          source_citation: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          irs_result?: string | null
          matched_name?: string | null
          notes?: string | null
          outcome: string
          plan_applied?: string | null
          reviewer_id?: string | null
          source?: string | null
          source_citation?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          irs_result?: string | null
          matched_name?: string | null
          notes?: string | null
          outcome?: string
          plan_applied?: string | null
          reviewer_id?: string | null
          source?: string | null
          source_citation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nonprofit_decision_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "nonprofit_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_recheck_runs: {
        Row: {
          checked: number
          id: string
          lapsed: number
          notices_sent: number
          ran_at: string
          sent_to_review: number
        }
        Insert: {
          checked?: number
          id?: string
          lapsed?: number
          notices_sent?: number
          ran_at?: string
          sent_to_review?: number
        }
        Update: {
          checked?: number
          id?: string
          lapsed?: number
          notices_sent?: number
          ran_at?: string
          sent_to_review?: number
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string
          dedupe_key: string
          error: string | null
          id: string
          kind: string
          ok: boolean
          post_card_id: string | null
          preference_id: string | null
          recipient_email: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          error?: string | null
          id?: string
          kind: string
          ok: boolean
          post_card_id?: string | null
          preference_id?: string | null
          recipient_email: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          error?: string | null
          id?: string
          kind?: string
          ok?: boolean
          post_card_id?: string | null
          preference_id?: string | null
          recipient_email?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          client_ids: string[]
          created_at: string
          created_by: string | null
          daily_digest: boolean
          id: string
          is_active: boolean
          post_went_out: boolean
          publishing_report: boolean
          recipient_email: string
          report_frequency: string
          send_time: string
          time_zone: string
          updated_at: string
          user_id: string | null
          weekly_summary: boolean
        }
        Insert: {
          client_ids?: string[]
          created_at?: string
          created_by?: string | null
          daily_digest?: boolean
          id?: string
          is_active?: boolean
          post_went_out?: boolean
          publishing_report?: boolean
          recipient_email: string
          report_frequency?: string
          send_time?: string
          time_zone?: string
          updated_at?: string
          user_id?: string | null
          weekly_summary?: boolean
        }
        Update: {
          client_ids?: string[]
          created_at?: string
          created_by?: string | null
          daily_digest?: boolean
          id?: string
          is_active?: boolean
          post_went_out?: boolean
          publishing_report?: boolean
          recipient_email?: string
          report_frequency?: string
          send_time?: string
          time_zone?: string
          updated_at?: string
          user_id?: string | null
          weekly_summary?: boolean
        }
        Relationships: []
      }
      notify_me: {
        Row: {
          created_at: string
          email: string
          feature_key: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          feature_key: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          feature_key?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          client_id: string | null
          code_verifier: string | null
          created_at: string
          platform: string
          state: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          code_verifier?: string | null
          created_at?: string
          platform: string
          state: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          code_verifier?: string | null
          created_at?: string
          platform?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_rules: {
        Row: {
          char_limit: number | null
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "platform_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      post_cards: {
        Row: {
          ai_assisted: boolean | null
          apply_ai_disclosure: boolean
          approval_status: Database["public"]["Enums"]["approval_status"]
          assigned_to: string | null
          audience: string | null
          batch_id: string | null
          brief_id: string | null
          campaign_pillar: string | null
          client_id: string | null
          confirmation_source: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string
          delivered_at: string | null
          delivery_status: string
          draft_copy: string
          first_comment: string | null
          hashtags: string[] | null
          id: string
          import_source: string | null
          is_sample: boolean
          master_content_id: string | null
          media_urls: string[]
          objective: string | null
          org_tags: string[] | null
          package_checksum: string | null
          package_generated_at: string | null
          people_tags: string[] | null
          platform: Database["public"]["Enums"]["platform_type"]
          post_number: number | null
          posted_at: string | null
          posted_url: string | null
          posting_notes: string | null
          publishing_status: string
          rationale: string | null
          readiness_changed_at: string
          readiness_revision: number
          repurposed_from_id: string | null
          revision_notes: string | null
          scheduled_by: string | null
          scheduled_for: string | null
          source_references: string[] | null
          suggested_asset_description: string | null
          target_account_ids: string[]
          timezone: string
          updated_at: string
          updated_by: string | null
          voice_profile_id: string | null
        }
        Insert: {
          ai_assisted?: boolean | null
          apply_ai_disclosure?: boolean
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assigned_to?: string | null
          audience?: string | null
          batch_id?: string | null
          brief_id?: string | null
          campaign_pillar?: string | null
          client_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by: string
          delivered_at?: string | null
          delivery_status?: string
          draft_copy: string
          first_comment?: string | null
          hashtags?: string[] | null
          id?: string
          import_source?: string | null
          is_sample?: boolean
          master_content_id?: string | null
          media_urls?: string[]
          objective?: string | null
          org_tags?: string[] | null
          package_checksum?: string | null
          package_generated_at?: string | null
          people_tags?: string[] | null
          platform: Database["public"]["Enums"]["platform_type"]
          post_number?: number | null
          posted_at?: string | null
          posted_url?: string | null
          posting_notes?: string | null
          publishing_status?: string
          rationale?: string | null
          readiness_changed_at?: string
          readiness_revision?: number
          repurposed_from_id?: string | null
          revision_notes?: string | null
          scheduled_by?: string | null
          scheduled_for?: string | null
          source_references?: string[] | null
          suggested_asset_description?: string | null
          target_account_ids?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          voice_profile_id?: string | null
        }
        Update: {
          ai_assisted?: boolean | null
          apply_ai_disclosure?: boolean
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assigned_to?: string | null
          audience?: string | null
          batch_id?: string | null
          brief_id?: string | null
          campaign_pillar?: string | null
          client_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivery_status?: string
          draft_copy?: string
          first_comment?: string | null
          hashtags?: string[] | null
          id?: string
          import_source?: string | null
          is_sample?: boolean
          master_content_id?: string | null
          media_urls?: string[]
          objective?: string | null
          org_tags?: string[] | null
          package_checksum?: string | null
          package_generated_at?: string | null
          people_tags?: string[] | null
          platform?: Database["public"]["Enums"]["platform_type"]
          post_number?: number | null
          posted_at?: string | null
          posted_url?: string | null
          posting_notes?: string | null
          publishing_status?: string
          rationale?: string | null
          readiness_changed_at?: string
          readiness_revision?: number
          repurposed_from_id?: string | null
          revision_notes?: string | null
          scheduled_by?: string | null
          scheduled_for?: string | null
          source_references?: string[] | null
          suggested_asset_description?: string | null
          target_account_ids?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_cards_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "generation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cards_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "campaign_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cards_master_content_id_fkey"
            columns: ["master_content_id"]
            isOneToOne: false
            referencedRelation: "master_content_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cards_repurposed_from_id_fkey"
            columns: ["repurposed_from_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cards_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_results: {
        Row: {
          clicks: number
          client_id: string | null
          comments: number
          id: string
          impressions: number
          notes: string | null
          post_card_id: string
          reactions: number
          recorded_at: string
          recorded_by: string
          saves: number
          shares: number
        }
        Insert: {
          clicks?: number
          client_id?: string | null
          comments?: number
          id?: string
          impressions?: number
          notes?: string | null
          post_card_id: string
          reactions?: number
          recorded_at?: string
          recorded_by?: string
          saves?: number
          shares?: number
        }
        Update: {
          clicks?: number
          client_id?: string | null
          comments?: number
          id?: string
          impressions?: number
          notes?: string | null
          post_card_id?: string
          reactions?: number
          recorded_at?: string
          recorded_by?: string
          saves?: number
          shares?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_results_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      post_versions: {
        Row: {
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "post_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_versions_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      preflight_reviews: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledged_findings: Json | null
          ai_error: string | null
          client_id: string | null
          created_at: string
          draft_checksum: string
          findings: Json
          governance_revision: number | null
          id: string
          model: string | null
          motive_breakdown: Json | null
          motive_score: number | null
          overall_status: string
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          post_card_id: string
          readiness_revision: number | null
          run_by: string
          voice_score: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_findings?: Json | null
          ai_error?: string | null
          client_id?: string | null
          created_at?: string
          draft_checksum: string
          findings?: Json
          governance_revision?: number | null
          id?: string
          model?: string | null
          motive_breakdown?: Json | null
          motive_score?: number | null
          overall_status?: string
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          post_card_id: string
          readiness_revision?: number | null
          run_by: string
          voice_score?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_findings?: Json | null
          ai_error?: string | null
          client_id?: string | null
          created_at?: string
          draft_checksum?: string
          findings?: Json
          governance_revision?: number | null
          id?: string
          model?: string | null
          motive_breakdown?: Json | null
          motive_score?: number | null
          overall_status?: string
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          post_card_id?: string
          readiness_revision?: number | null
          run_by?: string
          voice_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preflight_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preflight_reviews_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config_audit: {
        Row: {
          after: Json | null
          before: Json | null
          changed_by: string | null
          created_at: string
          entity: string
          entity_key: string
          id: string
        }
        Insert: {
          after?: Json | null
          before?: Json | null
          changed_by?: string | null
          created_at?: string
          entity: string
          entity_key: string
          id?: string
        }
        Update: {
          after?: Json | null
          before?: Json | null
          changed_by?: string | null
          created_at?: string
          entity?: string
          entity_key?: string
          id?: string
        }
        Relationships: []
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
      publish_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          client_id: string | null
          cost_cents: number | null
          error_code: string | null
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          post_card_id: string
          run_id: string | null
          social_account_id: string | null
          status: string
        }
        Insert: {
          attempt_number?: number
          attempted_at?: string
          client_id?: string | null
          cost_cents?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          post_card_id: string
          run_id?: string | null
          social_account_id?: string | null
          status: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          client_id?: string | null
          cost_cents?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_card_id?: string
          run_id?: string | null
          social_account_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_attempts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_attempts_post_card_id_fkey"
            columns: ["post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_attempts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_runs: {
        Row: {
          backlog_remaining: number
          channels_skipped: number
          channels_staged: number
          error_message: string | null
          finished_at: string | null
          id: string
          posts_processed: number
          started_at: string
          status: string
        }
        Insert: {
          backlog_remaining?: number
          channels_skipped?: number
          channels_staged?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          posts_processed?: number
          started_at?: string
          status?: string
        }
        Update: {
          backlog_remaining?: number
          channels_skipped?: number
          channels_staged?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          posts_processed?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      publishing_credentials: {
        Row: {
          client_id: string
          client_secret: string
          id: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          id?: string
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          id?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reporting_connectors: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          key_created_at: string | null
          key_hash: string | null
          key_prefix: string | null
          last_used_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          key_created_at?: string | null
          key_hash?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          provider: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          key_created_at?: string | null
          key_hash?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      repurpose_suggestions: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          dismissed: boolean
          draft_copy: string | null
          hashtags: string[]
          id: string
          is_actioned: boolean
          rationale: string
          repurpose_type: Database["public"]["Enums"]["repurpose_type"]
          result_post_card_id: string | null
          source_asset_id: string | null
          source_excerpt: string | null
          source_post_card_id: string | null
          target_content_type: Database["public"]["Enums"]["content_type"]
          target_platform: Database["public"]["Enums"]["platform_type"]
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          dismissed?: boolean
          draft_copy?: string | null
          hashtags?: string[]
          id?: string
          is_actioned?: boolean
          rationale: string
          repurpose_type: Database["public"]["Enums"]["repurpose_type"]
          result_post_card_id?: string | null
          source_asset_id?: string | null
          source_excerpt?: string | null
          source_post_card_id?: string | null
          target_content_type: Database["public"]["Enums"]["content_type"]
          target_platform: Database["public"]["Enums"]["platform_type"]
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          dismissed?: boolean
          draft_copy?: string | null
          hashtags?: string[]
          id?: string
          is_actioned?: boolean
          rationale?: string
          repurpose_type?: Database["public"]["Enums"]["repurpose_type"]
          result_post_card_id?: string | null
          source_asset_id?: string | null
          source_excerpt?: string | null
          source_post_card_id?: string | null
          target_content_type?: Database["public"]["Enums"]["content_type"]
          target_platform?: Database["public"]["Enums"]["platform_type"]
        }
        Relationships: [
          {
            foreignKeyName: "repurpose_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurpose_suggestions_result_post_card_id_fkey"
            columns: ["result_post_card_id"]
            isOneToOne: false
            referencedRelation: "post_cards"
            referencedColumns: ["id"]
          },
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
      social_account_tokens: {
        Row: {
          access_token: string
          refresh_token: string | null
          social_account_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          refresh_token?: string | null
          social_account_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          refresh_token?: string | null
          social_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_account_tokens_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: true
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          account_name: string
          avatar_path: string | null
          client_id: string
          connected_at: string | null
          connection_metadata: Json
          connection_status: string
          created_at: string
          external_account_id: string | null
          handle: string | null
          id: string
          is_active: boolean
          page_id: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          profile_url: string | null
          scopes: string[]
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          avatar_path?: string | null
          client_id: string
          connected_at?: string | null
          connection_metadata?: Json
          connection_status?: string
          created_at?: string
          external_account_id?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean
          page_id?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          profile_url?: string | null
          scopes?: string[]
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          avatar_path?: string | null
          client_id?: string
          connected_at?: string | null
          connection_metadata?: Json
          connection_status?: string
          created_at?: string
          external_account_id?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean
          page_id?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          profile_url?: string | null
          scopes?: string[]
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      source_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "source_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_processed_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      subscription_tier_definitions: {
        Row: {
          allowances: Json
          annual_price_cents: number
          created_at: string
          created_by: string | null
          id: string
          implementation_fee_cents: number
          is_current: boolean
          monthly_price_cents: number
          name: string
          nonprofit_annual_price_cents: number
          nonprofit_implementation_fee_cents: number
          sort_order: number
          tier_slug: string
          version: number
        }
        Insert: {
          allowances?: Json
          annual_price_cents: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_fee_cents: number
          is_current?: boolean
          monthly_price_cents: number
          name: string
          nonprofit_annual_price_cents: number
          nonprofit_implementation_fee_cents: number
          sort_order?: number
          tier_slug: string
          version?: number
        }
        Update: {
          allowances?: Json
          annual_price_cents?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_fee_cents?: number
          is_current?: boolean
          monthly_price_cents?: number
          name?: string
          nonprofit_annual_price_cents?: number
          nonprofit_implementation_fee_cents?: number
          sort_order?: number
          tier_slug?: string
          version?: number
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          actor_id: string | null
          bucket: string
          capability: string | null
          client_id: string | null
          cost_cents: number
          created_at: string
          credits: number
          id: string
          quantity: number
        }
        Insert: {
          actor_id?: string | null
          bucket: string
          capability?: string | null
          client_id?: string | null
          cost_cents?: number
          created_at?: string
          credits?: number
          id?: string
          quantity?: number
        }
        Update: {
          actor_id?: string | null
          bucket?: string
          capability?: string | null
          client_id?: string | null
          cost_cents?: number
          created_at?: string
          credits?: number
          id?: string
          quantity?: number
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
      voice_profiles: {
        Row: {
          banned_phrases: string[]
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          linkedin_url: string | null
          name: string
          pov_statement: string | null
          role_title: string | null
          sample_posts: string[]
          topics: string[]
          updated_at: string
          voice_traits: string[]
        }
        Insert: {
          banned_phrases?: string[]
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name: string
          pov_statement?: string | null
          role_title?: string | null
          sample_posts?: string[]
          topics?: string[]
          updated_at?: string
          voice_traits?: string[]
        }
        Update: {
          banned_phrases?: string[]
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name?: string
          pov_statement?: string | null
          role_title?: string | null
          sample_posts?: string[]
          topics?: string[]
          updated_at?: string
          voice_traits?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_billing: {
        Row: {
          anomaly_counters: Json
          billing_cycle: string
          billing_mode: string
          billing_status: string
          bonus_credits: number
          bonus_text_drafts: number
          cycle_end: string
          cycle_start: string
          id: boolean
          level2_degraded: boolean
          media_credits_used: number
          nonprofit_status: string
          paused_buckets: string[]
          payment_method_status: string
          price_override_cents: number | null
          resume_delegate_user_id: string | null
          storage_bytes: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          text_drafts_used: number
          tier_definition_version: number
          tier_slug: string
          updated_at: string
          video_draft_rollover: number
          video_draft_used: number
          video_premium_rollover: number
          video_premium_used: number
          x_spend_cents: number
        }
        Insert: {
          anomaly_counters?: Json
          billing_cycle?: string
          billing_mode?: string
          billing_status?: string
          bonus_credits?: number
          bonus_text_drafts?: number
          cycle_end?: string
          cycle_start?: string
          id?: boolean
          level2_degraded?: boolean
          media_credits_used?: number
          nonprofit_status?: string
          paused_buckets?: string[]
          payment_method_status?: string
          price_override_cents?: number | null
          resume_delegate_user_id?: string | null
          storage_bytes?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          text_drafts_used?: number
          tier_definition_version?: number
          tier_slug?: string
          updated_at?: string
          video_draft_rollover?: number
          video_draft_used?: number
          video_premium_rollover?: number
          video_premium_used?: number
          x_spend_cents?: number
        }
        Update: {
          anomaly_counters?: Json
          billing_cycle?: string
          billing_mode?: string
          billing_status?: string
          bonus_credits?: number
          bonus_text_drafts?: number
          cycle_end?: string
          cycle_start?: string
          id?: boolean
          level2_degraded?: boolean
          media_credits_used?: number
          nonprofit_status?: string
          paused_buckets?: string[]
          payment_method_status?: string
          price_override_cents?: number | null
          resume_delegate_user_id?: string | null
          storage_bytes?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          text_drafts_used?: number
          tier_definition_version?: number
          tier_slug?: string
          updated_at?: string
          video_draft_rollover?: number
          video_draft_used?: number
          video_premium_rollover?: number
          video_premium_used?: number
          x_spend_cents?: number
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          client_ids: string[]
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          client_ids?: string[]
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          client_ids?: string[]
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          ai_image_provider: string
          ai_video_provider: string
          app_domain: string | null
          auto_admin_domain: string | null
          client_limit: number | null
          company_logo_url: string | null
          company_name: string
          created_at: string
          default_timezone: string
          entity_label_plural: string
          entity_label_singular: string
          environment: string
          executive_review_enabled: boolean
          governance_revision: number
          id: boolean
          is_demo_master: boolean
          org_type: string
          plan_name: string
          post_approval_required: boolean
          preflight_mode: string
          review_chips: Json
          seat_limit: number | null
          setup_progress: Json
          updated_at: string
          updated_by: string | null
          workspace_id: string
          x_monthly_spend_cap_cents: number
        }
        Insert: {
          ai_image_provider?: string
          ai_video_provider?: string
          app_domain?: string | null
          auto_admin_domain?: string | null
          client_limit?: number | null
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          default_timezone?: string
          entity_label_plural?: string
          entity_label_singular?: string
          environment?: string
          executive_review_enabled?: boolean
          governance_revision?: number
          id?: boolean
          is_demo_master?: boolean
          org_type?: string
          plan_name?: string
          post_approval_required?: boolean
          preflight_mode?: string
          review_chips?: Json
          seat_limit?: number | null
          setup_progress?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
          x_monthly_spend_cap_cents?: number
        }
        Update: {
          ai_image_provider?: string
          ai_video_provider?: string
          app_domain?: string | null
          auto_admin_domain?: string | null
          client_limit?: number | null
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          default_timezone?: string
          entity_label_plural?: string
          entity_label_singular?: string
          environment?: string
          executive_review_enabled?: boolean
          governance_revision?: number
          id?: boolean
          is_demo_master?: boolean
          org_type?: string
          plan_name?: string
          post_approval_required?: boolean
          preflight_mode?: string
          review_chips?: Json
          seat_limit?: number | null
          setup_progress?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
          x_monthly_spend_cap_cents?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_preflight: {
        Args: { _reason?: string; _review: string }
        Returns: undefined
      }
      addon_catalog: { Args: never; Returns: Json }
      ai_provider_status: {
        Args: never
        Returns: {
          configured: boolean
          provider: string
          updated_at: string
        }[]
      }
      billing_snapshot: { Args: never; Returns: Json }
      can_approve_brief: {
        Args: { _brief_id: string; _user_id: string }
        Returns: boolean
      }
      can_control_spend: { Args: { _user_id: string }; Returns: boolean }
      can_create_content: { Args: { _user_id: string }; Returns: boolean }
      can_edit_content: { Args: { _user_id: string }; Returns: boolean }
      cancel_delivery_schedule: { Args: { _post: string }; Returns: undefined }
      clear_demo_content: {
        Args: { _confirm: string; _purge_media?: boolean }
        Returns: Json
      }
      comment_counts: { Args: { _client: string }; Returns: Json }
      consume_usage: {
        Args: {
          _bucket: string
          _capability: string
          _client_id?: string
          _dry_run?: boolean
          _quantity?: number
        }
        Returns: Json
      }
      corrective_regression_checks: { Args: never; Returns: Json }
      create_reporting_key: { Args: { _provider: string }; Returns: string }
      current_draft_checksum: {
        Args: { _copy: string; _tags: string[] }
        Returns: string
      }
      decide_brief: {
        Args: { _brief_id: string; _decision: string; _notes: string }
        Returns: undefined
      }
      delivery_readiness_internal: {
        Args: { _actor: string; _post: string }
        Returns: Json
      }
      demo_content_counts: { Args: never; Returns: Json }
      evaluate_anomalies: { Args: { _bucket: string }; Returns: undefined }
      grant_addon: {
        Args: {
          _kind: string
          _note?: string
          _packs: number
          _request_key: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { _user_id: string }; Returns: boolean }
      list_workspace_users: {
        Args: never
        Returns: {
          display_name: string
          email: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
      log_activity: {
        Args: { _action: string; _details: Json; _target: string }
        Returns: undefined
      }
      mark_commented: { Args: { _external_post: string }; Returns: Json }
      mark_posted_manual: {
        Args: { _post: string; _url?: string }
        Returns: Json
      }
      nonprofit_annual_recheck: { Args: never; Returns: Json }
      plan_post_date: {
        Args: {
          _platform?: Database["public"]["Enums"]["platform_type"]
          _post: string
          _when: string
        }
        Returns: undefined
      }
      post_readiness: { Args: { _post: string }; Returns: Json }
      prepare_blank_copy: { Args: { _confirm: string }; Returns: undefined }
      process_scheduled_posts: { Args: { _cap?: number }; Returns: Json }
      publishing_credentials_status: {
        Args: never
        Returns: {
          client_id_hint: string
          configured: boolean
          provider: string
          updated_at: string
        }[]
      }
      reconcile_delivery: {
        Args: {
          _operation: string
          _outcome: string
          _platform_post_id?: string
          _reason?: string
        }
        Returns: undefined
      }
      remove_workspace_user: { Args: { _user_id: string }; Returns: undefined }
      reset_demo_allowances: { Args: never; Returns: undefined }
      reset_workspace_content: {
        Args: { _confirm: string }
        Returns: undefined
      }
      resume_guardrail_bucket: {
        Args: { _alert_id: string }
        Returns: undefined
      }
      return_comment_to_queue: { Args: { _post: string }; Returns: undefined }
      review_nonprofit_application: {
        Args: { _decision: string; _id: string; _notes: string }
        Returns: undefined
      }
      roll_clip_allowances: { Args: never; Returns: undefined }
      set_billing_mode: { Args: { _mode: string }; Returns: undefined }
      set_resume_delegate: { Args: { _user_id: string }; Returns: undefined }
      set_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      submit_brief: {
        Args: { _approver: string; _brief_id: string; _note: string }
        Returns: undefined
      }
      submit_delivery: {
        Args: {
          _accounts: string[]
          _disclosure?: boolean
          _post: string
          _timezone?: string
          _when?: string
        }
        Returns: Json
      }
      transfer_ownership: { Args: { _new_owner: string }; Returns: undefined }
      update_credit_weight: {
        Args: { _capability: string; _credits: number }
        Returns: undefined
      }
      update_tier_definition: {
        Args: { _changes: Json; _slug: string }
        Returns: number
      }
      user_can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      workspace_role: { Args: { _user_id: string }; Returns: string }
      workspace_usage: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "member" | "owner" | "editor" | "reviewer" | "viewer"
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
      platform_type: "linkedin" | "instagram" | "facebook" | "youtube" | "x"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "member", "owner", "editor", "reviewer", "viewer"],
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
      platform_type: ["linkedin", "instagram", "facebook", "youtube", "x"],
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

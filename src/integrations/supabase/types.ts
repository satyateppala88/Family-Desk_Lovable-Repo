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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string
          household_id: string
          id: string
          last_message_at: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          household_id: string
          id?: string
          last_message_at?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          household_id?: string
          id?: string
          last_message_at?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          expires_at: string | null
          household_id: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          suggestion_type: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          expires_at?: string | null
          household_id: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          suggestion_type: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          access_token_enc: string | null
          color: string
          created_at: string | null
          display_name: string
          google_account_email: string
          household_id: string
          id: string
          is_visible: boolean | null
          refresh_token: string | null
          refresh_token_enc: string | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_enc?: string | null
          color?: string
          created_at?: string | null
          display_name: string
          google_account_email: string
          household_id: string
          id?: string
          is_visible?: boolean | null
          refresh_token?: string | null
          refresh_token_enc?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_enc?: string | null
          color?: string
          created_at?: string | null
          display_name?: string
          google_account_email?: string
          household_id?: string
          id?: string
          is_visible?: boolean | null
          refresh_token?: string | null
          refresh_token_enc?: string | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_settings: {
        Row: {
          created_at: string | null
          default_view: string | null
          household_id: string
          id: string
          show_weekends: boolean | null
          week_starts_on: number | null
        }
        Insert: {
          created_at?: string | null
          default_view?: string | null
          household_id: string
          id?: string
          show_weekends?: boolean | null
          week_starts_on?: number | null
        }
        Update: {
          created_at?: string | null
          default_view?: string | null
          household_id?: string
          id?: string
          show_weekends?: boolean | null
          week_starts_on?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_logs: {
        Row: {
          challenge_id: string
          completed: boolean
          created_at: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_logs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "household_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "household_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plan_items: {
        Row: {
          ai_reasoning: string | null
          created_at: string
          daily_plan_id: string
          id: string
          position: number
          score: number
          task_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string
          daily_plan_id: string
          id?: string
          position: number
          score?: number
          task_id: string
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string
          daily_plan_id?: string
          id?: string
          position?: number
          score?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_items_daily_plan_id_fkey"
            columns: ["daily_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_plan_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plans: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          date: string
          generated_at: string
          household_id: string
          id: string
          user_id: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          date: string
          generated_at?: string
          household_id: string
          id?: string
          user_id: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          date?: string
          generated_at?: string
          household_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      dietary_preferences: {
        Row: {
          created_at: string
          cuisine_preferences: string[] | null
          household_id: string
          id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuisine_preferences?: string[] | null
          household_id: string
          id?: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuisine_preferences?: string[] | null
          household_id?: string
          id?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dietary_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      finance_accounts: {
        Row: {
          balance: number
          created_at: string
          created_by: string
          currency: string
          household_id: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by: string
          currency?: string
          household_id: string
          id?: string
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string
          currency?: string
          household_id?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budgets: {
        Row: {
          annual_amount: number | null
          budget_type: string
          category: string
          created_at: string
          created_by: string
          household_id: string
          id: string
          is_recurring: boolean
          month: string
          planned_amount: number
          updated_at: string
        }
        Insert: {
          annual_amount?: number | null
          budget_type?: string
          category: string
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          is_recurring?: boolean
          month: string
          planned_amount?: number
          updated_at?: string
        }
        Update: {
          annual_amount?: number | null
          budget_type?: string
          category?: string
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          is_recurring?: boolean
          month?: string
          planned_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "finance_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_chat_sessions: {
        Row: {
          created_at: string
          household_id: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_chat_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_custom_cards: {
        Row: {
          added_by: string
          annual_fee: number
          bank: string
          benefits: Json
          color: string
          created_at: string
          household_id: string
          id: string
          milestones: Json
          name: string
          network: string
          perks: Json
          source: string | null
          updated_at: string
        }
        Insert: {
          added_by: string
          annual_fee?: number
          bank: string
          benefits?: Json
          color?: string
          created_at?: string
          household_id: string
          id?: string
          milestones?: Json
          name: string
          network?: string
          perks?: Json
          source?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          annual_fee?: number
          bank?: string
          benefits?: Json
          color?: string
          created_at?: string
          household_id?: string
          id?: string
          milestones?: Json
          name?: string
          network?: string
          perks?: Json
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      finance_custom_categories: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          key: string
          label: string
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          key: string
          label: string
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          key?: string
          label?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_monthly_snapshots: {
        Row: {
          budget_health_score: number | null
          created_at: string
          household_id: string
          id: string
          month: string
          savings_actual: number
          total_income: number
          total_spend: number
        }
        Insert: {
          budget_health_score?: number | null
          created_at?: string
          household_id: string
          id?: string
          month: string
          savings_actual?: number
          total_income?: number
          total_spend?: number
        }
        Update: {
          budget_health_score?: number | null
          created_at?: string
          household_id?: string
          id?: string
          month?: string
          savings_actual?: number
          total_income?: number
          total_spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_monthly_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_savings_goals: {
        Row: {
          created_at: string
          created_by: string
          current_amount: number
          household_id: string
          id: string
          name: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_amount?: number
          household_id: string
          id?: string
          name: string
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_amount?: number
          household_id?: string
          id?: string
          name?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_savings_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_subscriptions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          currency: string
          end_date: string | null
          frequency: string
          household_id: string
          id: string
          is_active: boolean
          name: string
          next_due_date: string | null
          notes: string | null
          recurrence: Json | null
          recurrence_end: Json | null
          start_date: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by: string
          currency?: string
          end_date?: string | null
          frequency?: string
          household_id: string
          id?: string
          is_active?: boolean
          name: string
          next_due_date?: string | null
          notes?: string | null
          recurrence?: Json | null
          recurrence_end?: Json | null
          start_date?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          currency?: string
          end_date?: string | null
          frequency?: string
          household_id?: string
          id?: string
          is_active?: boolean
          name?: string
          next_due_date?: string | null
          notes?: string | null
          recurrence?: Json | null
          recurrence_end?: Json | null
          start_date?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          household_id: string
          id: string
          is_recurring: boolean
          notes: string | null
          paid_by: string | null
          recurring_pattern: Json | null
          savings_goal_id: string | null
          tagged_member: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          household_id: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          paid_by?: string | null
          recurring_pattern?: Json | null
          savings_goal_id?: string | null
          tagged_member?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          household_id?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          paid_by?: string | null
          recurring_pattern?: Json | null
          savings_goal_id?: string | null
          tagged_member?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_savings_goal_id_fkey"
            columns: ["savings_goal_id"]
            isOneToOne: false
            referencedRelation: "finance_savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_user_cards: {
        Row: {
          added_by: string
          card_catalog_id: string
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          nickname: string | null
          updated_at: string
        }
        Insert: {
          added_by: string
          card_catalog_id: string
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          card_catalog_id?: string
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          nickname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_user_cards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_assignees: {
        Row: {
          created_at: string | null
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_assignees_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_badges: {
        Row: {
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      habit_coach_recommendations: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          dismissed: boolean
          generated_at: string
          household_id: string
          id: string
          recommendation_type: string
          user_id: string | null
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          dismissed?: boolean
          generated_at?: string
          household_id: string
          id?: string
          recommendation_type?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          dismissed?: boolean
          generated_at?: string
          household_id?: string
          id?: string
          recommendation_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_coach_recommendations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          actual_value: number | null
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          is_freeze: boolean
          log_date: string
          logged_at: string
          notes: string | null
          user_id: string
        }
        Insert: {
          actual_value?: number | null
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          is_freeze?: boolean
          log_date: string
          logged_at?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          actual_value?: number | null
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          is_freeze?: boolean
          log_date?: string
          logged_at?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_scores: {
        Row: {
          created_at: string | null
          daily_score: number
          household_id: string
          id: string
          score_date: string
          streak_bonus: number
          total_score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_score?: number
          household_id: string
          id?: string
          score_date?: string
          streak_bonus?: number
          total_score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_score?: number
          household_id?: string
          id?: string
          score_date?: string
          streak_bonus?: number
          total_score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_scores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_streaks: {
        Row: {
          current_streak: number
          habit_id: string
          id: string
          last_completed_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          habit_id: string
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          habit_id?: string
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          assignment_type: string
          challenge_id: string | null
          color: string | null
          created_at: string
          description: string | null
          frequency_days: number[] | null
          frequency_type: string
          household_id: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          recurrence: Json | null
          recurrence_end: Json | null
          reminder_time: string | null
          target_unit: string | null
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_type?: string
          challenge_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          frequency_days?: number[] | null
          frequency_type?: string
          household_id: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          recurrence?: Json | null
          recurrence_end?: Json | null
          reminder_time?: string | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_type?: string
          challenge_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          frequency_days?: number[] | null
          frequency_type?: string
          household_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          recurrence?: Json | null
          recurrence_end?: Json | null
          reminder_time?: string | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_challenges: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          emoji: string
          end_date: string
          household_id: string
          id: string
          name: string
          start_date: string
          started_by: string
          status: string
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days: number
          emoji?: string
          end_date: string
          household_id: string
          id?: string
          name: string
          start_date?: string
          started_by: string
          status?: string
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          emoji?: string
          end_date?: string
          household_id?: string
          id?: string
          name?: string
          start_date?: string
          started_by?: string
          status?: string
          template_id?: string
        }
        Relationships: []
      }
      household_enabled_products: {
        Row: {
          enabled_at: string
          enabled_by: string | null
          household_id: string
          id: string
          product_name: string
        }
        Insert: {
          enabled_at?: string
          enabled_by?: string | null
          household_id: string
          id?: string
          product_name: string
        }
        Update: {
          enabled_at?: string
          enabled_by?: string | null
          household_id?: string
          id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_enabled_products_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_family_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          relationship: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          name: string
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          name?: string
          relationship?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      household_habit_goals: {
        Row: {
          created_at: string
          created_by: string
          current_value: number
          description: string | null
          end_date: string
          household_id: string
          id: string
          metric_type: string
          name: string
          start_date: string
          status: string
          target_value: number
        }
        Insert: {
          created_at?: string
          created_by: string
          current_value?: number
          description?: string | null
          end_date: string
          household_id: string
          id?: string
          metric_type?: string
          name: string
          start_date: string
          status?: string
          target_value: number
        }
        Update: {
          created_at?: string
          created_by?: string
          current_value?: number
          description?: string | null
          end_date?: string
          household_id?: string
          id?: string
          metric_type?: string
          name?: string
          start_date?: string
          status?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "household_habit_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invitations: {
        Row: {
          created_at: string
          household_id: string
          household_name: string | null
          id: string
          invitation_type: string
          invited_by: string | null
          invitee_email: string
          invitee_name: string | null
          invitee_user_id: string | null
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          household_name?: string | null
          id?: string
          invitation_type?: string
          invited_by?: string | null
          invitee_email: string
          invitee_name?: string | null
          invitee_user_id?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          household_name?: string | null
          id?: string
          invitation_type?: string
          invited_by?: string | null
          invitee_email?: string
          invitee_name?: string | null
          invitee_user_id?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_preferences: {
        Row: {
          budget_consciousness: string | null
          calendar_setup_complete: boolean
          children_ages: number[] | null
          completed_module_setups: Json
          cooking_skill_level: string | null
          created_at: string | null
          diet_type: string | null
          family_size_adults: number | null
          family_size_children: number | null
          family_size_seniors: number | null
          festival_importance: string | null
          finance_setup_complete: boolean
          food_allergies: string[] | null
          grocery_setup_complete: boolean
          habits_setup_complete: boolean
          household_concerns: string[] | null
          household_id: string
          household_type: string | null
          id: string
          meals_setup_complete: boolean
          monthly_grocery_budget: string | null
          organic_preference: string | null
          pantry_size: string | null
          preferred_meal_types: string[] | null
          preferred_task_time: string | null
          regional_cuisines: string[] | null
          religious_restrictions: string | null
          shopping_frequency: string | null
          shopping_locations: string[] | null
          spice_level: string | null
          updated_at: string | null
          week_start_day: string | null
          weekday_cooking_time: string | null
          work_schedule: string | null
        }
        Insert: {
          budget_consciousness?: string | null
          calendar_setup_complete?: boolean
          children_ages?: number[] | null
          completed_module_setups?: Json
          cooking_skill_level?: string | null
          created_at?: string | null
          diet_type?: string | null
          family_size_adults?: number | null
          family_size_children?: number | null
          family_size_seniors?: number | null
          festival_importance?: string | null
          finance_setup_complete?: boolean
          food_allergies?: string[] | null
          grocery_setup_complete?: boolean
          habits_setup_complete?: boolean
          household_concerns?: string[] | null
          household_id: string
          household_type?: string | null
          id?: string
          meals_setup_complete?: boolean
          monthly_grocery_budget?: string | null
          organic_preference?: string | null
          pantry_size?: string | null
          preferred_meal_types?: string[] | null
          preferred_task_time?: string | null
          regional_cuisines?: string[] | null
          religious_restrictions?: string | null
          shopping_frequency?: string | null
          shopping_locations?: string[] | null
          spice_level?: string | null
          updated_at?: string | null
          week_start_day?: string | null
          weekday_cooking_time?: string | null
          work_schedule?: string | null
        }
        Update: {
          budget_consciousness?: string | null
          calendar_setup_complete?: boolean
          children_ages?: number[] | null
          completed_module_setups?: Json
          cooking_skill_level?: string | null
          created_at?: string | null
          diet_type?: string | null
          family_size_adults?: number | null
          family_size_children?: number | null
          family_size_seniors?: number | null
          festival_importance?: string | null
          finance_setup_complete?: boolean
          food_allergies?: string[] | null
          grocery_setup_complete?: boolean
          habits_setup_complete?: boolean
          household_concerns?: string[] | null
          household_id?: string
          household_type?: string | null
          id?: string
          meals_setup_complete?: boolean
          monthly_grocery_budget?: string | null
          organic_preference?: string | null
          pantry_size?: string | null
          preferred_meal_types?: string[] | null
          preferred_task_time?: string | null
          regional_cuisines?: string[] | null
          religious_restrictions?: string | null
          shopping_frequency?: string | null
          shopping_locations?: string[] | null
          spice_level?: string | null
          updated_at?: string | null
          week_start_day?: string | null
          weekday_cooking_time?: string | null
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_completed_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_completed_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_completed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      manual_calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string
          description: string | null
          end_at: string
          exception_dates: string[]
          household_id: string
          id: string
          is_system_generated: boolean
          location: string | null
          member_ids: string[]
          parent_event_id: string | null
          recurrence: Json | null
          repeat_type: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          end_at: string
          exception_dates?: string[]
          household_id: string
          id?: string
          is_system_generated?: boolean
          location?: string | null
          member_ids?: string[]
          parent_event_id?: string | null
          recurrence?: Json | null
          repeat_type?: string
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string
          exception_dates?: string[]
          household_id?: string
          id?: string
          is_system_generated?: boolean
          location?: string | null
          member_ids?: string[]
          parent_event_id?: string | null
          recurrence?: Json | null
          repeat_type?: string
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_calendar_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_calendar_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "manual_calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          cooked_at: string | null
          created_at: string
          day_of_week: number
          id: string
          meal_plan_id: string
          meal_type: string
          notes: string | null
          recipe_id: string | null
          scheduled_date: string | null
        }
        Insert: {
          cooked_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          meal_plan_id: string
          meal_type: string
          notes?: string | null
          recipe_id?: string | null
          scheduled_date?: string | null
        }
        Update: {
          cooked_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          meal_plan_id?: string
          meal_type?: string
          notes?: string | null
          recipe_id?: string | null
          scheduled_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          ai_suggestions: boolean
          calendar: boolean
          created_at: string
          daily_plan: boolean
          finance: boolean
          habits: boolean
          invites: boolean
          meals: boolean
          pantry: boolean
          pantry_daily_reminder: boolean
          tasks: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggestions?: boolean
          calendar?: boolean
          created_at?: string
          daily_plan?: boolean
          finance?: boolean
          habits?: boolean
          invites?: boolean
          meals?: boolean
          pantry?: boolean
          pantry_daily_reminder?: boolean
          tasks?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggestions?: boolean
          calendar?: boolean
          created_at?: string
          daily_plan?: boolean
          finance?: boolean
          habits?: boolean
          invites?: boolean
          meals?: boolean
          pantry?: boolean
          pantry_daily_reminder?: boolean
          tasks?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pantry_categories: {
        Row: {
          created_at: string
          household_id: string
          icon: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pantry_categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_item_usage: {
        Row: {
          confirmed_by: string
          id: string
          meal_plan_item_id: string | null
          pantry_item_id: string
          quantity_used: number
          used_at: string
        }
        Insert: {
          confirmed_by: string
          id?: string
          meal_plan_item_id?: string | null
          pantry_item_id: string
          quantity_used: number
          used_at?: string
        }
        Update: {
          confirmed_by?: string
          id?: string
          meal_plan_item_id?: string | null
          pantry_item_id?: string
          quantity_used?: number
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_item_usage_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_item_usage_pantry_item_id_fkey"
            columns: ["pantry_item_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          added_by: string
          average_usage_days: number | null
          category: string | null
          created_at: string
          expiry_date: string | null
          household_id: string
          id: string
          is_staple: boolean | null
          last_purchased_at: string | null
          location: string | null
          minimum_quantity: number | null
          name: string
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          added_by: string
          average_usage_days?: number | null
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          household_id: string
          id?: string
          is_staple?: boolean | null
          last_purchased_at?: string | null
          location?: string | null
          minimum_quantity?: number | null
          name: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          average_usage_days?: number | null
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          household_id?: string
          id?: string
          is_staple?: boolean | null
          last_purchased_at?: string | null
          location?: string | null
          minimum_quantity?: number | null
          name?: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_events: {
        Row: {
          capability: string
          created_at: string
          id: string
          metadata: Json
          outcome: string
          platform: string
          surface: string
          user_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          id?: string
          metadata?: Json
          outcome: string
          platform?: string
          surface?: string
          user_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          id?: string
          metadata?: Json
          outcome?: string
          platform?: string
          surface?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      policy_versions: {
        Row: {
          change_type: Database["public"]["Enums"]["policy_change_type"]
          changes: string[]
          created_at: string
          doc_type: Database["public"]["Enums"]["policy_doc_type"]
          effective_date: string
          id: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          change_type: Database["public"]["Enums"]["policy_change_type"]
          changes?: string[]
          created_at?: string
          doc_type: Database["public"]["Enums"]["policy_doc_type"]
          effective_date: string
          id?: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["policy_change_type"]
          changes?: string[]
          created_at?: string
          doc_type?: Database["public"]["Enums"]["policy_doc_type"]
          effective_date?: string
          id?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          completed_tours: Json | null
          created_at: string
          display_name: string | null
          email_verified_at: string | null
          id: string
          last_freeze_used_at: string | null
          onboarding_completed: boolean | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          preferred_language: string | null
          region: string | null
          streak_freeze_period: string | null
          streak_freezes_remaining: number
          terms_accepted_at: string | null
          updated_at: string
          whatsapp_opted_in: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          completed_tours?: Json | null
          created_at?: string
          display_name?: string | null
          email_verified_at?: string | null
          id: string
          last_freeze_used_at?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          preferred_language?: string | null
          region?: string | null
          streak_freeze_period?: string | null
          streak_freezes_remaining?: number
          terms_accepted_at?: string | null
          updated_at?: string
          whatsapp_opted_in?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          completed_tours?: Json | null
          created_at?: string
          display_name?: string | null
          email_verified_at?: string | null
          id?: string
          last_freeze_used_at?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          preferred_language?: string | null
          region?: string | null
          streak_freeze_period?: string | null
          streak_freezes_remaining?: number
          terms_accepted_at?: string | null
          updated_at?: string
          whatsapp_opted_in?: boolean | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          household_id: string
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          household_id: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          household_id?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      push_dispatch_config: {
        Row: {
          base_url: string
          id: boolean
          updated_at: string
        }
        Insert: {
          base_url: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          base_url?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          cook_time: number | null
          created_at: string
          created_by: string
          cuisine_type: string | null
          description: string | null
          difficulty: string | null
          hidden: boolean
          household_id: string
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          is_favorite: boolean | null
          nutritional_info: Json | null
          prep_time: number | null
          rating: number | null
          rating_count: number
          servings: number | null
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          cook_time?: number | null
          created_at?: string
          created_by: string
          cuisine_type?: string | null
          description?: string | null
          difficulty?: string | null
          hidden?: boolean
          household_id: string
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_favorite?: boolean | null
          nutritional_info?: Json | null
          prep_time?: number | null
          rating?: number | null
          rating_count?: number
          servings?: number | null
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          cook_time?: number | null
          created_at?: string
          created_by?: string
          cuisine_type?: string | null
          description?: string | null
          difficulty?: string | null
          hidden?: boolean
          household_id?: string
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_favorite?: boolean | null
          nutritional_info?: Json | null
          prep_time?: number | null
          rating?: number | null
          rating_count?: number
          servings?: number | null
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          category: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_checked: boolean | null
          list_id: string
          name: string
          pantry_item_id: string | null
          quantity: number | null
          recipe_source: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean | null
          list_id: string
          name: string
          pantry_item_id?: string | null
          quantity?: number | null
          recipe_source?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean | null
          list_id?: string
          name?: string
          pantry_item_id?: string | null
          quantity?: number | null
          recipe_source?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_pantry_item_id_fkey"
            columns: ["pantry_item_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          auto_generated: boolean | null
          completed_at: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          meal_plan_id: string | null
          name: string
          status: string
        }
        Insert: {
          auto_generated?: boolean | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          meal_plan_id?: string | null
          name: string
          status?: string
        }
        Update: {
          auto_generated?: boolean | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          meal_plan_id?: string | null
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_calendar_events: {
        Row: {
          created_at: string
          event_date: string
          id: string
          is_recurring_annual: boolean
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          is_recurring_annual?: boolean
          kind: string
          name: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          is_recurring_annual?: boolean
          kind?: string
          name?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          household_id: string
          id: string
          priority: string
          priority_level: number | null
          project_id: string | null
          recurrence: Json | null
          recurring: boolean | null
          recurring_pattern: Json | null
          source_calendar_event_id: string | null
          started_at: string | null
          status: string
          task_category: Database["public"]["Enums"]["task_category"] | null
          task_status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          household_id: string
          id?: string
          priority?: string
          priority_level?: number | null
          project_id?: string | null
          recurrence?: Json | null
          recurring?: boolean | null
          recurring_pattern?: Json | null
          source_calendar_event_id?: string | null
          started_at?: string | null
          status?: string
          task_category?: Database["public"]["Enums"]["task_category"] | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          household_id?: string
          id?: string
          priority?: string
          priority_level?: number | null
          project_id?: string | null
          recurrence?: Json | null
          recurring?: boolean | null
          recurring_pattern?: Json | null
          source_calendar_event_id?: string | null
          started_at?: string | null
          status?: string
          task_category?: Database["public"]["Enums"]["task_category"] | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_preferences: {
        Row: {
          access_updates: boolean | null
          created_at: string | null
          daily_plan_whatsapp: boolean | null
          habit_reminders: boolean | null
          habit_reminders_whatsapp: boolean | null
          household_invitations: boolean | null
          household_invitations_whatsapp: boolean | null
          id: string
          meal_summaries: boolean | null
          pantry_alerts: boolean | null
          pantry_alerts_whatsapp: boolean | null
          task_notifications: boolean | null
          task_notifications_whatsapp: boolean | null
          updated_at: string | null
          user_id: string
          weekly_digest: boolean | null
          weekly_digest_whatsapp: boolean | null
        }
        Insert: {
          access_updates?: boolean | null
          created_at?: string | null
          daily_plan_whatsapp?: boolean | null
          habit_reminders?: boolean | null
          habit_reminders_whatsapp?: boolean | null
          household_invitations?: boolean | null
          household_invitations_whatsapp?: boolean | null
          id?: string
          meal_summaries?: boolean | null
          pantry_alerts?: boolean | null
          pantry_alerts_whatsapp?: boolean | null
          task_notifications?: boolean | null
          task_notifications_whatsapp?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_digest?: boolean | null
          weekly_digest_whatsapp?: boolean | null
        }
        Update: {
          access_updates?: boolean | null
          created_at?: string | null
          daily_plan_whatsapp?: boolean | null
          habit_reminders?: boolean | null
          habit_reminders_whatsapp?: boolean | null
          household_invitations?: boolean | null
          household_invitations_whatsapp?: boolean | null
          id?: string
          meal_summaries?: boolean | null
          pantry_alerts?: boolean | null
          pantry_alerts_whatsapp?: boolean | null
          task_notifications?: boolean | null
          task_notifications_whatsapp?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_digest?: boolean | null
          weekly_digest_whatsapp?: boolean | null
        }
        Relationships: []
      }
      user_habit_badges: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          habit_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at?: string
          habit_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          habit_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_habit_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "habit_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_habit_badges_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_steps: string[] | null
          current_step: number | null
          id: string
          preferences_completed: boolean | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[] | null
          current_step?: number | null
          id?: string
          preferences_completed?: boolean | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[] | null
          current_step?: number | null
          id?: string
          preferences_completed?: boolean | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          household_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          household_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          household_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calendar_connections_safe: {
        Row: {
          color: string | null
          created_at: string | null
          display_name: string | null
          google_account_email: string | null
          household_id: string | null
          id: string | null
          is_visible: boolean | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_name?: string | null
          google_account_email?: string | null
          household_id?: string | null
          id?: string | null
          is_visible?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_name?: string | null
          google_account_email?: string | null
          household_id?: string | null
          id?: string | null
          is_visible?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_events_daily: {
        Row: {
          capability: string | null
          day: string | null
          event_count: number | null
          outcome: string | null
          platform: string | null
          surface: string | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dispatch_push: {
        Args: {
          _body: string
          _channel: string
          _data?: Json
          _tag?: string
          _title: string
          _url?: string
          _user_ids: string[]
        }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_invite_code: { Args: never; Returns: string }
      get_calendar_tokens: {
        Args: { _connection_id: string; _key: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      get_household_member_emails: {
        Args: { _household_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_household_role: {
        Args: {
          _household_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_calendar_connection: {
        Args: {
          _access_token: string
          _color: string
          _display_name: string
          _email: string
          _expires_at: string
          _household_id: string
          _key: string
          _refresh_token: string
          _user_id: string
        }
        Returns: string
      }
      is_email_approved: { Args: { user_email: string }; Returns: boolean }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      log_household_habit: {
        Args: { _actual_value?: number; _completed: boolean; _habit_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      update_completed_tour: { Args: { _key: string }; Returns: undefined }
      upsert_calendar_tokens: {
        Args: {
          _access_token: string
          _connection_id: string
          _expires_at: string
          _key: string
          _refresh_token: string
        }
        Returns: undefined
      }
      vault_upsert_push_key: { Args: { _key: string }; Returns: undefined }
    }
    Enums: {
      app_role: "household_admin" | "member" | "platform_admin"
      policy_change_type: "major" | "minor"
      policy_doc_type: "privacy" | "terms"
      project_status: "planning" | "in_progress" | "blocked" | "done"
      project_type: "home" | "work" | "personal" | "other"
      task_category: "home" | "work" | "kid" | "other"
      task_status: "backlog" | "today" | "in_progress" | "blocked" | "done"
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
      app_role: ["household_admin", "member", "platform_admin"],
      policy_change_type: ["major", "minor"],
      policy_doc_type: ["privacy", "terms"],
      project_status: ["planning", "in_progress", "blocked", "done"],
      project_type: ["home", "work", "personal", "other"],
      task_category: ["home", "work", "kid", "other"],
      task_status: ["backlog", "today", "in_progress", "blocked", "done"],
    },
  },
} as const

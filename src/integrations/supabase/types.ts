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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          function_name: string
          id: string
          mode: string | null
          model: string
          quality: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          mode?: string | null
          model: string
          quality?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          mode?: string | null
          model?: string
          quality?: string | null
          user_id?: string
        }
        Relationships: []
      }
      edit_history: {
        Row: {
          created_at: string
          description: string
          id: string
          mode: string
          original_image: string
          result_image: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          mode: string
          original_image: string
          result_image: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          mode?: string
          original_image?: string
          result_image?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_first_payment: boolean
          plan_id: string | null
          reference: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_first_payment?: boolean
          plan_id?: string | null
          reference: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_first_payment?: boolean
          plan_id?: string | null
          reference?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          reference: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          reference: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          reference?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          browser: string | null
          created_at: string
          device_info: string | null
          email: string | null
          flagged_suspicious: boolean
          id: string
          ip_address: string | null
          last_seen_at: string | null
          phone_number: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_info?: string | null
          email?: string | null
          flagged_suspicious?: boolean
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_info?: string | null
          email?: string | null
          flagged_suspicious?: boolean
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          payment_reference: string | null
          plan_amount: number
          plan_id: string | null
          referred_user_id: string
          referrer_id: string
          rejected_reason: string | null
          reward_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          payment_reference?: string | null
          plan_amount: number
          plan_id?: string | null
          referred_user_id: string
          referrer_id: string
          rejected_reason?: string | null
          reward_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          payment_reference?: string | null
          plan_amount?: number
          plan_id?: string | null
          referred_user_id?: string
          referrer_id?: string
          rejected_reason?: string | null
          reward_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      showcase_examples: {
        Row: {
          after_alt: string
          after_image: string
          before_alt: string
          before_image: string
          created_at: string
          generation_seconds: number
          id: string
          prompt: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          after_alt?: string
          after_image: string
          before_alt?: string
          before_image: string
          created_at?: string
          generation_seconds?: number
          id?: string
          prompt: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          after_alt?: string
          after_image?: string
          before_alt?: string
          before_image?: string
          created_at?: string
          generation_seconds?: number
          id?: string
          prompt?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      slider_events: {
        Row: {
          created_at: string
          event_type: string
          example_id: string | null
          id: string
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          example_id?: string | null
          id?: string
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          example_id?: string | null
          id?: string
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slider_events_example_id_fkey"
            columns: ["example_id"]
            isOneToOne: false
            referencedRelation: "showcase_examples"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          blocked: boolean
          created_at: string
          id: string
          is_premium: boolean
          tokens: number
          total_earned: number
          trial_uses_remaining: number
          updated_at: string
          user_id: string
          wallet_available: number
          wallet_pending: number
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          id?: string
          is_premium?: boolean
          tokens?: number
          total_earned?: number
          trial_uses_remaining?: number
          updated_at?: string
          user_id: string
          wallet_available?: number
          wallet_pending?: number
        }
        Update: {
          blocked?: boolean
          created_at?: string
          id?: string
          is_premium?: boolean
          tokens?: number
          total_earned?: number
          trial_uses_remaining?: number
          updated_at?: string
          user_id?: string
          wallet_available?: number
          wallet_pending?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          momo_number: string
          network: string
          paid_at: string | null
          paystack_transfer_code: string | null
          recipient_code: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          momo_number: string
          network: string
          paid_at?: string | null
          paystack_transfer_code?: string | null
          recipient_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          momo_number?: string
          network?: string
          paid_at?: string | null
          paystack_transfer_code?: string | null
          recipient_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_referral_reward: {
        Args: { p_referral_id: string }
        Returns: Json
      }
      check_and_deduct_credits: {
        Args: { p_token_cost: number; p_user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_withdrawal_failed: {
        Args: { p_reason: string; p_withdrawal_id: string }
        Returns: Json
      }
      mark_withdrawal_paid: {
        Args: { p_transfer_code?: string; p_withdrawal_id: string }
        Returns: Json
      }
      reject_referral_reward: {
        Args: { p_reason: string; p_referral_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: { p_amount: number; p_momo_number: string; p_network: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

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
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_category: string
          action_type: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_hwids: {
        Row: {
          banned_by: string | null
          created_at: string | null
          hwid: string
          id: string
          reason: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string | null
          hwid: string
          id?: string
          reason?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string | null
          hwid?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banned_hwids_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_ips: {
        Row: {
          banned_by: string | null
          created_at: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banned_ips_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          subscription_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          subscription_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          subscription_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          hwid_list: string[] | null
          id: string
          ip_address: string | null
          is_banned: boolean | null
          log_type: string | null
          matched_hwid: string | null
          matched_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          hwid_list?: string[] | null
          id?: string
          ip_address?: string | null
          is_banned?: boolean | null
          log_type?: string | null
          matched_hwid?: string | null
          matched_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          hwid_list?: string[] | null
          id?: string
          ip_address?: string | null
          is_banned?: boolean | null
          log_type?: string | null
          matched_hwid?: string | null
          matched_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debug_logs_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hwid_history: {
        Row: {
          hwid: string
          id: string
          recorded_at: string | null
          user_id: string | null
        }
        Insert: {
          hwid: string
          id?: string
          recorded_at?: string | null
          user_id?: string | null
        }
        Update: {
          hwid?: string
          id?: string
          recorded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hwid_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          method_name: string
          product_id: string | null
          redirect_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          method_name: string
          product_id?: string | null
          redirect_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          method_name?: string
          product_id?: string | null
          redirect_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_payment_methods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          build_version: string | null
          created_at: string | null
          description: string | null
          discord_required_message: string | null
          download_url: string | null
          driver_download: string | null
          global_compensation_hours: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_maintenance: boolean | null
          is_manual_payment_only: boolean | null
          lifetime_payment_url: string | null
          lifetime_price: number | null
          maintenance_started_at: string | null
          month_payment_url: string | null
          month_price: number | null
          name: string
          updated_at: string | null
          week_payment_url: string | null
          week_price: number | null
        }
        Insert: {
          build_version?: string | null
          created_at?: string | null
          description?: string | null
          discord_required_message?: string | null
          download_url?: string | null
          driver_download?: string | null
          global_compensation_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_maintenance?: boolean | null
          is_manual_payment_only?: boolean | null
          lifetime_payment_url?: string | null
          lifetime_price?: number | null
          maintenance_started_at?: string | null
          month_payment_url?: string | null
          month_price?: number | null
          name: string
          updated_at?: string | null
          week_payment_url?: string | null
          week_price?: number | null
        }
        Update: {
          build_version?: string | null
          created_at?: string | null
          description?: string | null
          discord_required_message?: string | null
          download_url?: string | null
          driver_download?: string | null
          global_compensation_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_maintenance?: boolean | null
          is_manual_payment_only?: boolean | null
          lifetime_payment_url?: string | null
          lifetime_price?: number | null
          maintenance_started_at?: string | null
          month_payment_url?: string | null
          month_price?: number | null
          name?: string
          updated_at?: string | null
          week_payment_url?: string | null
          week_price?: number | null
        }
        Relationships: []
      }
      signup_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          token: string
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          token: string
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          token?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_links_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          compensation_hours: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_lifetime: boolean | null
          is_locked: boolean | null
          is_paused: boolean | null
          pause_duration_seconds: number | null
          paused_at: string | null
          product_id: string | null
          starts_at: string | null
          subscription_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          compensation_hours?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_lifetime?: boolean | null
          is_locked?: boolean | null
          is_paused?: boolean | null
          pause_duration_seconds?: number | null
          paused_at?: string | null
          product_id?: string | null
          starts_at?: string | null
          subscription_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          compensation_hours?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_lifetime?: boolean | null
          is_locked?: boolean | null
          is_paused?: boolean | null
          pause_duration_seconds?: number | null
          paused_at?: string | null
          product_id?: string | null
          starts_at?: string | null
          subscription_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          blacklist_reason: string | null
          browser_fingerprint: string | null
          created_at: string | null
          current_hwid: string | null
          email: string
          hwid_reset_count: number | null
          id: string
          is_admin: boolean | null
          is_blacklisted: boolean | null
          language: string | null
          last_fingerprint_data: Json | null
          last_login_at: string | null
          last_login_ip: string | null
          lua_api_access: boolean | null
          password_hash: string
          platform: string | null
          screen_resolution: string | null
          show_email: boolean | null
          timezone: string | null
          updated_at: string | null
          user_agent: string | null
          username: string | null
        }
        Insert: {
          blacklist_reason?: string | null
          browser_fingerprint?: string | null
          created_at?: string | null
          current_hwid?: string | null
          email: string
          hwid_reset_count?: number | null
          id?: string
          is_admin?: boolean | null
          is_blacklisted?: boolean | null
          language?: string | null
          last_fingerprint_data?: Json | null
          last_login_at?: string | null
          last_login_ip?: string | null
          lua_api_access?: boolean | null
          password_hash: string
          platform?: string | null
          screen_resolution?: string | null
          show_email?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_agent?: string | null
          username?: string | null
        }
        Update: {
          blacklist_reason?: string | null
          browser_fingerprint?: string | null
          created_at?: string | null
          current_hwid?: string | null
          email?: string
          hwid_reset_count?: number | null
          id?: string
          is_admin?: boolean | null
          is_blacklisted?: boolean | null
          language?: string | null
          last_fingerprint_data?: Json | null
          last_login_at?: string | null
          last_login_ip?: string | null
          lua_api_access?: boolean | null
          password_hash?: string
          platform?: string | null
          screen_resolution?: string | null
          show_email?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_agent?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

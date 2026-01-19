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
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          created_at: string
          id: string
          paid_at: string | null
          purchase_id: string
          status: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          purchase_id: string
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          purchase_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          commission_rate: number | null
          created_at: string
          id: string
          paid_earnings: number | null
          status: string | null
          total_earnings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_code: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          paid_earnings?: number | null
          status?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_code?: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          paid_earnings?: number | null
          status?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          cert_code: string
          dialect_id: string
          id: string
          issued_at: string
          level_id: string
          public_url: string | null
          user_id: string
        }
        Insert: {
          cert_code: string
          dialect_id: string
          id?: string
          issued_at?: string
          level_id: string
          public_url?: string | null
          user_id: string
        }
        Update: {
          cert_code?: string
          dialect_id?: string
          id?: string
          issued_at?: string
          level_id?: string
          public_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_dialect_id_fkey"
            columns: ["dialect_id"]
            isOneToOne: false
            referencedRelation: "dialects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          purchase_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          purchase_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          purchase_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          affiliate_id: string | null
          code: string
          created_at: string
          current_uses: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_per_user: number | null
          max_redemptions: number | null
          percent_off: number
        }
        Insert: {
          active?: boolean
          affiliate_id?: string | null
          code: string
          created_at?: string
          current_uses?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_per_user?: number | null
          max_redemptions?: number | null
          percent_off?: number
        }
        Update: {
          active?: boolean
          affiliate_id?: string | null
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_per_user?: number | null
          max_redemptions?: number | null
          percent_off?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      dialects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          content: string
          created_at: string | null
          id: string
          recipients_count: number | null
          sent_at: string | null
          subject: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          recipients_count?: number | null
          sent_at?: string | null
          subject: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          recipients_count?: number | null
          sent_at?: string | null
          subject?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          campaign_id: string | null
          id: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          arabic_text: string | null
          audio_url: string | null
          created_at: string
          id: string
          image_url: string | null
          order_index: number
          title: string
          transliteration: string | null
          unit_id: string
        }
        Insert: {
          arabic_text?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          order_index?: number
          title: string
          transliteration?: string | null
          unit_id: string
        }
        Update: {
          arabic_text?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          order_index?: number
          title?: string
          transliteration?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          dialect_id: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          dialect_id: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          dialect_id?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "levels_dialect_id_fkey"
            columns: ["dialect_id"]
            isOneToOne: false
            referencedRelation: "dialects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          provider: string
          provider_txn_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_txn_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_txn_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          affiliate_id: string | null
          amount: number
          coupon_id: string | null
          created_at: string | null
          dialect_id: string | null
          expires_at: string | null
          id: string
          level_id: string | null
          product_id: string
          product_name: string | null
          product_type: string | null
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          amount: number
          coupon_id?: string | null
          created_at?: string | null
          dialect_id?: string | null
          expires_at?: string | null
          id?: string
          level_id?: string | null
          product_id: string
          product_name?: string | null
          product_type?: string | null
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          amount?: number
          coupon_id?: string | null
          created_at?: string | null
          dialect_id?: string | null
          expires_at?: string | null
          id?: string
          level_id?: string | null
          product_id?: string
          product_name?: string | null
          product_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          dialect_id: string | null
          id: string
          level_id: string | null
          name: string
          price: number
          scope: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dialect_id?: string | null
          id?: string
          level_id?: string | null
          name: string
          price?: number
          scope?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dialect_id?: string | null
          id?: string
          level_id?: string | null
          name?: string
          price?: number
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_dialect_id_fkey"
            columns: ["dialect_id"]
            isOneToOne: false
            referencedRelation: "dialects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean | null
          first_name: string | null
          id: string
          last_name: string | null
          marketing_consent: boolean | null
          preferred_dialect_id: string | null
          updated_at: string
          user_id: string
          verification_code: string | null
          verification_code_expires_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          marketing_consent?: boolean | null
          preferred_dialect_id?: string | null
          updated_at?: string
          user_id: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          marketing_consent?: boolean | null
          preferred_dialect_id?: string | null
          updated_at?: string
          user_id?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          affiliate_id: string | null
          amount: number | null
          coupon_id: string | null
          created_at: string
          currency: string | null
          dialect_id: string | null
          id: string
          level_id: string | null
          payment_method: string | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          product_id: string
          product_name: string | null
          product_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          amount?: number | null
          coupon_id?: string | null
          created_at?: string
          currency?: string | null
          dialect_id?: string | null
          id?: string
          level_id?: string | null
          payment_method?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          product_id: string
          product_name?: string | null
          product_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          amount?: number | null
          coupon_id?: string | null
          created_at?: string
          currency?: string | null
          dialect_id?: string | null
          id?: string
          level_id?: string | null
          payment_method?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          product_id?: string
          product_name?: string | null
          product_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          audio_url: string | null
          correct_answer: string
          created_at: string
          id: string
          options_json: Json
          order_index: number
          prompt: string
          quiz_id: string
          type: string
        }
        Insert: {
          audio_url?: string | null
          correct_answer: string
          created_at?: string
          id?: string
          options_json?: Json
          order_index?: number
          prompt: string
          quiz_id: string
          type?: string
        }
        Update: {
          audio_url?: string | null
          correct_answer?: string
          created_at?: string
          id?: string
          options_json?: Json
          order_index?: number
          prompt?: string
          quiz_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level_id: string
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level_id: string
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level_id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      certificates_public: {
        Row: {
          cert_code: string | null
          dialect_id: string | null
          id: string | null
          issued_at: string | null
          level_id: string | null
          public_url: string | null
        }
        Insert: {
          cert_code?: string | null
          dialect_id?: string | null
          id?: string | null
          issued_at?: string | null
          level_id?: string | null
          public_url?: string | null
        }
        Update: {
          cert_code?: string | null
          dialect_id?: string | null
          id?: string | null
          issued_at?: string | null
          level_id?: string | null
          public_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_dialect_id_fkey"
            columns: ["dialect_id"]
            isOneToOne: false
            referencedRelation: "dialects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "affiliate"
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
      app_role: ["admin", "user", "affiliate"],
    },
  },
} as const

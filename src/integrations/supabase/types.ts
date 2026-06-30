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
      affiliate_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          full_name: string
          how_will_promote: string
          id: string
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          full_name: string
          how_will_promote: string
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          full_name?: string
          how_will_promote?: string
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "public_coupons"
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
          applies_to: string
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
          applies_to?: string
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
          applies_to?: string
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
      flashcard_pack_units: {
        Row: {
          order_index: number
          pack_id: string
          unit_id: string
        }
        Insert: {
          order_index?: number
          pack_id: string
          unit_id: string
        }
        Update: {
          order_index?: number
          pack_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_pack_units_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "flashcard_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_pack_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "flashcard_units"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_packs: {
        Row: {
          access_type: string
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          price_cents: number
          product_id: string | null
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          access_type?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          price_cents?: number
          product_id?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          price_cents?: number
          product_id?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_packs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_progress: {
        Row: {
          correct_count: number
          created_at: string
          due_at: string
          ease_factor: number
          flashcard_id: string
          id: string
          incorrect_count: number
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          repetitions: number
          status: Database["public"]["Enums"]["flashcard_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          due_at?: string
          ease_factor?: number
          flashcard_id: string
          id?: string
          incorrect_count?: number
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          repetitions?: number
          status?: Database["public"]["Enums"]["flashcard_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          due_at?: string
          ease_factor?: number
          flashcard_id?: string
          id?: string
          incorrect_count?: number
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          repetitions?: number
          status?: Database["public"]["Enums"]["flashcard_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_purchases: {
        Row: {
          amount_cents: number
          coupon_id: string | null
          created_at: string
          currency: string
          discount_cents: number
          id: string
          pack_id: string
          provider_capture_id: string | null
          provider_code: string
          provider_order_id: string | null
          purchased_at: string | null
          status: Database["public"]["Enums"]["flashcard_purchase_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          pack_id: string
          provider_capture_id?: string | null
          provider_code: string
          provider_order_id?: string | null
          purchased_at?: string | null
          status?: Database["public"]["Enums"]["flashcard_purchase_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          pack_id?: string
          provider_capture_id?: string | null
          provider_code?: string
          provider_order_id?: string | null
          purchased_at?: string | null
          status?: Database["public"]["Enums"]["flashcard_purchase_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "flashcard_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_purchases_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      flashcard_review_log: {
        Row: {
          flashcard_id: string
          id: string
          new_interval: number | null
          prev_interval: number | null
          rating: Database["public"]["Enums"]["flashcard_rating"]
          reviewed_at: string
          user_id: string
        }
        Insert: {
          flashcard_id: string
          id?: string
          new_interval?: number | null
          prev_interval?: number | null
          rating: Database["public"]["Enums"]["flashcard_rating"]
          reviewed_at?: string
          user_id: string
        }
        Update: {
          flashcard_id?: string
          id?: string
          new_interval?: number | null
          prev_interval?: number | null
          rating?: Database["public"]["Enums"]["flashcard_rating"]
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_review_log_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_units: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_free: boolean
          order_index: number
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title_ar: string | null
          title_en: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          order_index?: number
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title_ar?: string | null
          title_en: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          order_index?: number
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title_ar?: string | null
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          arabic_text: string
          audio_example_url: string | null
          audio_url: string | null
          created_at: string
          english_translation: string
          example_arabic: string | null
          example_english: string | null
          id: string
          image_alt: string | null
          image_height: number | null
          image_size_kb: number | null
          image_url: string | null
          image_width: number | null
          kind: Database["public"]["Enums"]["flashcard_kind"]
          notes: string | null
          order_index: number
          published: boolean
          thumbnail_url: string | null
          transliteration: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          arabic_text: string
          audio_example_url?: string | null
          audio_url?: string | null
          created_at?: string
          english_translation: string
          example_arabic?: string | null
          example_english?: string | null
          id?: string
          image_alt?: string | null
          image_height?: number | null
          image_size_kb?: number | null
          image_url?: string | null
          image_width?: number | null
          kind?: Database["public"]["Enums"]["flashcard_kind"]
          notes?: string | null
          order_index?: number
          published?: boolean
          thumbnail_url?: string | null
          transliteration?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          arabic_text?: string
          audio_example_url?: string | null
          audio_url?: string | null
          created_at?: string
          english_translation?: string
          example_arabic?: string | null
          example_english?: string | null
          id?: string
          image_alt?: string | null
          image_height?: number | null
          image_size_kb?: number | null
          image_url?: string | null
          image_width?: number | null
          kind?: Database["public"]["Enums"]["flashcard_kind"]
          notes?: string | null
          order_index?: number
          published?: boolean
          thumbnail_url?: string | null
          transliteration?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "flashcard_units"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_subscribers: {
        Row: {
          email: string
          email_0_sent_at: string | null
          email_1_sent_at: string | null
          email_2_sent_at: string | null
          id: string
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          email_0_sent_at?: string | null
          email_1_sent_at?: string | null
          email_2_sent_at?: string | null
          id?: string
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          email_0_sent_at?: string | null
          email_1_sent_at?: string | null
          email_2_sent_at?: string | null
          id?: string
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
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
      partners: {
        Row: {
          affiliate_id: string | null
          campaign_title: string | null
          coupon_id: string | null
          created_at: string
          cta_text: string | null
          display_name: string
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          landing_enabled: boolean
          notes: string | null
          old_price: number | null
          price_override: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          campaign_title?: string | null
          coupon_id?: string | null
          created_at?: string
          cta_text?: string | null
          display_name: string
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          landing_enabled?: boolean
          notes?: string | null
          old_price?: number | null
          price_override?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          campaign_title?: string | null
          coupon_id?: string | null
          created_at?: string
          cta_text?: string | null
          display_name?: string
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          landing_enabled?: boolean
          notes?: string | null
          old_price?: number | null
          price_override?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "public_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          code: string
          config: Json
          created_at: string
          display_name: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          display_name: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          display_name?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "pending_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "public_coupons"
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
            foreignKeyName: "purchases_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "public_coupons"
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
          first_name: string | null
          id: string | null
          issued_at: string | null
          last_name: string | null
          level_id: string | null
          public_url: string | null
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
      public_coupons: {
        Row: {
          active: boolean | null
          applies_to: string | null
          code: string | null
          current_uses: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string | null
          max_redemptions: number | null
          percent_off: number | null
        }
        Insert: {
          active?: boolean | null
          applies_to?: string | null
          code?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string | null
          max_redemptions?: number | null
          percent_off?: number | null
        }
        Update: {
          active?: boolean | null
          applies_to?: string | null
          code?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string | null
          max_redemptions?: number | null
          percent_off?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_quiz_questions: {
        Args: { _quiz_id: string }
        Returns: {
          audio_url: string | null
          correct_answer: string
          created_at: string
          id: string
          options_json: Json
          order_index: number
          prompt: string
          quiz_id: string
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "quiz_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_pending_applications_count: { Args: never; Returns: number }
      affiliate_my_referrals: {
        Args: never
        Returns: {
          amount: number
          commission_amount: number
          commission_status: string
          coupon_code: string
          coupon_percent_off: number
          created_at: string
          product_name: string
          purchase_id: string
          student_email: string
          student_first_name: string
          student_last_name: string
          student_user_id: string
        }[]
      }
      fc_apply_review: {
        Args: {
          _card_id: string
          _rating: Database["public"]["Enums"]["flashcard_rating"]
        }
        Returns: {
          correct_count: number
          created_at: string
          due_at: string
          ease_factor: number
          flashcard_id: string
          id: string
          incorrect_count: number
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          repetitions: number
          status: Database["public"]["Enums"]["flashcard_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "flashcard_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fc_dashboard_summary: { Args: never; Returns: Json }
      fc_user_can_study_unit: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      fc_user_has_pack_access: {
        Args: { _pack_id: string; _user_id: string }
        Returns: boolean
      }
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
      lookup_coupon: {
        Args: { _code: string }
        Returns: {
          active: boolean
          applies_to: string
          code: string
          discount_percent: number
          expires_at: string
          percent_off: number
        }[]
      }
      user_can_access_unit: { Args: { _unit_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "affiliate"
      flashcard_kind: "learn" | "speaking"
      flashcard_purchase_status: "pending" | "active" | "refunded" | "failed"
      flashcard_rating: "again" | "hard" | "good" | "easy"
      flashcard_status: "new" | "learning" | "review" | "mastered"
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
      flashcard_kind: ["learn", "speaking"],
      flashcard_purchase_status: ["pending", "active", "refunded", "failed"],
      flashcard_rating: ["again", "hard", "good", "easy"],
      flashcard_status: ["new", "learning", "review", "mastered"],
    },
  },
} as const

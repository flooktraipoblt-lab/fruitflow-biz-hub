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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          advertiser: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          priority: number | null
          title: string
        }
        Insert: {
          advertiser: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          priority?: number | null
          title: string
        }
        Update: {
          advertiser?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          priority?: number | null
          title?: string
        }
        Relationships: []
      }
      baskets: {
        Row: {
          basket_date: string
          basket_name: string | null
          basket_type: string
          bill_id: string | null
          created_at: string
          customer: string
          flow: string
          id: string
          owner_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          basket_date?: string
          basket_name?: string | null
          basket_type: string
          bill_id?: string | null
          created_at?: string
          customer: string
          flow?: string
          id?: string
          owner_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          basket_date?: string
          basket_name?: string | null
          basket_type?: string
          bill_id?: string | null
          created_at?: string
          customer?: string
          flow?: string
          id?: string
          owner_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "baskets_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_baskets_bill_id"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          fraction: number
          id: string
          name: string
          owner_id: string
          price: number
          qty: number
          updated_at: string
          weight: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          fraction?: number
          id?: string
          name: string
          owner_id: string
          price?: number
          qty?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          fraction?: number
          id?: string
          name?: string
          owner_id?: string
          price?: number
          qty?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bill_items_bill_id"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_packaging: {
        Row: {
          basket_name: string | null
          basket_type: string
          bill_id: string
          created_at: string
          deduct: boolean
          id: string
          owner_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          basket_name?: string | null
          basket_type: string
          bill_id: string
          created_at?: string
          deduct?: boolean
          id?: string
          owner_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          basket_name?: string | null
          basket_type?: string
          bill_id?: string
          created_at?: string
          deduct?: boolean
          id?: string
          owner_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_packaging_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bill_packaging_bill_id"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_shares: {
        Row: {
          bill_date: string
          bill_id: string
          bill_no: string
          bill_type: string
          created_at: string
          customer_name: string
          id: string
          owner_id: string
          shared_at: string
          total_amount: number
        }
        Insert: {
          bill_date: string
          bill_id: string
          bill_no: string
          bill_type: string
          created_at?: string
          customer_name: string
          id?: string
          owner_id: string
          shared_at?: string
          total_amount: number
        }
        Update: {
          bill_date?: string
          bill_id?: string
          bill_no?: string
          bill_type?: string
          created_at?: string
          customer_name?: string
          id?: string
          owner_id?: string
          shared_at?: string
          total_amount?: number
        }
        Relationships: []
      }
      bills: {
        Row: {
          basket_quantity: number | null
          bill_date: string
          bill_no: string
          created_at: string
          customer: string
          id: string
          owner_id: string
          paper_cost: number | null
          processing_price_kg: number | null
          status: string
          total: number
          type: string
          updated_at: string
        }
        Insert: {
          basket_quantity?: number | null
          bill_date?: string
          bill_no?: string
          created_at?: string
          customer: string
          id?: string
          owner_id: string
          paper_cost?: number | null
          processing_price_kg?: number | null
          status?: string
          total?: number
          type: string
          updated_at?: string
        }
        Update: {
          basket_quantity?: number | null
          bill_date?: string
          bill_no?: string
          created_at?: string
          customer?: string
          id?: string
          owner_id?: string
          paper_cost?: number | null
          processing_price_kg?: number | null
          status?: string
          total?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          like_count: number
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          like_count?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
          week_number?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          like_count?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      competitions: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          participant_count: number | null
          prize_amount: number | null
          prize_description: string | null
          rules: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          participant_count?: number | null
          prize_amount?: number | null
          prize_description?: string | null
          rules?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          participant_count?: number | null
          prize_amount?: number | null
          prize_description?: string | null
          rules?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          owner_id: string
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          owner_id: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          owner_id?: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_owner_fk"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_weeks: {
        Row: {
          content: string | null
          created_at: string
          humidity: number | null
          id: string
          image_urls: string[] | null
          lighting_hours: number | null
          owner_id: string
          ph: number | null
          post_id: string
          temperature: number | null
          updated_at: string
          week_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          humidity?: number | null
          id?: string
          image_urls?: string[] | null
          lighting_hours?: number | null
          owner_id: string
          ph?: number | null
          post_id: string
          temperature?: number | null
          updated_at?: string
          week_number: number
        }
        Update: {
          content?: string | null
          created_at?: string
          humidity?: number | null
          id?: string
          image_urls?: string[] | null
          lighting_hours?: number | null
          owner_id?: string
          ph?: number | null
          post_id?: string
          temperature?: number | null
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      employee_absences: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          owner_id: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          owner_id: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          owner_id?: string
          type?: string
        }
        Relationships: []
      }
      employee_withdrawals: {
        Row: {
          amount: number
          created_at: string
          date: string
          employee_id: string
          id: string
          owner_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          owner_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          owner_id?: string
          type?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          daily_rate: number
          end_date: string | null
          id: string
          name: string
          owner_id: string
          phone: string | null
          profile_image_url: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_rate?: number
          end_date?: string | null
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          profile_image_url?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_rate?: number
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          profile_image_url?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_types: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          owner_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          owner_id: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          owner_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      mailbox_messages: {
        Row: {
          created_at: string
          id: string
          items: string
          owner_id: string
          read: boolean
          sender: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: string
          owner_id: string
          read?: boolean
          sender: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: string
          owner_id?: string
          read?: boolean
          sender?: string
          updated_at?: string
        }
        Relationships: []
      }
      mailbox_read_history: {
        Row: {
          created_at: string
          id: string
          items: string
          message_at: string
          owner_id: string
          sender: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: string
          message_at: string
          owner_id: string
          sender: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: string
          message_at?: string
          owner_id?: string
          sender?: string
          updated_at?: string
        }
        Relationships: []
      }
      permission_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_name: string
          setting_value: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_name: string
          setting_value?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_name?: string
          setting_value?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          breeder: string | null
          content: string | null
          created_at: string
          description: string | null
          genetics: string | null
          growing_method: string | null
          humidity: number | null
          id: string
          image_urls: string[] | null
          is_public: boolean | null
          latest_week_id: string | null
          lighting_hours: number | null
          like_count: number | null
          ph: number | null
          plant_name: string | null
          post_type: string | null
          strain_name: string | null
          strain_type: string | null
          tags: string[] | null
          temperature: number | null
          title: string
          updated_at: string
          user_id: string
          view_count: number | null
          vpd: number | null
          week_number: number | null
          week_stage: string | null
        }
        Insert: {
          breeder?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          genetics?: string | null
          growing_method?: string | null
          humidity?: number | null
          id?: string
          image_urls?: string[] | null
          is_public?: boolean | null
          latest_week_id?: string | null
          lighting_hours?: number | null
          like_count?: number | null
          ph?: number | null
          plant_name?: string | null
          post_type?: string | null
          strain_name?: string | null
          strain_type?: string | null
          tags?: string[] | null
          temperature?: number | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number | null
          vpd?: number | null
          week_number?: number | null
          week_stage?: string | null
        }
        Update: {
          breeder?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          genetics?: string | null
          growing_method?: string | null
          humidity?: number | null
          id?: string
          image_urls?: string[] | null
          is_public?: boolean | null
          latest_week_id?: string | null
          lighting_hours?: number | null
          like_count?: number | null
          ph?: number | null
          plant_name?: string | null
          post_type?: string | null
          strain_name?: string | null
          strain_type?: string | null
          tags?: string[] | null
          temperature?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
          vpd?: number | null
          week_number?: number | null
          week_stage?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          nickname: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          nickname?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          nickname?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string
          username?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user_and_confirm_email: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_latest_week_data: {
        Args: { post_uuid: string }
        Returns: {
          humidity: number
          lighting_hours: number
          ph: number
          temperature: number
          week_number: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: {
        Args: { _user_id: string }
        Returns: boolean
      }
      signin_with_username_or_email: {
        Args: { identifier: string; user_password: string }
        Returns: Json
      }
      simple_signup: {
        Args: {
          user_display_name?: string
          user_password: string
          user_username: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

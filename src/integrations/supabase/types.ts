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
      battles: {
        Row: {
          coins_earned: number
          created_at: string
          id: string
          opponent_name: string | null
          opponent_team: Json | null
          player_team: Json | null
          result: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          coins_earned?: number
          created_at?: string
          id?: string
          opponent_name?: string | null
          opponent_team?: Json | null
          player_team?: Json | null
          result: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          coins_earned?: number
          created_at?: string
          id?: string
          opponent_name?: string | null
          opponent_team?: Json | null
          player_team?: Json | null
          result?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      cards: {
        Row: {
          ability: string
          attack: number
          defense: number
          evs: Json
          friendship: number
          held_item: string | null
          hp: number
          id: string
          image_url: string
          level: number
          moves: Json
          name: string
          obtained_at: string
          owner_id: string
          pokemon_id: number
          rarity: string
          sp_atk: number
          sp_def: number
          speed: number
          training_count: number
          types: string[]
          xp: number
        }
        Insert: {
          ability?: string
          attack: number
          defense: number
          evs?: Json
          friendship?: number
          held_item?: string | null
          hp: number
          id?: string
          image_url: string
          level?: number
          moves: Json
          name: string
          obtained_at?: string
          owner_id: string
          pokemon_id: number
          rarity: string
          sp_atk?: number
          sp_def?: number
          speed: number
          training_count?: number
          types: string[]
          xp?: number
        }
        Update: {
          ability?: string
          attack?: number
          defense?: number
          evs?: Json
          friendship?: number
          held_item?: string | null
          hp?: number
          id?: string
          image_url?: string
          level?: number
          moves?: Json
          name?: string
          obtained_at?: string
          owner_id?: string
          pokemon_id?: number
          rarity?: string
          sp_atk?: number
          sp_def?: number
          speed?: number
          training_count?: number
          types?: string[]
          xp?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          item_key: string
          qty: number
          user_id: string
        }
        Insert: {
          id?: string
          item_key: string
          qty?: number
          user_id: string
        }
        Update: {
          id?: string
          item_key?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_key_fkey"
            columns: ["item_key"]
            isOneToOne: false
            referencedRelation: "items_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      items_catalog: {
        Row: {
          description: string
          icon: string | null
          key: string
          name: string
          price: number
        }
        Insert: {
          description: string
          icon?: string | null
          key: string
          name: string
          price: number
        }
        Update: {
          description?: string
          icon?: string | null
          key?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      loadouts: {
        Row: {
          card_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          card_ids: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          card_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_id: number | null
          campaign_progress: number
          coins: number
          created_at: string
          id: string
          losses: number
          starter_claimed: boolean
          username: string | null
          wins: number
        }
        Insert: {
          avatar_id?: number | null
          campaign_progress?: number
          coins?: number
          created_at?: string
          id: string
          losses?: number
          starter_claimed?: boolean
          username?: string | null
          wins?: number
        }
        Update: {
          avatar_id?: number | null
          campaign_progress?: number
          coins?: number
          created_at?: string
          id?: string
          losses?: number
          starter_claimed?: boolean
          username?: string | null
          wins?: number
        }
        Relationships: []
      }
      redeem_codes: {
        Row: {
          code: string
          coins: number
          created_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          coins: number
          created_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          coins?: number
          created_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          card_id: string
          coins_spent: number
          created_at: string
          ev_gained: number
          focus: string
          id: string
          user_id: string
          xp_gained: number
        }
        Insert: {
          card_id: string
          coins_spent?: number
          created_at?: string
          ev_gained?: number
          focus: string
          id?: string
          user_id: string
          xp_gained?: number
        }
        Update: {
          card_id?: string
          coins_spent?: number
          created_at?: string
          ev_gained?: number
          focus?: string
          id?: string
          user_id?: string
          xp_gained?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

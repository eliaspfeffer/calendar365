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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      calendar_invites: {
        Row: {
          calendar_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["calendar_member_role"]
          token: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["calendar_member_role"]
          token: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["calendar_member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_invites_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_members: {
        Row: {
          calendar_id: string
          created_at: string
          role: Database["public"]["Enums"]["calendar_member_role"]
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["calendar_member_role"]
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["calendar_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_public_share_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip_hash: string | null
          share_id: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: number
          ip_hash?: string | null
          share_id: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: number
          ip_hash?: string | null
          share_id?: string
          success?: boolean
        }
        Relationships: []
      }
      calendar_public_shares: {
        Row: {
          calendar_id: string
          created_at: string
          created_by: string | null
          id: string
          password_hash: string | null
          revoked_at: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          password_hash?: string | null
          revoked_at?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          password_hash?: string | null
          revoked_at?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendars: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      note_connections: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          source_note_id?: string
          target_note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_connections_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "sticky_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_connections_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "sticky_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_connections_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      sticky_notes: {
        Row: {
          calendar_id: string
          color: string
          created_at: string
          date: string | null
          id: string
          is_struck: boolean
          pos_x: number | null
          pos_y: number | null
          sort_order: number | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          color?: string
          created_at?: string
          date?: string | null
          id?: string
          is_struck?: boolean
          pos_x?: number | null
          pos_y?: number | null
          sort_order?: number | null
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          color?: string
          created_at?: string
          date?: string | null
          id?: string
          is_struck?: boolean
          pos_x?: number | null
          pos_y?: number | null
          sort_order?: number | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          settings?: Json
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
      accept_calendar_invite: {
        Args: { p_token: string }
        Returns: string
      }
      create_calendar: {
        Args: { p_default_note_color?: string; p_name: string }
        Returns: string
      }
      create_calendar_invite: {
        Args: {
          p_calendar_id: string
          p_expires_in_days?: number
          p_role?: Database["public"]["Enums"]["calendar_member_role"]
        }
        Returns: string
      }
      current_user_has_lifetime_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_user_note_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      delete_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_default_calendar: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_calendar_public_share_settings: {
        Args: { p_calendar_id: string }
        Returns: {
          has_password: boolean
          is_enabled: boolean
          slug: string
        }[]
      }
      get_public_calendar_share_info: {
        Args: { p_slug: string }
        Returns: {
          calendar_name: string
          requires_password: boolean
        }[]
      }
      get_public_calendar_share_snapshot: {
        Args: { p_password?: string | null; p_slug: string }
        Returns: Json
      }
      revoke_calendar_public_share: {
        Args: { p_calendar_id: string }
        Returns: boolean
      }
      set_calendar_public_share: {
        Args: {
          p_calendar_id: string
          p_password?: string | null
          p_remove_password?: boolean
          p_slug: string
        }
        Returns: {
          has_password: boolean
          slug: string
        }[]
      }
    }
    Enums: {
      calendar_member_role: "owner" | "editor" | "viewer"
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  app: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can: {
        Args: { p_permission_key: string; p_target_member_id: string; p_workspace_id: string };
        Returns: boolean;
      };
      current_member_id: { Args: { p_workspace_id: string }; Returns: string };
      enable_feature_with_dependencies: {
        Args: { p_feature_key: string; p_workspace_id: string };
        Returns: string[];
      };
      feature_on: { Args: { p_feature_key: string; p_workspace_id: string }; Returns: boolean };
      has_permission: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: boolean;
      };
      held_reaches: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: Database["public"]["Enums"]["reach"][];
      };
      is_member: { Args: { p_workspace_id: string }; Returns: boolean };
      is_owner: { Args: { p_workspace_id: string }; Returns: boolean };
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      reach_covers: {
        Args: {
          p_held: Database["public"]["Enums"]["reach"][];
          p_wanted: Database["public"]["Enums"]["reach"];
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      feature_dependencies: {
        Row: {
          feature_key: string;
          requires_key: string;
        };
        ComputedFields: never;
        Insert: {
          feature_key: string;
          requires_key: string;
        };
        Update: {
          feature_key?: string;
          requires_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_dependencies_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "feature_dependencies_requires_key_fkey";
            columns: ["requires_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
        ];
      };
      features: {
        Row: {
          description: string;
          is_core: boolean;
          key: string;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          is_core?: boolean;
          key: string;
          name: string;
          sort_order: number;
        };
        Update: {
          description?: string;
          is_core?: boolean;
          key?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      member_roles: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          id: string;
          member_id: string;
          role_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          id?: string;
          member_id: string;
          role_id: string;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          id?: string;
          member_id?: string;
          role_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_roles_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_roles_workspace_id_role_id_fkey";
            columns: ["workspace_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      members: {
        Row: {
          country: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          is_owner: boolean;
          person_key: string | null;
          status: Database["public"]["Enums"]["member_status"];
          time_zone: string | null;
          updated_at: string;
          user_id: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          is_owner?: boolean;
          person_key?: string | null;
          status?: Database["public"]["Enums"]["member_status"];
          time_zone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_owner?: boolean;
          person_key?: string | null;
          status?: Database["public"]["Enums"]["member_status"];
          time_zone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          description: string;
          feature_key: string;
          is_scoped: boolean;
          key: string;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          feature_key: string;
          is_scoped: boolean;
          key: string;
          name: string;
          sort_order: number;
        };
        Update: {
          description?: string;
          feature_key?: string;
          is_scoped?: boolean;
          key?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          id: string;
          last_workspace_id: string | null;
          locale: string;
          time_zone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          last_workspace_id?: string | null;
          locale?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          last_workspace_id?: string | null;
          locale?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_last_workspace_id_fkey";
            columns: ["last_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission_key: string;
          reach: Database["public"]["Enums"]["reach"];
          role_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          permission_key: string;
          reach: Database["public"]["Enums"]["reach"];
          role_id: string;
          workspace_id: string;
        };
        Update: {
          permission_key?: string;
          reach?: Database["public"]["Enums"]["reach"];
          role_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "role_permissions_workspace_id_role_id_fkey";
            columns: ["workspace_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      roles: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string;
          id: string;
          name: string;
          system_key: string | null;
          template_role_key: string | null;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          system_key?: string | null;
          template_role_key?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          system_key?: string | null;
          template_role_key?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plan_features: {
        Row: {
          feature_key: string;
          plan_key: string;
        };
        ComputedFields: never;
        Insert: {
          feature_key: string;
          plan_key: string;
        };
        Update: {
          feature_key?: string;
          plan_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_plan_features_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "subscription_plan_features_plan_key_fkey";
            columns: ["plan_key"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["key"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          key: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          name: string;
        };
        Update: {
          key?: string;
          name?: string;
        };
        Relationships: [];
      };
      template_features: {
        Row: {
          feature_key: string;
          template_key: string;
        };
        ComputedFields: never;
        Insert: {
          feature_key: string;
          template_key: string;
        };
        Update: {
          feature_key?: string;
          template_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "template_features_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "template_features_template_key_fkey";
            columns: ["template_key"];
            isOneToOne: false;
            referencedRelation: "workspace_templates";
            referencedColumns: ["key"];
          },
        ];
      };
      template_role_permissions: {
        Row: {
          permission_key: string;
          reach: Database["public"]["Enums"]["reach"];
          role_key: string;
          template_key: string;
        };
        ComputedFields: never;
        Insert: {
          permission_key: string;
          reach: Database["public"]["Enums"]["reach"];
          role_key: string;
          template_key: string;
        };
        Update: {
          permission_key?: string;
          reach?: Database["public"]["Enums"]["reach"];
          role_key?: string;
          template_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "template_role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "template_role_permissions_template_key_role_key_fkey";
            columns: ["template_key", "role_key"];
            isOneToOne: false;
            referencedRelation: "template_roles";
            referencedColumns: ["template_key", "role_key"];
          },
        ];
      };
      template_roles: {
        Row: {
          description: string;
          name: string;
          role_key: string;
          sort_order: number;
          template_key: string;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          name: string;
          role_key: string;
          sort_order: number;
          template_key: string;
        };
        Update: {
          description?: string;
          name?: string;
          role_key?: string;
          sort_order?: number;
          template_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "template_roles_template_key_fkey";
            columns: ["template_key"];
            isOneToOne: false;
            referencedRelation: "workspace_templates";
            referencedColumns: ["key"];
          },
        ];
      };
      workspace_features: {
        Row: {
          enabled: boolean;
          feature_key: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          enabled: boolean;
          feature_key: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          enabled?: boolean;
          feature_key?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_features_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "workspace_features_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_templates: {
        Row: {
          description: string;
          key: string;
          kind: Database["public"]["Enums"]["workspace_kind"];
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          key: string;
          kind: Database["public"]["Enums"]["workspace_kind"];
          name: string;
          sort_order: number;
        };
        Update: {
          description?: string;
          key?: string;
          kind?: Database["public"]["Enums"]["workspace_kind"];
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          country: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          data_region: string;
          fiscal_year_start_month: number;
          id: string;
          kind: Database["public"]["Enums"]["workspace_kind"];
          name: string;
          plan_key: string;
          slug: string;
          template_key: string;
          time_zone: string;
          updated_at: string;
          week_start: number;
        };
        ComputedFields: never;
        Insert: {
          country: string;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          data_region?: string;
          fiscal_year_start_month?: number;
          id?: string;
          kind: Database["public"]["Enums"]["workspace_kind"];
          name: string;
          plan_key?: string;
          slug: string;
          template_key: string;
          time_zone: string;
          updated_at?: string;
          week_start?: number;
        };
        Update: {
          country?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          data_region?: string;
          fiscal_year_start_month?: number;
          id?: string;
          kind?: Database["public"]["Enums"]["workspace_kind"];
          name?: string;
          plan_key?: string;
          slug?: string;
          template_key?: string;
          time_zone?: string;
          updated_at?: string;
          week_start?: number;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_plan_key_fkey";
            columns: ["plan_key"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "workspaces_template_key_fkey";
            columns: ["template_key"];
            isOneToOne: false;
            referencedRelation: "workspace_templates";
            referencedColumns: ["key"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_role: {
        Args: { p_member_id: string; p_role_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      create_workspace: {
        Args: {
          p_country: string;
          p_currency: string;
          p_fiscal_year_start_month?: number;
          p_name: string;
          p_slug: string;
          p_template_key: string;
          p_time_zone: string;
          p_week_start?: number;
        };
        Returns: {
          country: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          data_region: string;
          fiscal_year_start_month: number;
          id: string;
          kind: Database["public"]["Enums"]["workspace_kind"];
          name: string;
          plan_key: string;
          slug: string;
          template_key: string;
          time_zone: string;
          updated_at: string;
          week_start: number;
        };
        SetofOptions: {
          from: "*";
          to: "workspaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_workspace: { Args: { p_workspace_id: string }; Returns: undefined };
      my_permissions: {
        Args: { p_workspace_id: string };
        Returns: {
          permission_key: string;
          reaches: Database["public"]["Enums"]["reach"][];
        }[];
      };
      remove_role: {
        Args: { p_member_id: string; p_role_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      set_feature: {
        Args: {
          p_enabled: boolean;
          p_feature_key: string;
          p_include_dependants?: boolean;
          p_workspace_id: string;
        };
        Returns: string[];
      };
      set_member_status: {
        Args: {
          p_member_id: string;
          p_status: Database["public"]["Enums"]["member_status"];
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      transfer_ownership: {
        Args: { p_keep_ownership?: boolean; p_member_id: string; p_workspace_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      member_status: "active" | "invited" | "inactive";
      reach: "own" | "reports" | "team" | "team_and_below" | "units" | "workspace";
      workspace_kind: "personal" | "team" | "company";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  app: {
    Enums: {},
  },
  public: {
    Enums: {
      member_status: ["active", "invited", "inactive"],
      reach: ["own", "reports", "team", "team_and_below", "units", "workspace"],
      workspace_kind: ["personal", "team", "company"],
    },
  },
} as const;

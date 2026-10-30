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
      assignment_on: {
        Args: { p_date: string; p_member_id: string };
        Returns: Database["public"]["Tables"]["member_assignments"]["Row"];
        SetofOptions: {
          from: "*";
          to: "member_assignments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      avatar_owner: { Args: { p_name: string }; Returns: string };
      can: {
        Args: { p_permission_key: string; p_target_member_id: string; p_workspace_id: string };
        Returns: boolean;
      };
      check_can_invite: { Args: { p_role_id: string; p_workspace_id: string }; Returns: undefined };
      check_job_choices: {
        Args: {
          p_career_level_id: string;
          p_employment_type_id: string;
          p_org_unit_id: string;
          p_position_id: string;
        };
        Returns: undefined;
      };
      covers_unit: {
        Args: { p_permission_key: string; p_unit_id: string; p_workspace_id: string };
        Returns: boolean;
      };
      current_member_id: { Args: { p_workspace_id: string }; Returns: string };
      enable_feature_with_dependencies: {
        Args: { p_feature_key: string; p_workspace_id: string };
        Returns: string[];
      };
      feature_on: { Args: { p_feature_key: string; p_workspace_id: string }; Returns: boolean };
      field_is_sensitive: { Args: { p_field_id: string }; Returns: boolean };
      granted_unit_paths: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: unknown[];
      };
      has_permission: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: boolean;
      };
      hash_invitation_token: { Args: { p_token: string }; Returns: string };
      held_reaches: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: Database["public"]["Enums"]["reach"][];
      };
      import_apply_row: {
        Args: {
          p_job: Omit<
            Database["public"]["Tables"]["import_jobs"]["Row"],
            Database["public"]["Tables"]["import_jobs"]["ComputedFields"]
          >;
          p_row: Omit<
            Database["public"]["Tables"]["import_rows"]["Row"],
            Database["public"]["Tables"]["import_rows"]["ComputedFields"]
          >;
        };
        Returns: string;
      };
      import_key: { Args: { p_data: Json; p_key_field: string }; Returns: string };
      import_row_differs: { Args: { p_row: Json; p_snapshot: Json }; Returns: boolean };
      import_unit: {
        Args: { p_level_ids: string[]; p_names: string[]; p_workspace_id: string };
        Returns: string;
      };
      is_member: { Args: { p_workspace_id: string }; Returns: boolean };
      is_owner: { Args: { p_workspace_id: string }; Returns: boolean };
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      load_import_job: {
        Args: { p_job_id: string; p_statuses: Database["public"]["Enums"]["import_status"][] };
        Returns: Database["public"]["Tables"]["import_jobs"]["Row"];
        SetofOptions: {
          from: "*";
          to: "import_jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      member_key: {
        Args: {
          p_key_field: string;
          p_member: Omit<
            Database["public"]["Tables"]["members"]["Row"],
            Database["public"]["Tables"]["members"]["ComputedFields"]
          >;
        };
        Returns: string;
      };
      member_snapshot: {
        Args: { p_date: string; p_key_field: string; p_member_id: string };
        Returns: Json;
      };
      member_snapshots: {
        Args: { p_date: string; p_key_field: string; p_workspace_id: string };
        Returns: {
          member_id: string;
          snapshot: Json;
        }[];
      };
      new_invitation_token: { Args: Record<PropertyKey, never>; Returns: string };
      notify: {
        Args: {
          p_category: Database["public"]["Enums"]["notification_category"];
          p_kind: string;
          p_payload?: Json;
          p_user_id: string;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      reach_covers: {
        Args: {
          p_held: Database["public"]["Enums"]["reach"][];
          p_wanted: Database["public"]["Enums"]["reach"];
        };
        Returns: boolean;
      };
      rebuild_reporting_closure: { Args: { p_workspace_id: string }; Returns: undefined };
      require_member_access: {
        Args: { p_member_id: string; p_permission_key: string };
        Returns: string;
      };
      set_assignment_from: {
        Args: { p_date: string; p_member_id: string; p_patch: Json };
        Returns: undefined;
      };
      set_compensation_from: {
        Args: {
          p_currency: string;
          p_date: string;
          p_day_rate: number;
          p_member_id: string;
          p_salary: number;
        };
        Returns: undefined;
      };
      set_field_value_from: {
        Args: {
          p_date: string;
          p_field: Omit<
            Database["public"]["Tables"]["custom_fields"]["Row"],
            Database["public"]["Tables"]["custom_fields"]["ComputedFields"]
          >;
          p_member_id: string;
          p_value: Json;
        };
        Returns: undefined;
      };
      shares_workspace_with: { Args: { p_user_id: string }; Returns: boolean };
      unit_label: { Args: { p_id: string }; Returns: string };
      unit_path_names: { Args: { p_unit_id: string }; Returns: string[] };
      visible_members: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: {
          member_id: string;
        }[];
      };
      would_report_to_self: {
        Args: { p_date: string; p_manager_id: string; p_member_id: string };
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
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after: Json | null;
          at: string;
          before: Json | null;
          id: number;
          row_id: string;
          table_name: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          id?: never;
          row_id: string;
          table_name: string;
          workspace_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          id?: never;
          row_id?: string;
          table_name?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      career_levels: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          rank: number;
          track: string | null;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          rank: number;
          track?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          rank?: number;
          track?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "career_levels_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_field_options: {
        Row: {
          archived_at: string | null;
          created_at: string;
          field_id: string;
          id: string;
          label: string;
          sort_order: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          field_id: string;
          id?: string;
          label: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          field_id?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custom_field_options_workspace_id_field_id_fkey";
            columns: ["workspace_id", "field_id"];
            isOneToOne: false;
            referencedRelation: "custom_fields";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      custom_fields: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          keep_history: boolean;
          key: string;
          label: string;
          required: boolean;
          sensitive: boolean;
          sort_order: number;
          type: Database["public"]["Enums"]["custom_field_type"];
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          keep_history?: boolean;
          key: string;
          label: string;
          required?: boolean;
          sensitive?: boolean;
          sort_order?: number;
          type: Database["public"]["Enums"]["custom_field_type"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          keep_history?: boolean;
          key?: string;
          label?: string;
          required?: boolean;
          sensitive?: boolean;
          sort_order?: number;
          type?: Database["public"]["Enums"]["custom_field_type"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custom_fields_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      employment_types: {
        Row: {
          archived_at: string | null;
          cost_method: Database["public"]["Enums"]["cost_method"];
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          cost_method: Database["public"]["Enums"]["cost_method"];
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          cost_method?: Database["public"]["Enums"]["cost_method"];
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employment_types_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
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
      import_jobs: {
        Row: {
          applied_at: string | null;
          counts: NonNullable<Json>;
          created_at: string;
          created_by: string | null;
          cursor: number;
          effective_date: string;
          error: string | null;
          id: string;
          key_field: string;
          mark_leavers: boolean;
          phase: string;
          status: Database["public"]["Enums"]["import_status"];
          unit_level_ids: string[];
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          applied_at?: string | null;
          counts?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          cursor?: number;
          effective_date?: string;
          error?: string | null;
          id?: string;
          key_field: string;
          mark_leavers?: boolean;
          phase?: string;
          status?: Database["public"]["Enums"]["import_status"];
          unit_level_ids?: string[];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          applied_at?: string | null;
          counts?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          cursor?: number;
          effective_date?: string;
          error?: string | null;
          id?: string;
          key_field?: string;
          mark_leavers?: boolean;
          phase?: string;
          status?: Database["public"]["Enums"]["import_status"];
          unit_level_ids?: string[];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_jobs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      import_mappings: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          settings: NonNullable<Json>;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_mappings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      import_rows: {
        Row: {
          data: NonNullable<Json>;
          errors: string[];
          job_id: string;
          member_id: string | null;
          row_number: number;
          status: Database["public"]["Enums"]["import_row_status"];
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          data: NonNullable<Json>;
          errors?: string[];
          job_id: string;
          member_id?: string | null;
          row_number: number;
          status?: Database["public"]["Enums"]["import_row_status"];
          workspace_id: string;
        };
        Update: {
          data?: NonNullable<Json>;
          errors?: string[];
          job_id?: string;
          member_id?: string | null;
          row_number?: number;
          status?: Database["public"]["Enums"]["import_row_status"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_rows_workspace_id_job_id_fkey";
            columns: ["workspace_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "import_jobs";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          member_id: string | null;
          revoked_at: string | null;
          role_id: string;
          token_hash: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          member_id?: string | null;
          revoked_at?: string | null;
          role_id: string;
          token_hash: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          member_id?: string | null;
          revoked_at?: string | null;
          role_id?: string;
          token_hash?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "invitations_workspace_id_role_id_fkey";
            columns: ["workspace_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      member_assignments: {
        Row: {
          career_level_id: string | null;
          created_at: string;
          employment_type_id: string | null;
          id: string;
          manager_member_id: string | null;
          member_id: string;
          org_unit_id: string;
          position_id: string | null;
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          career_level_id?: string | null;
          created_at?: string;
          employment_type_id?: string | null;
          id?: string;
          manager_member_id?: string | null;
          member_id: string;
          org_unit_id: string;
          position_id?: string | null;
          updated_at?: string;
          valid_from: string;
          valid_to?: string | null;
          workspace_id: string;
        };
        Update: {
          career_level_id?: string | null;
          created_at?: string;
          employment_type_id?: string | null;
          id?: string;
          manager_member_id?: string | null;
          member_id?: string;
          org_unit_id?: string;
          position_id?: string | null;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_assignments_workspace_id_career_level_id_fkey";
            columns: ["workspace_id", "career_level_id"];
            isOneToOne: false;
            referencedRelation: "career_levels";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_assignments_workspace_id_employment_type_id_fkey";
            columns: ["workspace_id", "employment_type_id"];
            isOneToOne: false;
            referencedRelation: "employment_types";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_assignments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_assignments_workspace_id_manager_member_id_fkey";
            columns: ["workspace_id", "manager_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_assignments_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_assignments_workspace_id_org_unit_id_fkey";
            columns: ["workspace_id", "org_unit_id"];
            isOneToOne: false;
            referencedRelation: "org_units";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_assignments_workspace_id_position_id_fkey";
            columns: ["workspace_id", "position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      member_compensation: {
        Row: {
          annual_salary: number | null;
          created_at: string;
          currency: string;
          day_rate: number | null;
          id: string;
          member_id: string;
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          annual_salary?: number | null;
          created_at?: string;
          currency: string;
          day_rate?: number | null;
          id?: string;
          member_id: string;
          updated_at?: string;
          valid_from: string;
          valid_to?: string | null;
          workspace_id: string;
        };
        Update: {
          annual_salary?: number | null;
          created_at?: string;
          currency?: string;
          day_rate?: number | null;
          id?: string;
          member_id?: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_compensation_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_compensation_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      member_field_values: {
        Row: {
          created_at: string;
          field_id: string;
          id: string;
          member_id: string;
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
          value: NonNullable<Json>;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          field_id: string;
          id?: string;
          member_id: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          value: NonNullable<Json>;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          field_id?: string;
          id?: string;
          member_id?: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          value?: NonNullable<Json>;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_field_values_workspace_id_field_id_fkey";
            columns: ["workspace_id", "field_id"];
            isOneToOne: false;
            referencedRelation: "custom_fields";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_field_values_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      member_role_units: {
        Row: {
          member_role_id: string;
          org_unit_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          member_role_id: string;
          org_unit_id: string;
          workspace_id: string;
        };
        Update: {
          member_role_id?: string;
          org_unit_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_role_units_workspace_id_member_role_id_fkey";
            columns: ["workspace_id", "member_role_id"];
            isOneToOne: false;
            referencedRelation: "member_roles";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_role_units_workspace_id_org_unit_id_fkey";
            columns: ["workspace_id", "org_unit_id"];
            isOneToOne: false;
            referencedRelation: "org_units";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
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
          end_date: string | null;
          full_name: string;
          id: string;
          is_owner: boolean;
          person_key: string | null;
          start_date: string | null;
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
          end_date?: string | null;
          full_name: string;
          id?: string;
          is_owner?: boolean;
          person_key?: string | null;
          start_date?: string | null;
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
          end_date?: string | null;
          full_name?: string;
          id?: string;
          is_owner?: boolean;
          person_key?: string | null;
          start_date?: string | null;
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
      notification_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"];
          email_delivery: Database["public"]["Enums"]["email_delivery"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category: Database["public"]["Enums"]["notification_category"];
          email_delivery?: Database["public"]["Enums"]["email_delivery"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["notification_category"];
          email_delivery?: Database["public"]["Enums"]["email_delivery"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"];
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          read_at: string | null;
          user_id: string;
          workspace_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          category: Database["public"]["Enums"]["notification_category"];
          created_at?: string;
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          user_id: string;
          workspace_id?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["notification_category"];
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      org_unit_levels: {
        Row: {
          archived_at: string | null;
          color: string | null;
          created_at: string;
          icon: string | null;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          name: string;
          sort_order: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_unit_levels_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      org_units: {
        Row: {
          archived_at: string | null;
          code: string | null;
          created_at: string;
          id: string;
          level_id: string | null;
          name: string;
          parent_id: string | null;
          path: unknown;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          code?: string | null;
          created_at?: string;
          id?: string;
          level_id?: string | null;
          name: string;
          parent_id?: string | null;
          path?: unknown;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          code?: string | null;
          created_at?: string;
          id?: string;
          level_id?: string | null;
          name?: string;
          parent_id?: string | null;
          path?: unknown;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_units_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_units_workspace_id_level_id_fkey";
            columns: ["workspace_id", "level_id"];
            isOneToOne: false;
            referencedRelation: "org_unit_levels";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "org_units_workspace_id_parent_id_fkey";
            columns: ["workspace_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "org_units";
            referencedColumns: ["workspace_id", "id"];
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
      positions: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string;
          id: string;
          max_level_id: string | null;
          min_level_id: string | null;
          name: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          max_level_id?: string | null;
          min_level_id?: string | null;
          name: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          max_level_id?: string | null;
          min_level_id?: string | null;
          name?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "positions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "positions_workspace_id_max_level_id_fkey";
            columns: ["workspace_id", "max_level_id"];
            isOneToOne: false;
            referencedRelation: "career_levels";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "positions_workspace_id_min_level_id_fkey";
            columns: ["workspace_id", "min_level_id"];
            isOneToOne: false;
            referencedRelation: "career_levels";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
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
      reporting_closure: {
        Row: {
          depth: number;
          manager_member_id: string;
          member_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          depth: number;
          manager_member_id: string;
          member_id: string;
          workspace_id: string;
        };
        Update: {
          depth?: number;
          manager_member_id?: string;
          member_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reporting_closure_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reporting_closure_workspace_id_manager_member_id_fkey";
            columns: ["workspace_id", "manager_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "reporting_closure_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
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
      table_views: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          state: NonNullable<Json>;
          table_key: string;
          updated_at: string;
          user_id: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          state: NonNullable<Json>;
          table_key: string;
          updated_at?: string;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          state?: NonNullable<Json>;
          table_key?: string;
          updated_at?: string;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_views_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
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
      accept_invitation: { Args: { p_token: string }; Returns: string };
      add_person: {
        Args: {
          p_career_level_id?: string;
          p_email?: string;
          p_employment_type_id?: string;
          p_full_name: string;
          p_manager_member_id?: string;
          p_org_unit_id: string;
          p_person_key?: string;
          p_position_id?: string;
          p_start_date?: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      assign_role: {
        Args: { p_member_id: string; p_role_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      change_job: {
        Args: {
          p_career_level_id?: string;
          p_employment_type_id?: string;
          p_manager_member_id?: string;
          p_member_id: string;
          p_org_unit_id: string;
          p_position_id?: string;
          p_valid_from: string;
        };
        Returns: boolean;
      };
      change_pay: {
        Args: {
          p_annual_salary?: number;
          p_currency: string;
          p_day_rate?: number;
          p_member_id: string;
          p_valid_from: string;
        };
        Returns: undefined;
      };
      create_invitation: {
        Args: { p_email: string; p_role_id: string; p_workspace_id: string };
        Returns: {
          invitation_id: string;
          token: string;
        }[];
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
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          email: string;
          inviter_name: string;
          role_name: string;
          status: string;
          workspace_name: string;
        }[];
      };
      import_apply_chunk: { Args: { p_job_id: string; p_max_rows?: number }; Returns: Json };
      import_preview: { Args: { p_job_id: string }; Returns: Json };
      import_stage_rows: {
        Args: { p_first_row: number; p_job_id: string; p_rows: Json };
        Returns: number;
      };
      leave_workspace: { Args: { p_workspace_id: string }; Returns: undefined };
      mark_all_notifications_read: { Args: Record<PropertyKey, never>; Returns: undefined };
      my_access_to_member: { Args: { p_member_id: string }; Returns: string[] };
      my_permissions: {
        Args: { p_workspace_id: string };
        Returns: {
          permission_key: string;
          reaches: Database["public"]["Enums"]["reach"][];
        }[];
      };
      org_chart: {
        Args: {
          p_as_of?: string;
          p_depth?: number;
          p_root_member_id?: string;
          p_unit_id?: string;
          p_workspace_id: string;
        };
        Returns: {
          avatar_path: string;
          depth: number;
          direct_reports: number;
          full_name: string;
          manager_hidden: boolean;
          manager_member_id: string;
          member_id: string;
          position_name: string;
          truncated: boolean;
          unit_id: string;
          unit_name: string;
        }[];
      };
      people_directory: {
        Args: {
          p_descending?: boolean;
          p_employment_type_id?: string;
          p_for_export?: boolean;
          p_limit?: number;
          p_offset?: number;
          p_position_id?: string;
          p_search?: string;
          p_sort?: string;
          p_status?: string;
          p_unit_id?: string;
          p_workspace_id: string;
        };
        Returns: {
          avatar_path: string;
          career_level_name: string;
          email: string;
          employment_type_name: string;
          end_date: string;
          full_name: string;
          manager_member_id: string;
          manager_name: string;
          member_id: string;
          person_key: string;
          position_name: string;
          start_date: string;
          total_count: number;
          unit_id: string;
          unit_name: string;
        }[];
      };
      remove_job_change: { Args: { p_assignment_id: string }; Returns: undefined };
      remove_role: {
        Args: { p_member_id: string; p_role_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      reorder_org_unit_levels: {
        Args: { p_level_ids: string[]; p_workspace_id: string };
        Returns: undefined;
      };
      resend_invitation: { Args: { p_invitation_id: string }; Returns: string };
      revoke_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      roles_with_unit_reach: { Args: { p_workspace_id: string }; Returns: string[] };
      set_feature: {
        Args: {
          p_enabled: boolean;
          p_feature_key: string;
          p_include_dependants?: boolean;
          p_workspace_id: string;
        };
        Returns: string[];
      };
      set_field_value: {
        Args: { p_field_id: string; p_member_id: string; p_valid_from: string; p_value: Json };
        Returns: undefined;
      };
      set_member_status: {
        Args: {
          p_member_id: string;
          p_status: Database["public"]["Enums"]["member_status"];
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      set_role_units: {
        Args: { p_member_role_id: string; p_unit_ids: string[] };
        Returns: undefined;
      };
      transfer_ownership: {
        Args: { p_keep_ownership?: boolean; p_member_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      unit_headcount: {
        Args: { p_as_of?: string; p_workspace_id: string };
        Returns: {
          direct: number;
          total: number;
          unit_id: string;
        }[];
      };
    };
    Enums: {
      cost_method: "annual_salary" | "day_rate";
      custom_field_type: "text" | "number" | "date" | "single_choice" | "multi_choice" | "person";
      email_delivery: "instant" | "daily" | "none";
      import_row_status: "pending" | "new" | "changed" | "unchanged" | "error" | "applied";
      import_status: "staging" | "previewed" | "applying" | "applied" | "cancelled";
      member_status: "active" | "invited" | "inactive";
      notification_category: "invitation" | "access" | "time" | "planning" | "import" | "system";
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
      cost_method: ["annual_salary", "day_rate"],
      custom_field_type: ["text", "number", "date", "single_choice", "multi_choice", "person"],
      email_delivery: ["instant", "daily", "none"],
      import_row_status: ["pending", "new", "changed", "unchanged", "error", "applied"],
      import_status: ["staging", "previewed", "applying", "applied", "cancelled"],
      member_status: ["active", "invited", "inactive"],
      notification_category: ["invitation", "access", "time", "planning", "import", "system"],
      reach: ["own", "reports", "team", "team_and_below", "units", "workspace"],
      workspace_kind: ["personal", "team", "company"],
    },
  },
} as const;

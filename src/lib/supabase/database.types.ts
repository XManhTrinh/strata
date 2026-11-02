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
      allowance_policy_on: {
        Args: { p_date: string; p_member_id: string; p_time_type_id: string };
        Returns: Database["public"]["Tables"]["allowance_policies"]["Row"];
        SetofOptions: {
          from: "*";
          to: "allowance_policies";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      anonymise_member: { Args: { p_member_id: string }; Returns: undefined };
      apply_all_retention: { Args: Record<PropertyKey, never>; Returns: undefined };
      apply_rate_cards_to: {
        Args: { p_from: string; p_members: string[]; p_roles: boolean; p_scenario_id: string };
        Returns: undefined;
      };
      apply_retention: { Args: { p_today?: string; p_workspace_id: string }; Returns: Json };
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
      booking_days: {
        Args: {
          p_end: string;
          p_end_half: string;
          p_member_id: string;
          p_start: string;
          p_start_half: string;
        };
        Returns: {
          day: string;
          days: number;
        }[];
      };
      call_job: { Args: { p_job: string }; Returns: undefined };
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
      check_over_allocation: {
        Args: { p_member_ids: string[]; p_role_ids: string[]; p_scenario_id: string };
        Returns: Json;
      };
      condition_matches: {
        Args: {
          p_actual: string;
          p_expected: string;
          p_operator: Database["public"]["Enums"]["rate_operator"];
        };
        Returns: boolean;
      };
      covers_unit: {
        Args: { p_permission_key: string; p_unit_id: string; p_workspace_id: string };
        Returns: boolean;
      };
      current_member_id: { Args: { p_workspace_id: string }; Returns: string };
      delete_workspace: { Args: { p_workspace_id: string }; Returns: undefined };
      deleting_workspace: { Args: Record<PropertyKey, never>; Returns: boolean };
      enable_feature_with_dependencies: {
        Args: { p_feature_key: string; p_workspace_id: string };
        Returns: string[];
      };
      feature_on: { Args: { p_feature_key: string; p_workspace_id: string }; Returns: boolean };
      field_is_sensitive: { Args: { p_field_id: string }; Returns: boolean };
      first_open_month: { Args: { p_scenario_id: string }; Returns: string };
      granted_unit_paths: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: unknown[];
      };
      half_day_span: {
        Args: { p_end: string; p_end_half: string; p_start: string; p_start_half: string };
        Returns: unknown;
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
      is_jobs_secret: { Args: { p_secret: string }; Returns: boolean };
      is_member: { Args: { p_workspace_id: string }; Returns: boolean };
      is_owner: { Args: { p_workspace_id: string }; Returns: boolean };
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      leave_year_start: { Args: { p_date: string; p_start_month: number }; Returns: string };
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
      logo_workspace: { Args: { p_name: string }; Returns: string };
      matching_rate_card: { Args: { p_attributes: Json; p_workspace_id: string }; Returns: string };
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
      member_month_attributes: {
        Args: { p_member_id: string; p_month: string };
        Returns: {
          annual_salary: number;
          attributes: Json;
          cost_method: Database["public"]["Enums"]["cost_method"];
          salary_currency: string;
        }[];
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
      month_start: { Args: { p_date: string }; Returns: string };
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
      notify_members: {
        Args: { p_kind: string; p_member_ids: string[]; p_payload: Json; p_workspace_id: string };
        Returns: undefined;
      };
      over_allocations: {
        Args: { p_member_ids: string[]; p_role_ids: string[]; p_scenario_id: string };
        Returns: Json;
      };
      planned_role_attributes: { Args: { p_planned_role_id: string }; Returns: Json };
      planning_chunk_size: { Args: Record<PropertyKey, never>; Returns: number };
      planning_job_status: { Args: { p_job_id: string }; Returns: Json };
      reach_covers: {
        Args: {
          p_held: Database["public"]["Enums"]["reach"][];
          p_wanted: Database["public"]["Enums"]["reach"];
        };
        Returns: boolean;
      };
      rebuild_reporting_closure: { Args: { p_workspace_id: string }; Returns: undefined };
      refund_booking: { Args: { p_booking_id: string }; Returns: undefined };
      remind_pending_approvals: { Args: { p_today?: string }; Returns: number };
      require_member_access: {
        Args: { p_member_id: string; p_permission_key: string };
        Returns: string;
      };
      require_planning_editor: { Args: { p_workspace_id: string }; Returns: undefined };
      run_planning_chunk: {
        Args: {
          p_job: Omit<
            Database["public"]["Tables"]["planning_jobs"]["Row"],
            Database["public"]["Tables"]["planning_jobs"]["ComputedFields"]
          >;
        };
        Returns: number;
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
      settle_all_allowances: { Args: { p_as_of: string }; Returns: undefined };
      settle_allowance: {
        Args: { p_as_of: string; p_member_id: string; p_time_type_id: string };
        Returns: undefined;
      };
      shares_workspace_with: { Args: { p_user_id: string }; Returns: boolean };
      starter_leave_days: { Args: { p_country: string }; Returns: number };
      time_setup_on: {
        Args: { p_date: string; p_member_id: string };
        Returns: {
          calendar_id: string;
          working_days: number[];
        }[];
      };
      unit_label: { Args: { p_id: string }; Returns: string };
      unit_path_names: { Args: { p_unit_id: string }; Returns: string[] };
      vault_secret: { Args: { p_name: string }; Returns: string };
      visible_members: {
        Args: { p_permission_key: string; p_workspace_id: string };
        Returns: {
          member_id: string;
        }[];
      };
      working_days: {
        Args: {
          p_end: string;
          p_end_half: string;
          p_member_id: string;
          p_start: string;
          p_start_half: string;
        };
        Returns: number;
      };
      workspace_approvers: { Args: { p_workspace_id: string }; Returns: string[] };
      would_report_to_self: {
        Args: { p_date: string; p_manager_id: string; p_member_id: string };
        Returns: boolean;
      };
      yearly_days: {
        Args: {
          p_member_id: string;
          p_policy: Omit<
            Database["public"]["Tables"]["allowance_policies"]["Row"],
            Database["public"]["Tables"]["allowance_policies"]["ComputedFields"]
          >;
          p_year_start: string;
        };
        Returns: number;
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
      allocation_rows: {
        Row: {
          id: number;
          member_id: string | null;
          org_unit_id: string;
          planned_role_id: string | null;
          scenario_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: never;
          member_id?: string | null;
          org_unit_id: string;
          planned_role_id?: string | null;
          scenario_id: string;
          workspace_id: string;
        };
        Update: {
          id?: never;
          member_id?: string | null;
          org_unit_id?: string;
          planned_role_id?: string | null;
          scenario_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allocation_rows_scenario_id_planned_role_id_fkey";
            columns: ["scenario_id", "planned_role_id"];
            isOneToOne: false;
            referencedRelation: "planned_roles";
            referencedColumns: ["scenario_id", "id"];
          },
          {
            foreignKeyName: "allocation_rows_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "allocation_rows_workspace_id_org_unit_id_fkey";
            columns: ["workspace_id", "org_unit_id"];
            isOneToOne: false;
            referencedRelation: "org_units";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "allocation_rows_workspace_id_scenario_id_fkey";
            columns: ["workspace_id", "scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      allocations: {
        Row: {
          fte: number;
          id: number;
          member_id: string | null;
          org_unit_id: string;
          period_start: string;
          planned_role_id: string | null;
          scenario_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          fte: number;
          id?: never;
          member_id?: string | null;
          org_unit_id: string;
          period_start: string;
          planned_role_id?: string | null;
          scenario_id: string;
          workspace_id: string;
        };
        Update: {
          fte?: number;
          id?: never;
          member_id?: string | null;
          org_unit_id?: string;
          period_start?: string;
          planned_role_id?: string | null;
          scenario_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allocations_scenario_id_planned_role_id_fkey";
            columns: ["scenario_id", "planned_role_id"];
            isOneToOne: false;
            referencedRelation: "planned_roles";
            referencedColumns: ["scenario_id", "id"];
          },
          {
            foreignKeyName: "allocations_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "allocations_workspace_id_org_unit_id_fkey";
            columns: ["workspace_id", "org_unit_id"];
            isOneToOne: false;
            referencedRelation: "org_units";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "allocations_workspace_id_scenario_id_fkey";
            columns: ["workspace_id", "scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      allowance_ledger: {
        Row: {
          booking_id: string | null;
          created_at: string;
          created_by: string | null;
          days: number;
          id: number;
          kind: Database["public"]["Enums"]["allowance_entry"];
          leave_year: string;
          member_id: string;
          period: string | null;
          reason: string | null;
          time_type_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          days: number;
          id?: never;
          kind: Database["public"]["Enums"]["allowance_entry"];
          leave_year: string;
          member_id: string;
          period?: string | null;
          reason?: string | null;
          time_type_id: string;
          workspace_id: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          days?: number;
          id?: never;
          kind?: Database["public"]["Enums"]["allowance_entry"];
          leave_year?: string;
          member_id?: string;
          period?: string | null;
          reason?: string | null;
          time_type_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allowance_ledger_workspace_id_booking_id_fkey";
            columns: ["workspace_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "allowance_ledger_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "allowance_ledger_workspace_id_time_type_id_fkey";
            columns: ["workspace_id", "time_type_id"];
            isOneToOne: false;
            referencedRelation: "time_types";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      allowance_policies: {
        Row: {
          accrual: Database["public"]["Enums"]["allowance_accrual"];
          archived_at: string | null;
          carry_over_expires_months: number | null;
          carry_over_max: number | null;
          created_at: string;
          days_per_year: number;
          id: string;
          is_default: boolean;
          name: string;
          prorate_by_schedule: boolean;
          time_type_id: string;
          updated_at: string;
          workspace_id: string;
          year_start_month: number;
        };
        ComputedFields: never;
        Insert: {
          accrual?: Database["public"]["Enums"]["allowance_accrual"];
          archived_at?: string | null;
          carry_over_expires_months?: number | null;
          carry_over_max?: number | null;
          created_at?: string;
          days_per_year: number;
          id?: string;
          is_default?: boolean;
          name: string;
          prorate_by_schedule?: boolean;
          time_type_id: string;
          updated_at?: string;
          workspace_id: string;
          year_start_month?: number;
        };
        Update: {
          accrual?: Database["public"]["Enums"]["allowance_accrual"];
          archived_at?: string | null;
          carry_over_expires_months?: number | null;
          carry_over_max?: number | null;
          created_at?: string;
          days_per_year?: number;
          id?: string;
          is_default?: boolean;
          name?: string;
          prorate_by_schedule?: boolean;
          time_type_id?: string;
          updated_at?: string;
          workspace_id?: string;
          year_start_month?: number;
        };
        Relationships: [
          {
            foreignKeyName: "allowance_policies_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allowance_policies_workspace_id_time_type_id_fkey";
            columns: ["workspace_id", "time_type_id"];
            isOneToOne: false;
            referencedRelation: "time_types";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
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
      booking_approvals: {
        Row: {
          approver_member_id: string | null;
          approver_role_id: string | null;
          booking_id: string;
          comment: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision: Database["public"]["Enums"]["approval_decision"];
          id: string;
          reminded_at: string | null;
          step: number;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          approver_member_id?: string | null;
          approver_role_id?: string | null;
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision?: Database["public"]["Enums"]["approval_decision"];
          id?: string;
          reminded_at?: string | null;
          step?: number;
          workspace_id: string;
        };
        Update: {
          approver_member_id?: string | null;
          approver_role_id?: string | null;
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision?: Database["public"]["Enums"]["approval_decision"];
          id?: string;
          reminded_at?: string | null;
          step?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_approvals_workspace_id_approver_member_id_fkey";
            columns: ["workspace_id", "approver_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "booking_approvals_workspace_id_approver_role_id_fkey";
            columns: ["workspace_id", "approver_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "booking_approvals_workspace_id_booking_id_fkey";
            columns: ["workspace_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "booking_approvals_workspace_id_decided_by_fkey";
            columns: ["workspace_id", "decided_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      booking_attendees: {
        Row: {
          booking_id: string;
          member_id: string;
          working_days: number;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          member_id: string;
          working_days?: number;
          workspace_id: string;
        };
        Update: {
          booking_id?: string;
          member_id?: string;
          working_days?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_attendees_workspace_id_booking_id_fkey";
            columns: ["workspace_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "booking_attendees_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      bookings: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          created_by: string;
          end_date: string;
          end_half: string;
          ends_at: string | null;
          id: string;
          notes: string | null;
          recurrence_rule: string | null;
          start_date: string;
          start_half: string;
          starts_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          time_type_id: string;
          time_zone: string | null;
          title: string | null;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          created_by: string;
          end_date: string;
          end_half?: string;
          ends_at?: string | null;
          id?: string;
          notes?: string | null;
          recurrence_rule?: string | null;
          start_date: string;
          start_half?: string;
          starts_at?: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          time_type_id: string;
          time_zone?: string | null;
          title?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string;
          end_date?: string;
          end_half?: string;
          ends_at?: string | null;
          id?: string;
          notes?: string | null;
          recurrence_rule?: string | null;
          start_date?: string;
          start_half?: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          time_type_id?: string;
          time_zone?: string | null;
          title?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_workspace_id_created_by_fkey";
            columns: ["workspace_id", "created_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "bookings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_workspace_id_time_type_id_fkey";
            columns: ["workspace_id", "time_type_id"];
            isOneToOne: false;
            referencedRelation: "time_types";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      calendar_feed_tokens: {
        Row: {
          created_at: string;
          id: string;
          last_used_at: string | null;
          revoked_at: string | null;
          scope: Database["public"]["Enums"]["feed_scope"];
          token_hash: string;
          user_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          scope: Database["public"]["Enums"]["feed_scope"];
          token_hash: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          scope?: Database["public"]["Enums"]["feed_scope"];
          token_hash?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_feed_tokens_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
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
      cost_snapshots: {
        Row: {
          currency: string | null;
          id: number;
          member_id: string | null;
          monthly_cost: number;
          period_start: string;
          planned_role_id: string | null;
          rate_card_id: string | null;
          scenario_id: string;
          source: Database["public"]["Enums"]["cost_source"];
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          currency?: string | null;
          id?: never;
          member_id?: string | null;
          monthly_cost?: number;
          period_start: string;
          planned_role_id?: string | null;
          rate_card_id?: string | null;
          scenario_id: string;
          source: Database["public"]["Enums"]["cost_source"];
          workspace_id: string;
        };
        Update: {
          currency?: string | null;
          id?: never;
          member_id?: string | null;
          monthly_cost?: number;
          period_start?: string;
          planned_role_id?: string | null;
          rate_card_id?: string | null;
          scenario_id?: string;
          source?: Database["public"]["Enums"]["cost_source"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cost_snapshots_scenario_id_planned_role_id_fkey";
            columns: ["scenario_id", "planned_role_id"];
            isOneToOne: false;
            referencedRelation: "planned_roles";
            referencedColumns: ["scenario_id", "id"];
          },
          {
            foreignKeyName: "cost_snapshots_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "cost_snapshots_workspace_id_rate_card_id_fkey";
            columns: ["workspace_id", "rate_card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "cost_snapshots_workspace_id_scenario_id_fkey";
            columns: ["workspace_id", "scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
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
      data_retention: {
        Row: {
          anonymise_leavers_months: number | null;
          audit_log_months: number | null;
          notifications_months: number | null;
          private_notes_months: number | null;
          staged_imports_days: number | null;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          anonymise_leavers_months?: number | null;
          audit_log_months?: number | null;
          notifications_months?: number | null;
          private_notes_months?: number | null;
          staged_imports_days?: number | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          anonymise_leavers_months?: number | null;
          audit_log_months?: number | null;
          notifications_months?: number | null;
          private_notes_months?: number | null;
          staged_imports_days?: number | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_retention_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
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
      holiday_calendars: {
        Row: {
          archived_at: string | null;
          country: string | null;
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          region: string | null;
          source: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          region?: string | null;
          source?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          region?: string | null;
          source?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holiday_calendars_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      holidays: {
        Row: {
          calendar_id: string;
          created_at: string;
          date: string;
          edited: boolean;
          id: string;
          name: string;
          portion: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          calendar_id: string;
          created_at?: string;
          date: string;
          edited?: boolean;
          id?: string;
          name: string;
          portion?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          calendar_id?: string;
          created_at?: string;
          date?: string;
          edited?: boolean;
          id?: string;
          name?: string;
          portion?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holidays_workspace_id_calendar_id_fkey";
            columns: ["workspace_id", "calendar_id"];
            isOneToOne: false;
            referencedRelation: "holiday_calendars";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
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
      member_allowance_policies: {
        Row: {
          created_at: string;
          id: string;
          member_id: string;
          policy_id: string;
          time_type_id: string;
          valid_from: string;
          valid_to: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          member_id: string;
          policy_id: string;
          time_type_id: string;
          valid_from: string;
          valid_to?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: string;
          policy_id?: string;
          time_type_id?: string;
          valid_from?: string;
          valid_to?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_allowance_policies_workspace_id_member_id_fkey";
            columns: ["workspace_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_allowance_policies_workspace_id_policy_id_fkey";
            columns: ["workspace_id", "policy_id"];
            isOneToOne: false;
            referencedRelation: "allowance_policies";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "member_allowance_policies_workspace_id_time_type_id_fkey";
            columns: ["workspace_id", "time_type_id"];
            isOneToOne: false;
            referencedRelation: "time_types";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      member_assignments: {
        Row: {
          career_level_id: string | null;
          created_at: string;
          employment_type_id: string | null;
          holiday_calendar_id: string | null;
          id: string;
          manager_member_id: string | null;
          member_id: string;
          org_unit_id: string;
          position_id: string | null;
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
          work_schedule_id: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          career_level_id?: string | null;
          created_at?: string;
          employment_type_id?: string | null;
          holiday_calendar_id?: string | null;
          id?: string;
          manager_member_id?: string | null;
          member_id: string;
          org_unit_id: string;
          position_id?: string | null;
          updated_at?: string;
          valid_from: string;
          valid_to?: string | null;
          work_schedule_id?: string | null;
          workspace_id: string;
        };
        Update: {
          career_level_id?: string | null;
          created_at?: string;
          employment_type_id?: string | null;
          holiday_calendar_id?: string | null;
          id?: string;
          manager_member_id?: string | null;
          member_id?: string;
          org_unit_id?: string;
          position_id?: string | null;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
          work_schedule_id?: string | null;
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
            foreignKeyName: "member_assignments_workspace_id_holiday_calendar_id_fkey";
            columns: ["workspace_id", "holiday_calendar_id"];
            isOneToOne: false;
            referencedRelation: "holiday_calendars";
            referencedColumns: ["workspace_id", "id"];
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
          {
            foreignKeyName: "member_assignments_workspace_id_work_schedule_id_fkey";
            columns: ["workspace_id", "work_schedule_id"];
            isOneToOne: false;
            referencedRelation: "work_schedules";
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
      member_erasures: {
        Row: {
          erased_at: string;
          erased_by: string | null;
          id: string;
          kind: string;
          member_id: string;
          reason: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          erased_at?: string;
          erased_by?: string | null;
          id?: string;
          kind?: string;
          member_id: string;
          reason: string;
          workspace_id: string;
        };
        Update: {
          erased_at?: string;
          erased_by?: string | null;
          id?: string;
          kind?: string;
          member_id?: string;
          reason?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_erasures_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_erasures_workspace_id_member_id_fkey";
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
          erased_at: string | null;
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
          erased_at?: string | null;
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
          erased_at?: string | null;
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
          email_attempts: number;
          email_claimed_at: string | null;
          email_error: string | null;
          emailed_at: string | null;
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
          email_attempts?: number;
          email_claimed_at?: string | null;
          email_error?: string | null;
          emailed_at?: string | null;
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
          email_attempts?: number;
          email_claimed_at?: string | null;
          email_error?: string | null;
          emailed_at?: string | null;
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
      planned_roles: {
        Row: {
          career_level_id: string | null;
          created_at: string;
          employment_type_id: string | null;
          end_date: string | null;
          field_values: NonNullable<Json>;
          filled_by: string | null;
          filled_on: string | null;
          fte: number;
          id: string;
          notes: string | null;
          org_unit_id: string;
          position_id: string | null;
          scenario_id: string;
          start_date: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          career_level_id?: string | null;
          created_at?: string;
          employment_type_id?: string | null;
          end_date?: string | null;
          field_values?: NonNullable<Json>;
          filled_by?: string | null;
          filled_on?: string | null;
          fte?: number;
          id?: string;
          notes?: string | null;
          org_unit_id: string;
          position_id?: string | null;
          scenario_id: string;
          start_date: string;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          career_level_id?: string | null;
          created_at?: string;
          employment_type_id?: string | null;
          end_date?: string | null;
          field_values?: NonNullable<Json>;
          filled_by?: string | null;
          filled_on?: string | null;
          fte?: number;
          id?: string;
          notes?: string | null;
          org_unit_id?: string;
          position_id?: string | null;
          scenario_id?: string;
          start_date?: string;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_roles_workspace_id_career_level_id_fkey";
            columns: ["workspace_id", "career_level_id"];
            isOneToOne: false;
            referencedRelation: "career_levels";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planned_roles_workspace_id_employment_type_id_fkey";
            columns: ["workspace_id", "employment_type_id"];
            isOneToOne: false;
            referencedRelation: "employment_types";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planned_roles_workspace_id_filled_by_fkey";
            columns: ["workspace_id", "filled_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planned_roles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planned_roles_workspace_id_org_unit_id_fkey";
            columns: ["workspace_id", "org_unit_id"];
            isOneToOne: false;
            referencedRelation: "org_units";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planned_roles_workspace_id_position_id_fkey";
            columns: ["workspace_id", "position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planned_roles_workspace_id_scenario_id_fkey";
            columns: ["workspace_id", "scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      planning_jobs: {
        Row: {
          created_at: string;
          created_by: string | null;
          cursor: string | null;
          done_at: string | null;
          from_month: string | null;
          id: string;
          kind: Database["public"]["Enums"]["planning_job_kind"];
          processed: number;
          scenario_id: string;
          source_scenario_id: string | null;
          total: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          cursor?: string | null;
          done_at?: string | null;
          from_month?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["planning_job_kind"];
          processed?: number;
          scenario_id: string;
          source_scenario_id?: string | null;
          total?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          cursor?: string | null;
          done_at?: string | null;
          from_month?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["planning_job_kind"];
          processed?: number;
          scenario_id?: string;
          source_scenario_id?: string | null;
          total?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planning_jobs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planning_jobs_workspace_id_scenario_id_fkey";
            columns: ["workspace_id", "scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planning_jobs_workspace_id_source_scenario_id_fkey";
            columns: ["workspace_id", "source_scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      planning_settings: {
        Row: {
          basis: Database["public"]["Enums"]["planning_basis"];
          cost_split_field_id: string | null;
          display_unit: Database["public"]["Enums"]["planning_unit"];
          horizon_years: number;
          lifecycle: boolean;
          over_allocation: Database["public"]["Enums"]["over_allocation_rule"];
          period: Database["public"]["Enums"]["planning_period"];
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          basis?: Database["public"]["Enums"]["planning_basis"];
          cost_split_field_id?: string | null;
          display_unit?: Database["public"]["Enums"]["planning_unit"];
          horizon_years?: number;
          lifecycle?: boolean;
          over_allocation?: Database["public"]["Enums"]["over_allocation_rule"];
          period?: Database["public"]["Enums"]["planning_period"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          basis?: Database["public"]["Enums"]["planning_basis"];
          cost_split_field_id?: string | null;
          display_unit?: Database["public"]["Enums"]["planning_unit"];
          horizon_years?: number;
          lifecycle?: boolean;
          over_allocation?: Database["public"]["Enums"]["over_allocation_rule"];
          period?: Database["public"]["Enums"]["planning_period"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planning_settings_workspace_id_cost_split_field_id_fkey";
            columns: ["workspace_id", "cost_split_field_id"];
            isOneToOne: false;
            referencedRelation: "custom_fields";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "planning_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
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
      rate_card_conditions: {
        Row: {
          card_id: string;
          created_at: string;
          field: string;
          id: string;
          operator: Database["public"]["Enums"]["rate_operator"];
          sort_order: number;
          updated_at: string;
          value: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          card_id: string;
          created_at?: string;
          field: string;
          id?: string;
          operator: Database["public"]["Enums"]["rate_operator"];
          sort_order?: number;
          updated_at?: string;
          value: string;
          workspace_id: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          field?: string;
          id?: string;
          operator?: Database["public"]["Enums"]["rate_operator"];
          sort_order?: number;
          updated_at?: string;
          value?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_card_conditions_workspace_id_card_id_fkey";
            columns: ["workspace_id", "card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      rate_card_groups: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          set_id: string | null;
          sort_order: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          set_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          set_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_card_groups_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rate_card_groups_workspace_id_set_id_fkey";
            columns: ["workspace_id", "set_id"];
            isOneToOne: false;
            referencedRelation: "rate_card_sets";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      rate_card_rates: {
        Row: {
          card_id: string;
          created_at: string;
          currency: string;
          day_rate: number;
          id: string;
          updated_at: string;
          valid_from: string;
          working_days: number;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          card_id: string;
          created_at?: string;
          currency: string;
          day_rate: number;
          id?: string;
          updated_at?: string;
          valid_from: string;
          working_days: number;
          workspace_id: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          currency?: string;
          day_rate?: number;
          id?: string;
          updated_at?: string;
          valid_from?: string;
          working_days?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_card_rates_workspace_id_card_id_fkey";
            columns: ["workspace_id", "card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      rate_card_sets: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_card_sets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_cards: {
        Row: {
          archived_at: string | null;
          created_at: string;
          group_id: string | null;
          id: string;
          is_default: boolean;
          name: string;
          priority: number;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          is_default?: boolean;
          name: string;
          priority?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          is_default?: boolean;
          name?: string;
          priority?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_cards_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rate_cards_workspace_id_group_id_fkey";
            columns: ["workspace_id", "group_id"];
            isOneToOne: false;
            referencedRelation: "rate_card_groups";
            referencedColumns: ["workspace_id", "id"];
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
      scenarios: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          archived_at: string | null;
          baseline_id: string | null;
          costs_applied_at: string | null;
          created_at: string;
          created_by: string | null;
          first_period: string;
          id: string;
          is_live: boolean;
          last_period: string;
          locked_through: string | null;
          name: string;
          status: Database["public"]["Enums"]["scenario_status"];
          submitted_at: string | null;
          submitted_by: string | null;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          archived_at?: string | null;
          baseline_id?: string | null;
          costs_applied_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          first_period: string;
          id?: string;
          is_live?: boolean;
          last_period: string;
          locked_through?: string | null;
          name: string;
          status?: Database["public"]["Enums"]["scenario_status"];
          submitted_at?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          archived_at?: string | null;
          baseline_id?: string | null;
          costs_applied_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          first_period?: string;
          id?: string;
          is_live?: boolean;
          last_period?: string;
          locked_through?: string | null;
          name?: string;
          status?: Database["public"]["Enums"]["scenario_status"];
          submitted_at?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenarios_workspace_id_approved_by_fkey";
            columns: ["workspace_id", "approved_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "scenarios_workspace_id_baseline_id_fkey";
            columns: ["workspace_id", "baseline_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "scenarios_workspace_id_created_by_fkey";
            columns: ["workspace_id", "created_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "scenarios_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenarios_workspace_id_submitted_by_fkey";
            columns: ["workspace_id", "submitted_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
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
      time_types: {
        Row: {
          allows_recurrence: boolean;
          approver: Database["public"]["Enums"]["time_approver"];
          approver_member_id: string | null;
          approver_role_id: string | null;
          archived_at: string | null;
          book_for_others: boolean;
          bookable_by: Database["public"]["Enums"]["time_bookable_by"];
          color: string;
          created_at: string;
          icon: string;
          id: string;
          is_away: boolean;
          name: string;
          needs_approval: boolean;
          notify_role_id: string | null;
          paid: boolean;
          sort_order: number;
          updated_at: string;
          uses_allowance: boolean;
          visibility: Database["public"]["Enums"]["time_visibility"];
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          allows_recurrence?: boolean;
          approver?: Database["public"]["Enums"]["time_approver"];
          approver_member_id?: string | null;
          approver_role_id?: string | null;
          archived_at?: string | null;
          book_for_others?: boolean;
          bookable_by?: Database["public"]["Enums"]["time_bookable_by"];
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_away?: boolean;
          name: string;
          needs_approval?: boolean;
          notify_role_id?: string | null;
          paid?: boolean;
          sort_order?: number;
          updated_at?: string;
          uses_allowance?: boolean;
          visibility?: Database["public"]["Enums"]["time_visibility"];
          workspace_id: string;
        };
        Update: {
          allows_recurrence?: boolean;
          approver?: Database["public"]["Enums"]["time_approver"];
          approver_member_id?: string | null;
          approver_role_id?: string | null;
          archived_at?: string | null;
          book_for_others?: boolean;
          bookable_by?: Database["public"]["Enums"]["time_bookable_by"];
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_away?: boolean;
          name?: string;
          needs_approval?: boolean;
          notify_role_id?: string | null;
          paid?: boolean;
          sort_order?: number;
          updated_at?: string;
          uses_allowance?: boolean;
          visibility?: Database["public"]["Enums"]["time_visibility"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_types_workspace_id_approver_member_id_fkey";
            columns: ["workspace_id", "approver_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "time_types_workspace_id_approver_role_id_fkey";
            columns: ["workspace_id", "approver_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "time_types_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_types_workspace_id_notify_role_id_fkey";
            columns: ["workspace_id", "notify_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      work_schedules: {
        Row: {
          archived_at: string | null;
          created_at: string;
          hours_per_day: number;
          id: string;
          is_default: boolean;
          name: string;
          updated_at: string;
          working_days: number[];
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          hours_per_day?: number;
          id?: string;
          is_default?: boolean;
          name: string;
          updated_at?: string;
          working_days: number[];
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          hours_per_day?: number;
          id?: string;
          is_default?: boolean;
          name?: string;
          updated_at?: string;
          working_days?: number[];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_schedules_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
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
          logo_path: string | null;
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
          logo_path?: string | null;
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
          logo_path?: string | null;
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
      adjust_allowance: {
        Args: {
          p_as_of?: string;
          p_days: number;
          p_member_id: string;
          p_reason: string;
          p_time_type_id: string;
        };
        Returns: undefined;
      };
      allocation_grid: {
        Args: {
          p_from: string;
          p_limit?: number;
          p_offset?: number;
          p_scenario_id: string;
          p_search?: string;
          p_to: string;
          p_unit_id?: string;
        };
        Returns: {
          filled_on: string;
          member_id: string;
          months: Json;
          name: string;
          org_unit_id: string;
          planned_role_id: string;
          total_count: number;
          totals: Json;
          unit_name: string;
        }[];
      };
      allowance_balances: {
        Args: { p_as_of?: string; p_member_id: string };
        Returns: {
          adjusted: number;
          available: number;
          carried_over: number;
          entitled: number;
          expired: number;
          leave_year: string;
          requested: number;
          time_type_id: string;
          time_type_name: string;
          used: number;
        }[];
      };
      apply_rate_cards: { Args: { p_scenario_id: string }; Returns: Json };
      assign_role: {
        Args: { p_member_id: string; p_role_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      book_time: {
        Args: {
          p_end_date: string;
          p_end_half?: string;
          p_ends_at?: string;
          p_member_ids: string[];
          p_notes?: string;
          p_recurrence_rule?: string;
          p_start_date: string;
          p_start_half?: string;
          p_starts_at?: string;
          p_time_type_id: string;
          p_time_zone?: string;
          p_title?: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      calendar_entries: {
        Args: { p_from: string; p_member_ids?: string[]; p_to: string; p_workspace_id: string };
        Returns: {
          booking_id: string;
          color: string;
          end_date: string;
          end_half: string;
          ends_at: string;
          icon: string;
          is_away: boolean;
          masked: boolean;
          member_id: string;
          member_name: string;
          recurrence_rule: string;
          start_date: string;
          start_half: string;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          time_type_id: string;
          time_type_name: string;
          title: string;
          working_days: number;
        }[];
      };
      calendar_feed: {
        Args: { p_token: string };
        Returns: {
          booking_id: string;
          end_date: string;
          end_half: string;
          ends_at: string;
          masked: boolean;
          member_name: string;
          recurrence_rule: string;
          start_date: string;
          start_half: string;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          time_type_name: string;
          title: string;
          updated_at: string;
        }[];
      };
      cancel_booking: { Args: { p_booking_id: string; p_reason?: string }; Returns: undefined };
      capacity_totals: {
        Args: {
          p_field_id?: string;
          p_from: string;
          p_group_by?: string;
          p_parent_unit_id?: string;
          p_scenario_id: string;
          p_to: string;
        };
        Returns: {
          cost: number;
          currency: string;
          fte: number;
          group_id: string;
          group_label: string;
          headcount: number;
          period_start: string;
        }[];
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
      claim_notification_emails: {
        Args: { p_limit?: number; p_secret: string };
        Returns: {
          created_at: string;
          delivery: Database["public"]["Enums"]["email_delivery"];
          email: string;
          full_name: string;
          id: string;
          kind: string;
          locale: string;
          payload: Json;
          time_zone: string;
          user_id: string;
          workspace_name: string;
          workspace_slug: string;
        }[];
      };
      copy_scenario: { Args: { p_name: string; p_scenario_id: string }; Returns: string };
      create_feed_token: {
        Args: { p_scope: Database["public"]["Enums"]["feed_scope"]; p_workspace_id: string };
        Returns: string;
      };
      create_invitation: {
        Args: { p_email: string; p_role_id: string; p_workspace_id: string };
        Returns: {
          invitation_id: string;
          token: string;
        }[];
      };
      create_scenario: {
        Args: {
          p_first_period: string;
          p_from_people?: boolean;
          p_last_period: string;
          p_name: string;
          p_workspace_id: string;
        };
        Returns: string;
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
          logo_path: string | null;
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
      decide_booking: {
        Args: { p_approve: boolean; p_booking_id: string; p_comment?: string };
        Returns: undefined;
      };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      erase_member: { Args: { p_member_id: string; p_reason: string }; Returns: undefined };
      fill_planned_role: {
        Args: { p_from: string; p_member_id: string; p_planned_role_id: string };
        Returns: Json;
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
      home_summary: { Args: { p_workspace_id: string }; Returns: Json };
      import_apply_chunk: { Args: { p_job_id: string; p_max_rows?: number }; Returns: Json };
      import_preview: { Args: { p_job_id: string }; Returns: Json };
      import_stage_rows: {
        Args: { p_first_row: number; p_job_id: string; p_rows: Json };
        Returns: number;
      };
      leave_workspace: { Args: { p_workspace_id: string }; Returns: undefined };
      mark_all_notifications_read: { Args: Record<PropertyKey, never>; Returns: undefined };
      mark_notification_emails: {
        Args: { p_failed?: Json; p_secret: string; p_sent: string[] };
        Returns: undefined;
      };
      my_access_to_member: { Args: { p_member_id: string }; Returns: string[] };
      my_account_deletion: { Args: Record<PropertyKey, never>; Returns: Json };
      my_data: { Args: Record<PropertyKey, never>; Returns: Json };
      my_pending_approvals: {
        Args: { p_workspace_id: string };
        Returns: {
          booking_id: string;
          color: string;
          end_date: string;
          end_half: string;
          member_id: string;
          member_name: string;
          notes: string;
          requested_at: string;
          start_date: string;
          start_half: string;
          time_type_name: string;
          working_days: number;
        }[];
      };
      my_permissions: {
        Args: { p_workspace_id: string };
        Returns: {
          permission_key: string;
          reaches: Database["public"]["Enums"]["reach"][];
        }[];
      };
      open_roles: {
        Args: { p_workspace_id: string };
        Returns: {
          fte: number;
          org_unit_id: string;
          planned_role_id: string;
          start_date: string;
          title: string;
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
      person_data: { Args: { p_member_id: string }; Returns: Json };
      preview_working_days: {
        Args: {
          p_end: string;
          p_end_half: string;
          p_member_id: string;
          p_start: string;
          p_start_half: string;
        };
        Returns: number;
      };
      rate_card_preview: {
        Args: {
          p_member_id?: string;
          p_month: string;
          p_planned_role_id?: string;
          p_workspace_id: string;
        };
        Returns: {
          currency: string;
          monthly_cost: number;
          rate_card_id: string;
          rate_card_name: string;
          source: Database["public"]["Enums"]["cost_source"];
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
      run_planning_job: { Args: { p_job_id: string }; Returns: Json };
      save_allocations: { Args: { p_changes: Json; p_scenario_id: string }; Returns: Json };
      save_rate_card: {
        Args: {
          p_card_id?: string;
          p_conditions: Json;
          p_group_id?: string;
          p_is_default: boolean;
          p_name: string;
          p_priority: number;
          p_rates: Json;
          p_workspace_id: string;
        };
        Returns: string;
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
      set_field_value: {
        Args: { p_field_id: string; p_member_id: string; p_valid_from: string; p_value: Json };
        Returns: undefined;
      };
      set_live_scenario: { Args: { p_scenario_id: string }; Returns: undefined };
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
      set_scenario_status: {
        Args: { p_scenario_id: string; p_status: Database["public"]["Enums"]["scenario_status"] };
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
      allowance_accrual: "upfront" | "monthly";
      allowance_entry:
        "grant" | "accrual" | "adjustment" | "usage" | "refund" | "carry_over" | "expiry";
      approval_decision: "pending" | "approved" | "rejected";
      booking_status: "pending" | "approved" | "rejected" | "cancelled";
      cost_method: "annual_salary" | "day_rate";
      cost_source: "rate_card" | "salary" | "none";
      custom_field_type: "text" | "number" | "date" | "single_choice" | "multi_choice" | "person";
      email_delivery: "instant" | "daily" | "none";
      feed_scope: "me" | "team" | "workspace";
      import_row_status: "pending" | "new" | "changed" | "unchanged" | "error" | "applied";
      import_status: "staging" | "previewed" | "applying" | "applied" | "cancelled";
      member_status: "active" | "invited" | "inactive";
      notification_category: "invitation" | "access" | "time" | "planning" | "import" | "system";
      over_allocation_rule: "warn" | "block";
      planning_basis: "person" | "position";
      planning_job_kind: "build" | "copy" | "apply";
      planning_period: "month" | "quarter";
      planning_unit: "fte" | "percent";
      rate_operator:
        | "equals"
        | "not_equals"
        | "starts_with"
        | "starts_with_any"
        | "ends_with"
        | "contains"
        | "in";
      reach: "own" | "reports" | "team" | "team_and_below" | "units" | "workspace";
      scenario_status: "draft" | "submitted" | "approved";
      time_approver: "line_manager" | "team_lead" | "person" | "role" | "none";
      time_bookable_by: "everyone" | "managers" | "admins";
      time_visibility: "everyone" | "team" | "private";
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
      allowance_accrual: ["upfront", "monthly"],
      allowance_entry: [
        "grant",
        "accrual",
        "adjustment",
        "usage",
        "refund",
        "carry_over",
        "expiry",
      ],
      approval_decision: ["pending", "approved", "rejected"],
      booking_status: ["pending", "approved", "rejected", "cancelled"],
      cost_method: ["annual_salary", "day_rate"],
      cost_source: ["rate_card", "salary", "none"],
      custom_field_type: ["text", "number", "date", "single_choice", "multi_choice", "person"],
      email_delivery: ["instant", "daily", "none"],
      feed_scope: ["me", "team", "workspace"],
      import_row_status: ["pending", "new", "changed", "unchanged", "error", "applied"],
      import_status: ["staging", "previewed", "applying", "applied", "cancelled"],
      member_status: ["active", "invited", "inactive"],
      notification_category: ["invitation", "access", "time", "planning", "import", "system"],
      over_allocation_rule: ["warn", "block"],
      planning_basis: ["person", "position"],
      planning_job_kind: ["build", "copy", "apply"],
      planning_period: ["month", "quarter"],
      planning_unit: ["fte", "percent"],
      rate_operator: [
        "equals",
        "not_equals",
        "starts_with",
        "starts_with_any",
        "ends_with",
        "contains",
        "in",
      ],
      reach: ["own", "reports", "team", "team_and_below", "units", "workspace"],
      scenario_status: ["draft", "submitted", "approved"],
      time_approver: ["line_manager", "team_lead", "person", "role", "none"],
      time_bookable_by: ["everyone", "managers", "admins"],
      time_visibility: ["everyone", "team", "private"],
      workspace_kind: ["personal", "team", "company"],
    },
  },
} as const;

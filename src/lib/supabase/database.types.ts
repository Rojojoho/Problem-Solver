// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is connected, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

// Stage identity is data-driven (see the `stages` table) rather than a
// compile-time union, so new stages can be added/renamed/reordered from
// admin settings without a code change.
export type CcpsStage = string;
export type OrgRole = "owner" | "contributor";
export type PublishedStatus = "pending" | "approved" | "rejected";
export type KbStatus = "draft" | "published";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      organisations: {
        Row: { id: string; name: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["organisations"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["organisations"]["Row"]>;
      };
      org_members: {
        Row: {
          org_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["org_members"]["Row"]> & {
          org_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["org_members"]["Row"]>;
      };
      plans: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          created_by: string;
          current_stage: CcpsStage;
          background: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["plans"]["Row"]> & {
          org_id: string;
          name: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Row"]>;
      };
      plan_stage_responses: {
        Row: {
          id: string;
          plan_id: string;
          stage: CcpsStage;
          field_key: string;
          content: unknown;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["plan_stage_responses"]["Row"]
        > & {
          plan_id: string;
          stage: CcpsStage;
          field_key: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["plan_stage_responses"]["Row"]
        >;
      };
      checklist_items: {
        Row: {
          id: string;
          stage: CcpsStage;
          item_key: string;
          label: string;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["checklist_items"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["checklist_items"]["Row"]>;
      };
      stages: {
        Row: {
          key: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stages"]["Row"]> & {
          key: string;
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["stages"]["Row"]>;
      };
      validation_options: {
        Row: {
          id: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["validation_options"]["Row"]
        > & {
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["validation_options"]["Row"]>;
      };
      plan_checklist_items: {
        Row: {
          plan_id: string;
          item_key: string;
          stage: CcpsStage;
          label: string;
          sort_order: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["plan_checklist_items"]["Row"]
        > & {
          plan_id: string;
          item_key: string;
          stage: CcpsStage;
          label: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["plan_checklist_items"]["Row"]
        >;
      };
      plan_tags: {
        Row: { plan_id: string; tag: string };
        Insert: Database["public"]["Tables"]["plan_tags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["plan_tags"]["Row"]>;
      };
      stage_fields: {
        Row: {
          field_key: string;
          internal_id: string;
          stage: CcpsStage;
          short_name: string;
          full_prompt: string;
          helper_text: string | null;
          default_content: unknown | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stage_fields"]["Row"]> & {
          field_key: string;
          internal_id: string;
          stage: CcpsStage;
          short_name: string;
          full_prompt: string;
        };
        Update: Partial<Database["public"]["Tables"]["stage_fields"]["Row"]>;
      };
      plan_checklist_state: {
        Row: {
          plan_id: string;
          item_key: string;
          checked: boolean;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["plan_checklist_state"]["Row"]
        > & {
          plan_id: string;
          item_key: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["plan_checklist_state"]["Row"]
        >;
      };
      exemplars: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["exemplars"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["exemplars"]["Row"]>;
      };
      exemplar_fields: {
        Row: {
          exemplar_id: string;
          stage: CcpsStage;
          field_key: string;
          content: unknown;
        };
        Insert: Partial<Database["public"]["Tables"]["exemplar_fields"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["exemplar_fields"]["Row"]>;
      };
      feedback_comments: {
        Row: {
          id: string;
          plan_id: string;
          stage: CcpsStage;
          author_id: string;
          body: string;
          created_at: string;
          resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["feedback_comments"]["Row"]
        > & {
          plan_id: string;
          stage: CcpsStage;
          author_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback_comments"]["Row"]>;
      };
      admins: {
        Row: { user_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["admins"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["admins"]["Row"]>;
      };
      published_plans: {
        Row: {
          id: string;
          source_plan_id: string | null;
          source_org_id: string | null;
          published_by: string | null;
          snapshot_name: string;
          snapshot_current_stage: CcpsStage;
          status: PublishedStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["published_plans"]["Row"]> & {
          snapshot_name: string;
          snapshot_current_stage: CcpsStage;
        };
        Update: Partial<Database["public"]["Tables"]["published_plans"]["Row"]>;
      };
      published_plan_fields: {
        Row: {
          published_plan_id: string;
          stage: CcpsStage;
          field_key: string;
          content: unknown;
        };
        Insert: Partial<
          Database["public"]["Tables"]["published_plan_fields"]["Row"]
        > & {
          published_plan_id: string;
          stage: CcpsStage;
          field_key: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["published_plan_fields"]["Row"]
        >;
      };
      published_plan_checklist_state: {
        Row: { published_plan_id: string; item_key: string; checked: boolean };
        Insert: Partial<
          Database["public"]["Tables"]["published_plan_checklist_state"]["Row"]
        > & {
          published_plan_id: string;
          item_key: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["published_plan_checklist_state"]["Row"]
        >;
      };
      tags: {
        Row: { id: string; name: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
      };
      published_plan_tags: {
        Row: { published_plan_id: string; tag_id: string };
        Insert: Database["public"]["Tables"]["published_plan_tags"]["Row"];
        Update: Partial<
          Database["public"]["Tables"]["published_plan_tags"]["Row"]
        >;
      };
      kb_articles: {
        Row: {
          id: string;
          title: string;
          body: unknown;
          stage: CcpsStage | null;
          status: KbStatus;
          sort_order: number;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["kb_articles"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["kb_articles"]["Row"]>;
      };
    };
  };
}

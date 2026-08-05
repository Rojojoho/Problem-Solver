// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is connected, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

export type CcpsStage = "PI" | "PC" | "SR" | "SS" | "EI";
export type OrgRole = "owner" | "contributor";
export type PublishedStatus = "pending" | "approved" | "rejected";

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
    };
  };
}

import "server-only";
import { redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/server";
import { DEV_MOCK } from "@/lib/dev-mode";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { ExemplarData, FeedbackItemData } from "@/lib/ccps/types";
import * as mock from "@/lib/db/mock-store";

/**
 * Every function here branches on DEV_MOCK (see lib/dev-mode.ts) so pages
 * and server actions don't need to know whether they're talking to the
 * in-memory mock store or a real Supabase project.
 */

export async function getCurrentOrg() {
  if (DEV_MOCK) {
    return {
      orgId: mock.MOCK_ORG_ID,
      role: "owner" as const,
      orgName: "Dev Organisation (mock)",
      userId: mock.MOCK_USER_ID,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error } = await supabase
    .from("org_members")
    .select("org_id, role, organisations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error || !membership) {
    throw new Error("No organisation found for the current user.");
  }

  return {
    orgId: membership.org_id,
    role: membership.role,
    orgName: (membership.organisations as unknown as { name: string })?.name,
    userId: user.id,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  if (DEV_MOCK) return mock.MOCK_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (DEV_MOCK) return mock.mockIsAdmin(userId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function listPlans(orgId: string) {
  if (DEV_MOCK) return mock.mockListPlans(orgId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, name, current_stage, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function createPlanRecord(
  orgId: string,
  userId: string,
  name: string
) {
  if (DEV_MOCK) return mock.mockCreatePlan(orgId, name);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .insert({ org_id: orgId, name, created_by: userId })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create plan.");
  }
  return data;
}

export async function getPlan(id: string) {
  if (DEV_MOCK) return mock.mockGetPlan(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, name, current_stage")
    .eq("id", id)
    .single();
  return data;
}

export async function getStageResponses(
  planId: string,
  stage: CcpsStage
): Promise<Record<string, JSONContent>> {
  if (DEV_MOCK) return mock.mockGetStageResponses(planId, stage);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_stage_responses")
    .select("field_key, content")
    .eq("plan_id", planId)
    .eq("stage", stage);
  return Object.fromEntries(
    (data ?? []).map((r) => [r.field_key, r.content as JSONContent])
  );
}

export async function saveStageResponseRecord(
  planId: string,
  stage: CcpsStage,
  fieldKey: string,
  content: JSONContent,
  userId: string | null
) {
  if (DEV_MOCK) {
    mock.mockSaveStageResponse(planId, stage, fieldKey, content);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("plan_stage_responses").upsert(
    {
      plan_id: planId,
      stage,
      field_key: fieldKey,
      content,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,stage,field_key" }
  );
  if (error) throw new Error(error.message);
}

export async function getChecklistItems(stage: CcpsStage) {
  if (DEV_MOCK) return mock.CHECKLIST_ITEMS[stage];

  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("item_key, label, sort_order")
    .eq("stage", stage)
    .order("sort_order");
  return data ?? [];
}

export async function getChecklistState(
  planId: string
): Promise<Record<string, boolean>> {
  if (DEV_MOCK) return mock.mockGetChecklistState(planId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_checklist_state")
    .select("item_key, checked")
    .eq("plan_id", planId);
  return Object.fromEntries((data ?? []).map((s) => [s.item_key, s.checked]));
}

export async function toggleChecklistItemRecord(
  planId: string,
  itemKey: string,
  checked: boolean
) {
  if (DEV_MOCK) {
    mock.mockToggleChecklistItem(planId, itemKey, checked);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("plan_checklist_state").upsert(
    {
      plan_id: planId,
      item_key: itemKey,
      checked,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,item_key" }
  );
  if (error) throw new Error(error.message);
}

export async function getExemplars(stage: CcpsStage): Promise<ExemplarData[]> {
  if (DEV_MOCK) {
    return mock.EXEMPLARS.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      fields: e.fields[stage] ?? {},
    }));
  }

  const supabase = await createClient();
  const [{ data: exemplars }, { data: exemplarFields }] = await Promise.all([
    supabase.from("exemplars").select("id, name, description").order("sort_order"),
    supabase
      .from("exemplar_fields")
      .select("exemplar_id, field_key, content")
      .eq("stage", stage),
  ]);

  return (exemplars ?? []).map((ex) => ({
    id: ex.id,
    name: ex.name,
    description: ex.description,
    fields: Object.fromEntries(
      (exemplarFields ?? [])
        .filter((f) => f.exemplar_id === ex.id)
        .map((f) => [f.field_key, f.content as JSONContent])
    ),
  }));
}

export async function getFeedback(planId: string): Promise<FeedbackItemData[]> {
  if (DEV_MOCK) return mock.mockGetFeedback(planId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback_comments")
    .select("id, stage, body, created_at, profiles(full_name)")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((f) => ({
    id: f.id,
    stage: f.stage,
    author_name:
      (f.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? "Unknown",
    body: f.body,
    created_at: f.created_at,
  }));
}

export async function addFeedbackRecord(
  planId: string,
  stage: CcpsStage,
  body: string,
  userId: string
) {
  if (DEV_MOCK) {
    mock.mockAddFeedback(planId, stage, body);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_comments")
    .insert({ plan_id: planId, stage, author_id: userId, body });
  if (error) throw new Error(error.message);
}

export async function renamePlanRecord(planId: string, name: string) {
  if (DEV_MOCK) {
    mock.mockRenamePlan(planId, name);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw new Error(error.message);
}

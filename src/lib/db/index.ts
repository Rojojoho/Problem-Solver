import "server-only";
import { redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/server";
import { DEV_MOCK } from "@/lib/dev-mode";
import type {
  CcpsStage,
  KbStatus,
  PublishedStatus,
} from "@/lib/supabase/database.types";
import type {
  ExemplarData,
  FeedbackItemData,
  KbArticleData,
  PublishedPlanSummary,
  StageFieldSummary,
  TagData,
} from "@/lib/ccps/types";
import { STAGES } from "@/lib/ccps/constants";
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

  // Snapshot the current checklist template into this plan so later admin
  // edits to the template never change what an already-created plan shows.
  const { data: templateItems } = await supabase
    .from("checklist_items")
    .select("item_key, stage, label, sort_order");

  if (templateItems && templateItems.length) {
    const { error: snapshotError } = await supabase
      .from("plan_checklist_items")
      .insert(
        templateItems.map((item) => ({
          plan_id: data.id,
          item_key: item.item_key,
          stage: item.stage,
          label: item.label,
          sort_order: item.sort_order,
        }))
      );
    if (snapshotError) throw new Error(snapshotError.message);
  }

  // Snapshot the current stage-field template too, for the same reason.
  const { data: fieldTemplate } = await supabase
    .from("stage_fields")
    .select("field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order");

  if (fieldTemplate && fieldTemplate.length) {
    const { error: fieldSnapshotError } = await supabase
      .from("plan_stage_fields")
      .insert(
        fieldTemplate.map((field) => ({
          plan_id: data.id,
          field_key: field.field_key,
          internal_id: field.internal_id,
          stage: field.stage,
          short_name: field.short_name,
          full_prompt: field.full_prompt,
          helper_text: field.helper_text,
          sort_order: field.sort_order,
        }))
      );
    if (fieldSnapshotError) throw new Error(fieldSnapshotError.message);
  }

  return data;
}

export async function getPlan(id: string) {
  if (DEV_MOCK) return mock.mockGetPlan(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, name, current_stage, background")
    .eq("id", id)
    .single();
  if (!data) return null;
  return { ...data, background: data.background as JSONContent | null };
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

export async function getChecklistItems(planId: string, stage: CcpsStage) {
  if (DEV_MOCK) return mock.mockGetPlanChecklistItems(planId, stage);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_checklist_items")
    .select("item_key, label, sort_order")
    .eq("plan_id", planId)
    .eq("stage", stage)
    .order("sort_order");
  return data ?? [];
}

export async function getStageFields(
  planId: string,
  stage: CcpsStage
): Promise<StageFieldSummary[]> {
  if (DEV_MOCK) return mock.mockGetPlanStageFields(planId, stage);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_stage_fields")
    .select("field_key, internal_id, short_name, full_prompt, helper_text, sort_order")
    .eq("plan_id", planId)
    .eq("stage", stage)
    .order("sort_order");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Checklist template — the admin-editable global definition. Only read here
// at plan-creation time (see createPlanRecord) and by the admin editor below;
// end users viewing a plan always read the plan's own snapshot instead
// (getChecklistItems), never this live table.
// ---------------------------------------------------------------------------

export async function listChecklistTemplateItems(stage: CcpsStage) {
  if (DEV_MOCK) return mock.mockListChecklistTemplateItems(stage);

  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("id, item_key, stage, label, sort_order")
    .eq("stage", stage)
    .order("sort_order");
  return data ?? [];
}

export async function createChecklistTemplateItemRecord(
  stage: CcpsStage,
  itemKey: string,
  label: string,
  sortOrder: number
): Promise<{ id: string }> {
  if (DEV_MOCK) {
    return mock.mockCreateChecklistTemplateItem(stage, itemKey, label, sortOrder);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .insert({ stage, item_key: itemKey, label, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create checklist item.");
  }
  return data;
}

export async function updateChecklistTemplateItemRecord(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  if (DEV_MOCK) {
    mock.mockUpdateChecklistTemplateItem(id, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_items")
    .update({
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteChecklistTemplateItemRecord(id: string) {
  if (DEV_MOCK) {
    mock.mockDeleteChecklistTemplateItem(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Stage field template — the admin-editable global definition of each
// stage's input fields. Only read here at plan-creation time (see
// createPlanRecord) and by the admin editor below; end users viewing a plan
// always read the plan's own snapshot instead (getStageFields), never this
// live table.
// ---------------------------------------------------------------------------

export async function listStageFieldTemplates(stage: CcpsStage) {
  if (DEV_MOCK) return mock.mockListStageFieldTemplates(stage);

  const supabase = await createClient();
  const { data } = await supabase
    .from("stage_fields")
    .select(
      "id, field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order"
    )
    .eq("stage", stage)
    .order("sort_order");
  return data ?? [];
}

export async function createStageFieldTemplateRecord(
  stage: CcpsStage,
  fieldKey: string,
  internalId: string,
  shortName: string,
  fullPrompt: string,
  helperText: string | null,
  sortOrder: number
): Promise<{ id: string }> {
  if (DEV_MOCK) {
    return mock.mockCreateStageFieldTemplate(
      stage,
      fieldKey,
      internalId,
      shortName,
      fullPrompt,
      helperText,
      sortOrder
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_fields")
    .insert({
      stage,
      field_key: fieldKey,
      internal_id: internalId,
      short_name: shortName,
      full_prompt: fullPrompt,
      helper_text: helperText,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create stage field.");
  }
  return data;
}

export async function updateStageFieldTemplateRecord(
  id: string,
  updates: {
    shortName?: string;
    fullPrompt?: string;
    helperText?: string | null;
    sortOrder?: number;
  }
) {
  if (DEV_MOCK) {
    mock.mockUpdateStageFieldTemplate(id, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_fields")
    .update({
      ...(updates.shortName !== undefined ? { short_name: updates.shortName } : {}),
      ...(updates.fullPrompt !== undefined ? { full_prompt: updates.fullPrompt } : {}),
      ...(updates.helperText !== undefined ? { helper_text: updates.helperText } : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStageFieldTemplateRecord(id: string) {
  if (DEV_MOCK) {
    mock.mockDeleteStageFieldTemplate(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stage_fields").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
    .select("id, stage, body, created_at, resolved, profiles(full_name)")
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
    resolved: f.resolved,
  }));
}

export async function toggleFeedbackResolvedRecord(
  feedbackId: string,
  resolved: boolean,
  userId: string | null
) {
  if (DEV_MOCK) {
    mock.mockToggleFeedbackResolved(feedbackId, resolved, userId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_comments")
    .update({
      resolved,
      resolved_by: resolved ? userId : null,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", feedbackId);
  if (error) throw new Error(error.message);
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

export async function saveBackgroundRecord(
  planId: string,
  content: JSONContent
) {
  if (DEV_MOCK) {
    mock.mockSaveBackground(planId, content);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ background: content, updated_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw new Error(error.message);
}

export async function getPlanTags(planId: string): Promise<string[]> {
  if (DEV_MOCK) return mock.mockGetPlanTags(planId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_tags")
    .select("tag")
    .eq("plan_id", planId);
  return (data ?? []).map((t) => t.tag);
}

export async function addPlanTagRecord(planId: string, tag: string) {
  if (DEV_MOCK) {
    mock.mockAddPlanTag(planId, tag);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_tags")
    .upsert({ plan_id: planId, tag }, { onConflict: "plan_id,tag" });
  if (error) throw new Error(error.message);
}

export async function removePlanTagRecord(planId: string, tag: string) {
  if (DEV_MOCK) {
    mock.mockRemovePlanTag(planId, tag);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_tags")
    .delete()
    .eq("plan_id", planId)
    .eq("tag", tag);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Publishing — snapshotting a plan into the shared/central database.
// ---------------------------------------------------------------------------

export async function publishPlanRecord(
  planId: string,
  orgId: string,
  userId: string
): Promise<{ id: string }> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error("Plan not found.");

  const stageResponsesByStage = await Promise.all(
    STAGES.map((s) => getStageResponses(planId, s.key))
  );
  const checklistState = await getChecklistState(planId);

  if (DEV_MOCK) {
    return mock.mockPublishPlan(
      planId,
      orgId,
      userId,
      plan.name,
      plan.current_stage,
      STAGES.map((s, i) => ({ stage: s.key, fields: stageResponsesByStage[i] })),
      checklistState
    );
  }

  const supabase = await createClient();
  const { data: publishedPlan, error } = await supabase
    .from("published_plans")
    .insert({
      source_plan_id: planId,
      source_org_id: orgId,
      published_by: userId,
      snapshot_name: plan.name,
      snapshot_current_stage: plan.current_stage,
    })
    .select("id")
    .single();

  if (error || !publishedPlan) {
    throw new Error(error?.message ?? "Failed to publish plan.");
  }

  const fieldRows = STAGES.flatMap((s, i) =>
    Object.entries(stageResponsesByStage[i]).map(([fieldKey, content]) => ({
      published_plan_id: publishedPlan.id,
      stage: s.key,
      field_key: fieldKey,
      content,
    }))
  );
  if (fieldRows.length) {
    const { error: fieldsError } = await supabase
      .from("published_plan_fields")
      .insert(fieldRows);
    if (fieldsError) throw new Error(fieldsError.message);
  }

  const checklistRows = Object.entries(checklistState).map(
    ([itemKey, checked]) => ({
      published_plan_id: publishedPlan.id,
      item_key: itemKey,
      checked,
    })
  );
  if (checklistRows.length) {
    const { error: checklistError } = await supabase
      .from("published_plan_checklist_state")
      .insert(checklistRows);
    if (checklistError) throw new Error(checklistError.message);
  }

  return { id: publishedPlan.id };
}

export async function getLatestPublishedPlanForSource(
  planId: string
): Promise<{ id: string; status: PublishedStatus } | null> {
  if (DEV_MOCK) return mock.mockGetLatestPublishedPlanForSource(planId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("published_plans")
    .select("id, status")
    .eq("source_plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function listPublishedPlansForAdmin(
  status?: PublishedStatus
): Promise<PublishedPlanSummary[]> {
  if (DEV_MOCK) return mock.mockListPublishedPlansForAdmin(status);

  const supabase = await createClient();
  let query = supabase
    .from("published_plans")
    .select(
      "id, snapshot_name, snapshot_current_stage, status, created_at, review_note, organisations(name)"
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: rows } = await query;

  const ids = (rows ?? []).map((r) => r.id);
  const { data: tagRows } = ids.length
    ? await supabase
        .from("published_plan_tags")
        .select("published_plan_id, tags(id, name)")
        .in("published_plan_id", ids)
    : { data: [] as { published_plan_id: string; tags: TagData | null }[] };

  return (rows ?? []).map((r) => ({
    id: r.id,
    sourceOrgName:
      (r.organisations as unknown as { name: string } | null)?.name ?? null,
    snapshotName: r.snapshot_name,
    snapshotCurrentStage: r.snapshot_current_stage,
    status: r.status,
    createdAt: r.created_at,
    reviewNote: r.review_note,
    tags: (tagRows ?? [])
      .filter((t) => t.published_plan_id === r.id)
      .map((t) => t.tags as unknown as TagData)
      .filter(Boolean),
  }));
}

export async function approvePublishedPlanRecord(
  id: string,
  adminUserId: string
) {
  if (DEV_MOCK) {
    mock.mockSetPublishedPlanStatus(id, "approved", adminUserId, null);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("published_plans")
    .update({
      status: "approved",
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function rejectPublishedPlanRecord(
  id: string,
  adminUserId: string,
  note: string | null
) {
  if (DEV_MOCK) {
    mock.mockSetPublishedPlanStatus(id, "rejected", adminUserId, note);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("published_plans")
    .update({
      status: "rejected",
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function promoteToExemplarRecord(
  publishedPlanId: string,
  name: string,
  description: string | null
): Promise<{ id: string }> {
  if (DEV_MOCK) {
    return mock.mockPromoteToExemplar(publishedPlanId, name, description);
  }

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("published_plan_fields")
    .select("stage, field_key, content")
    .eq("published_plan_id", publishedPlanId);

  const { data: exemplar, error } = await supabase
    .from("exemplars")
    .insert({ name, description })
    .select("id")
    .single();
  if (error || !exemplar) {
    throw new Error(error?.message ?? "Failed to create exemplar.");
  }

  const fieldRows = (fields ?? []).map((f) => ({
    exemplar_id: exemplar.id,
    stage: f.stage,
    field_key: f.field_key,
    content: f.content,
  }));
  if (fieldRows.length) {
    const { error: fieldsError } = await supabase
      .from("exemplar_fields")
      .insert(fieldRows);
    if (fieldsError) throw new Error(fieldsError.message);
  }

  return { id: exemplar.id };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function listTags(): Promise<TagData[]> {
  if (DEV_MOCK) return mock.mockListTags();

  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, name").order("name");
  return data ?? [];
}

export async function createTagRecord(name: string): Promise<TagData> {
  const trimmed = name.trim();
  if (DEV_MOCK) return mock.mockCreateTag(trimmed);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed })
    .select("id, name")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create tag.");
  return data;
}

export async function tagPublishedPlanRecord(
  publishedPlanId: string,
  tagId: string
) {
  if (DEV_MOCK) {
    mock.mockTagPublishedPlan(publishedPlanId, tagId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("published_plan_tags")
    .upsert(
      { published_plan_id: publishedPlanId, tag_id: tagId },
      { onConflict: "published_plan_id,tag_id" }
    );
  if (error) throw new Error(error.message);
}

export async function untagPublishedPlanRecord(
  publishedPlanId: string,
  tagId: string
) {
  if (DEV_MOCK) {
    mock.mockUntagPublishedPlan(publishedPlanId, tagId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("published_plan_tags")
    .delete()
    .eq("published_plan_id", publishedPlanId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

export async function listKbArticles(
  publishedOnly = true
): Promise<KbArticleData[]> {
  if (DEV_MOCK) return mock.mockListKbArticles(publishedOnly);

  const supabase = await createClient();
  let query = supabase
    .from("kb_articles")
    .select("id, title, body, stage, status, updated_at")
    .order("sort_order");
  if (publishedOnly) query = query.eq("status", "published");
  const { data } = await query;

  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body as JSONContent,
    stage: a.stage,
    status: a.status,
    updatedAt: a.updated_at,
  }));
}

export async function getKbArticle(id: string): Promise<KbArticleData | null> {
  if (DEV_MOCK) return mock.mockGetKbArticle(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("kb_articles")
    .select("id, title, body, stage, status, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    body: data.body as JSONContent,
    stage: data.stage,
    status: data.status,
    updatedAt: data.updated_at,
  };
}

export async function createKbArticleRecord(
  title: string,
  authorId: string | null
): Promise<{ id: string }> {
  if (DEV_MOCK) return mock.mockCreateKbArticle(title, authorId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_articles")
    .insert({ title, author_id: authorId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create article.");
  return data;
}

export async function updateKbArticleRecord(
  id: string,
  updates: {
    title?: string;
    body?: JSONContent;
    stage?: CcpsStage | null;
    status?: KbStatus;
  }
) {
  if (DEV_MOCK) {
    mock.mockUpdateKbArticle(id, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("kb_articles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteKbArticleRecord(id: string) {
  if (DEV_MOCK) {
    mock.mockDeleteKbArticle(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kb_articles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

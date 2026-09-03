import "server-only";
import { redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/server";
import { DEV_MOCK } from "@/lib/dev-mode";
import { EMPTY_DOC } from "@/lib/ccps/constants";
import type {
  CcpsStage,
  KbStatus,
  PublishedStatus,
} from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  DiagramHeadings,
  ExemplarData,
  FeedbackItemData,
  KbArticleData,
  LabeledOption,
  OrgMemberSummary,
  PendingInvite,
  PublicPlanBundle,
  PublishedPlanSummary,
  SchoolSummary,
  StageData,
  StageFieldSummary,
  TagData,
  ValidationOption,
  WorkspaceTabPositions,
} from "@/lib/ccps/types";
import * as mock from "@/lib/db/mock-store";

/**
 * Every function here branches on DEV_MOCK (see lib/dev-mode.ts) so pages
 * and server actions don't need to know whether they're talking to the
 * in-memory mock store or a real Supabase project.
 */

export async function getCurrentOrg() {
  if (DEV_MOCK) {
    const current = mock.mockGetCurrentOrgForUser(mock.MOCK_USER_ID);
    if (!current) throw new Error("No organisation found for the current user.");
    return { ...current, userId: mock.MOCK_USER_ID };
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
    .select("org_id, role, organisations(id, name, join_code)")
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
    joinCode: (membership.organisations as unknown as { join_code: string })?.join_code,
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

// ---------------------------------------------------------------------------
// Schools (organisations) — the admin CRM list, join codes, and per-org
// membership. See 0025_school_crm_and_join_codes.sql.
// ---------------------------------------------------------------------------

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function listSchoolsForAdmin(): Promise<SchoolSummary[]> {
  if (DEV_MOCK) {
    return mock.mockListSchools().map((o) => ({
      id: o.id,
      name: o.name,
      joinCode: o.join_code,
      primaryContactName: o.primary_contact_name,
      primaryContactEmail: o.primary_contact_email,
      accountsEmail: o.accounts_email,
      adminUserCode: o.admin_user_code,
      subscriptionUntil: o.subscription_until,
      yearlyCharge: o.yearly_charge,
      salesContact: o.sales_contact,
      notes: o.notes,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select(
      "id, name, join_code, primary_contact_name, primary_contact_email, accounts_email, admin_user_code, subscription_until, yearly_charge, sales_contact, notes"
    )
    .order("name");
  return (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    joinCode: o.join_code,
    primaryContactName: o.primary_contact_name,
    primaryContactEmail: o.primary_contact_email,
    accountsEmail: o.accounts_email,
    adminUserCode: o.admin_user_code,
    subscriptionUntil: o.subscription_until,
    yearlyCharge: o.yearly_charge,
    salesContact: o.sales_contact,
    notes: o.notes,
  }));
}

export interface SchoolCrmInput {
  name: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  accountsEmail: string | null;
  adminUserCode: string | null;
  subscriptionUntil: string | null;
  yearlyCharge: number | null;
  salesContact: string | null;
  notes: string | null;
}

export async function createSchoolRecord(input: SchoolCrmInput): Promise<SchoolSummary> {
  if (DEV_MOCK) {
    const o = mock.mockCreateSchool(input);
    return {
      id: o.id,
      name: o.name,
      joinCode: o.join_code,
      primaryContactName: o.primary_contact_name,
      primaryContactEmail: o.primary_contact_email,
      accountsEmail: o.accounts_email,
      adminUserCode: o.admin_user_code,
      subscriptionUntil: o.subscription_until,
      yearlyCharge: o.yearly_charge,
      salesContact: o.sales_contact,
      notes: o.notes,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .insert({
      name: input.name,
      join_code: generateJoinCode(),
      primary_contact_name: input.primaryContactName,
      primary_contact_email: input.primaryContactEmail,
      accounts_email: input.accountsEmail,
      admin_user_code: input.adminUserCode,
      subscription_until: input.subscriptionUntil,
      yearly_charge: input.yearlyCharge,
      sales_contact: input.salesContact,
      notes: input.notes,
    })
    .select(
      "id, name, join_code, primary_contact_name, primary_contact_email, accounts_email, admin_user_code, subscription_until, yearly_charge, sales_contact, notes"
    )
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't create that school.");
  return {
    id: data.id,
    name: data.name,
    joinCode: data.join_code,
    primaryContactName: data.primary_contact_name,
    primaryContactEmail: data.primary_contact_email,
    accountsEmail: data.accounts_email,
    adminUserCode: data.admin_user_code,
    subscriptionUntil: data.subscription_until,
    yearlyCharge: data.yearly_charge,
    salesContact: data.sales_contact,
    notes: data.notes,
  };
}

export async function updateSchoolRecord(
  orgId: string,
  input: SchoolCrmInput
): Promise<void> {
  if (DEV_MOCK) {
    mock.mockUpdateSchool(orgId, {
      name: input.name,
      primary_contact_name: input.primaryContactName,
      primary_contact_email: input.primaryContactEmail,
      accounts_email: input.accountsEmail,
      admin_user_code: input.adminUserCode,
      subscription_until: input.subscriptionUntil,
      yearly_charge: input.yearlyCharge,
      sales_contact: input.salesContact,
      notes: input.notes,
    });
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisations")
    .update({
      name: input.name,
      primary_contact_name: input.primaryContactName,
      primary_contact_email: input.primaryContactEmail,
      accounts_email: input.accountsEmail,
      admin_user_code: input.adminUserCode,
      subscription_until: input.subscriptionUntil,
      yearly_charge: input.yearlyCharge,
      sales_contact: input.salesContact,
      notes: input.notes,
    })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
}

export async function regenerateJoinCodeRecord(orgId: string): Promise<string> {
  if (DEV_MOCK) return mock.mockRegenerateJoinCode(orgId);

  const supabase = await createClient();
  const joinCode = generateJoinCode();
  const { error } = await supabase
    .from("organisations")
    .update({ join_code: joinCode })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
  return joinCode;
}

export async function listOrgMembers(orgId: string): Promise<OrgMemberSummary[]> {
  if (DEV_MOCK) return mock.mockListOrgMembers(orgId).map((m) => ({
    userId: m.user_id,
    role: m.role,
    displayName: m.display_name,
    email: m.email,
    nickname: m.nickname,
  }));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_org_members", { p_org_id: orgId });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrgMemberSummary[];
}

export async function removeOrgMemberRecord(orgId: string, userId: string): Promise<void> {
  // A school should never end up with zero admins — check this at the app
  // layer since DEV_MOCK has no RLS/constraint to enforce it either way.
  const members = await listOrgMembers(orgId);
  const target = members.find((m) => m.userId === userId);
  const ownerCount = members.filter((m) => m.role === "owner").length;
  if (target?.role === "owner" && ownerCount <= 1) {
    throw new Error("Can't remove the only admin — promote someone else first.");
  }

  if (DEV_MOCK) {
    mock.mockRemoveOrgMember(orgId, userId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function listPendingInvites(orgId: string): Promise<PendingInvite[]> {
  if (DEV_MOCK) return mock.mockListPendingInvites(orgId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_invites")
    .select("id, email, full_name, nickname, role, created_at")
    .eq("org_id", orgId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    fullName: i.full_name,
    nickname: i.nickname,
    role: i.role,
    createdAt: i.created_at,
  }));
}

export interface InviteInput {
  email: string;
  fullName: string | null;
  nickname: string | null;
  role: "owner" | "contributor";
}

export async function createInviteRecord(orgId: string, input: InviteInput): Promise<void> {
  if (DEV_MOCK) {
    mock.mockCreateInvite(orgId, input);
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("pending_invites").upsert(
    {
      org_id: orgId,
      email: input.email.trim().toLowerCase(),
      full_name: input.fullName,
      nickname: input.nickname,
      role: input.role,
      invited_by: user?.id ?? null,
    },
    { onConflict: "email" }
  );
  if (error) throw new Error(error.message);
}

export async function deleteInviteRecord(inviteId: string): Promise<void> {
  if (DEV_MOCK) {
    mock.mockDeleteInvite(inviteId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pending_invites").delete().eq("id", inviteId);
  if (error) throw new Error(error.message);
}

export async function joinOrgByCodeRecord(
  code: string
): Promise<{ orgId: string; orgName: string }> {
  if (DEV_MOCK) return mock.mockJoinOrgByCode(code, mock.MOCK_USER_ID);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_org_by_code", { p_code: code });
  if (error) throw new Error(error.message);
  return data as unknown as { orgId: string; orgName: string };
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

  return data;
}

export async function getPlan(id: string) {
  if (DEV_MOCK) return mock.mockGetPlan(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, name, current_stage, background, share_token, share_enabled")
    .eq("id", id)
    .single();
  if (!data) return null;
  return { ...data, background: data.background as JSONContent | null };
}

export async function enablePlanShareRecord(planId: string): Promise<string | null> {
  if (DEV_MOCK) return mock.mockEnablePlanShare(planId);

  const token = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ share_token: token, share_enabled: true })
    .eq("id", planId);
  if (error) throw new Error(error.message);
  return token;
}

export async function disablePlanShareRecord(planId: string) {
  if (DEV_MOCK) {
    mock.mockDisablePlanShare(planId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ share_enabled: false, share_token: null })
    .eq("id", planId);
  if (error) throw new Error(error.message);
}

export async function getPublicPlanBundle(
  token: string
): Promise<PublicPlanBundle | null> {
  if (DEV_MOCK) return mock.mockGetPublicPlanBundle(token);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_plan_bundle", {
    p_token: token,
  });
  if (error || !data) return null;
  return data as unknown as PublicPlanBundle;
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

// Stage fields are a small global reference table, not a per-plan snapshot
// — the set of fields and their field_key values are fixed in the migration
// seed (matching plan_stage_responses/exemplar_fields exactly); only the
// display text (short_name/full_prompt/helper_text/sort_order) plus
// whether it's hidden is editable, from /admin/settings/fields.
// Hidden fields are excluded by default (every plan-rendering call site —
// the live plan page, stage-bundle fetch, and Summary rollup — wants this);
// pass includeHidden so the admin editor can still see and un-hide them.
export async function getStageFields(
  stage: CcpsStage,
  { includeHidden = false }: { includeHidden?: boolean } = {}
): Promise<StageFieldSummary[]> {
  if (DEV_MOCK) return mock.mockGetStageFields(stage, { includeHidden });

  const supabase = await createClient();
  let query = supabase
    .from("stage_fields")
    .select(
      "field_key, internal_id, short_name, full_prompt, helper_text, default_content, sort_order, hidden"
    )
    .eq("stage", stage);
  if (!includeHidden) {
    query = query.eq("hidden", false);
  }
  const { data } = await query.order("sort_order");
  return (data ?? []).map((f) => ({
    ...f,
    default_content: f.default_content as JSONContent | null,
  }));
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

// Admin editing: field_key/internal_id/stage are fixed and not editable —
// only the display text and ordering can change.
export async function updateStageFieldRecord(
  fieldKey: string,
  updates: {
    shortName?: string;
    fullPrompt?: string;
    helperText?: string | null;
    defaultContent?: JSONContent | null;
    sortOrder?: number;
    hidden?: boolean;
  }
) {
  if (DEV_MOCK) {
    mock.mockUpdateStageField(fieldKey, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_fields")
    .update({
      ...(updates.shortName !== undefined ? { short_name: updates.shortName } : {}),
      ...(updates.fullPrompt !== undefined ? { full_prompt: updates.fullPrompt } : {}),
      ...(updates.helperText !== undefined ? { helper_text: updates.helperText } : {}),
      ...(updates.defaultContent !== undefined
        ? { default_content: updates.defaultContent }
        : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
      ...(updates.hidden !== undefined ? { hidden: updates.hidden } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("field_key", fieldKey);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Stages — global, admin-editable, orderable list of stage identities.
// Replaces the old fixed ccps_stage enum so stages can be renamed/reordered/
// added from admin settings without a schema migration.
// ---------------------------------------------------------------------------

export async function listStages(): Promise<StageData[]> {
  if (DEV_MOCK) return mock.mockListStages();

  const supabase = await createClient();
  const { data } = await supabase
    .from("stages")
    .select("key, label, sort_order")
    .order("sort_order");
  return data ?? [];
}

export async function createStageRecord(
  key: string,
  label: string,
  sortOrder: number
): Promise<{ key: string }> {
  if (DEV_MOCK) return mock.mockCreateStage(key, label, sortOrder);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stages")
    .insert({ key, label, sort_order: sortOrder })
    .select("key")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create stage.");
  }
  return data;
}

export async function updateStageRecord(
  key: string,
  updates: { label?: string; sortOrder?: number }
) {
  if (DEV_MOCK) {
    mock.mockUpdateStage(key, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stages")
    .update({
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
    })
    .eq("key", key);
  if (error) throw new Error(error.message);
}

// The sort position of the "Plan Details" and "Summary" tabs — kept
// separate from the `stages` table (see 0023_workspace_tab_positions.sql)
// so those two pseudo-tabs don't leak into the several places that assume
// `stages` is exactly the 7 real content stages. Merged with `stages` only
// at render time, in plan-workspace.tsx / public-plan-view.tsx and their
// admin editor equivalent.
const DEFAULT_WORKSPACE_TAB_POSITIONS: WorkspaceTabPositions = {
  details: -2,
  summary: -1,
};

export async function getWorkspaceTabPositions(): Promise<WorkspaceTabPositions> {
  if (DEV_MOCK) return mock.mockGetWorkspaceTabPositions();

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_tab_positions")
    .select("key, sort_order");
  const byKey = new Map((data ?? []).map((row) => [row.key, row.sort_order]));
  return {
    details: byKey.get("details") ?? DEFAULT_WORKSPACE_TAB_POSITIONS.details,
    summary: byKey.get("summary") ?? DEFAULT_WORKSPACE_TAB_POSITIONS.summary,
  };
}

export async function updateWorkspaceTabPositionRecord(
  key: "details" | "summary",
  sortOrder: number
) {
  if (DEV_MOCK) {
    mock.mockUpdateWorkspaceTabPosition(key, sortOrder);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_tab_positions")
    .update({ sort_order: sortOrder })
    .eq("key", key);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Validation options — global, admin-editable statuses selectable per
// causal hypothesis on Stage 2. Same shape/pattern as checklist_items.
// ---------------------------------------------------------------------------

export async function listValidationOptions(): Promise<ValidationOption[]> {
  if (DEV_MOCK) return mock.mockListValidationOptions();

  const supabase = await createClient();
  const { data } = await supabase
    .from("validation_options")
    .select("id, label, sort_order")
    .order("sort_order");
  return data ?? [];
}

export async function createValidationOptionRecord(
  label: string,
  sortOrder: number
): Promise<{ id: string }> {
  if (DEV_MOCK) return mock.mockCreateValidationOption(label, sortOrder);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("validation_options")
    .insert({ label, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create validation option.");
  }
  return data;
}

export async function updateValidationOptionRecord(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  if (DEV_MOCK) {
    mock.mockUpdateValidationOption(id, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("validation_options")
    .update({
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteValidationOptionRecord(id: string) {
  if (DEV_MOCK) {
    mock.mockDeleteValidationOption(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("validation_options").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Requirement types — global, admin-editable "Type" options selectable per
// solution requirement on Stage 3A. Same shape/pattern as validation_options.
// ---------------------------------------------------------------------------

const DEFAULT_DIAGRAM_HEADINGS: DiagramHeadings = {
  problem: "The problem to be solved is",
  causes: "The agreed causes that contribute to this problem are",
  requirements: "A solution will need to meet the following requirements",
  strategy: "A solution strategy is",
};

export async function getDiagramHeadings(): Promise<DiagramHeadings> {
  if (DEV_MOCK) return mock.mockGetDiagramHeadings();

  const supabase = await createClient();
  const { data } = await supabase
    .from("diagram_settings")
    .select("problem_heading, causes_heading, requirements_heading, strategy_heading")
    .single();
  if (!data) return DEFAULT_DIAGRAM_HEADINGS;
  return {
    problem: data.problem_heading,
    causes: data.causes_heading,
    requirements: data.requirements_heading,
    strategy: data.strategy_heading,
  };
}

export async function updateDiagramHeadingsRecord(updates: Partial<DiagramHeadings>) {
  if (DEV_MOCK) {
    mock.mockUpdateDiagramHeadings(updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("diagram_settings")
    .update({
      ...(updates.problem !== undefined ? { problem_heading: updates.problem } : {}),
      ...(updates.causes !== undefined ? { causes_heading: updates.causes } : {}),
      ...(updates.requirements !== undefined
        ? { requirements_heading: updates.requirements }
        : {}),
      ...(updates.strategy !== undefined ? { strategy_heading: updates.strategy } : {}),
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
}

export async function listRequirementTypes(): Promise<LabeledOption[]> {
  if (DEV_MOCK) return mock.mockListRequirementTypes();

  const supabase = await createClient();
  const { data } = await supabase
    .from("requirement_types")
    .select("id, label, sort_order")
    .order("sort_order");
  return data ?? [];
}

export async function createRequirementTypeRecord(
  label: string,
  sortOrder: number
): Promise<{ id: string }> {
  if (DEV_MOCK) return mock.mockCreateRequirementType(label, sortOrder);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requirement_types")
    .insert({ label, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create requirement type.");
  }
  return data;
}

export async function updateRequirementTypeRecord(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  if (DEV_MOCK) {
    mock.mockUpdateRequirementType(id, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("requirement_types")
    .update({
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRequirementTypeRecord(id: string) {
  if (DEV_MOCK) {
    mock.mockDeleteRequirementType(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("requirement_types").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Impact measure types — global, admin-editable "Type" options selectable
// per measure on Stage 5. Same shape/pattern as requirement_types.
// ---------------------------------------------------------------------------

export async function listImpactMeasureTypes(): Promise<LabeledOption[]> {
  if (DEV_MOCK) return mock.mockListImpactMeasureTypes();

  const supabase = await createClient();
  const { data } = await supabase
    .from("impact_measure_types")
    .select("id, label, sort_order")
    .order("sort_order");
  return data ?? [];
}

export async function createImpactMeasureTypeRecord(
  label: string,
  sortOrder: number
): Promise<{ id: string }> {
  if (DEV_MOCK) return mock.mockCreateImpactMeasureType(label, sortOrder);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("impact_measure_types")
    .insert({ label, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create impact measure type.");
  }
  return data;
}

export async function updateImpactMeasureTypeRecord(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  if (DEV_MOCK) {
    mock.mockUpdateImpactMeasureType(id, updates);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("impact_measure_types")
    .update({
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.sortOrder !== undefined ? { sort_order: updates.sortOrder } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteImpactMeasureTypeRecord(id: string) {
  if (DEV_MOCK) {
    mock.mockDeleteImpactMeasureType(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("impact_measure_types").delete().eq("id", id);
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

export interface StageBundleCore {
  fields: StageFieldSummary[];
  responses: Record<string, JSONContent>;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
}

// The always-fetched-every-stage-switch half of getStageBundle (see
// web/src/app/(app)/plans/[id]/actions.ts) — fields, responses, checklist
// items/state, and exemplars used to be 5 separate Supabase requests that
// timing instrumentation showed queueing behind each other (1-3+ seconds
// per tab click) rather than truly running in parallel. Consolidated into
// one Postgres function call (0029_get_stage_bundle_rpc.sql) — same
// bundling pattern already used for the public share view's
// get_public_plan_bundle. The stage-conditional extras (validation
// options, requirement types, etc.) stay as separate calls in
// getStageBundle since at most one of them ever actually queries anything
// for a given stage — folding them in here wouldn't meaningfully reduce
// round trips, just add SQL complexity for no real gain.
export async function getStageBundleCore(
  planId: string,
  stage: CcpsStage
): Promise<StageBundleCore> {
  if (DEV_MOCK) {
    const [fields, responses, checklistItems, checklistState, exemplars] = await Promise.all([
      mock.mockGetStageFields(stage),
      mock.mockGetStageResponses(planId, stage),
      mock.mockGetPlanChecklistItems(planId, stage),
      mock.mockGetChecklistState(planId),
      mock.mockGetExemplars(stage),
    ]);
    return {
      fields,
      responses,
      checklist: checklistItems.map((item) => ({
        item_key: item.item_key,
        label: item.label,
        checked: checklistState[item.item_key] ?? false,
      })),
      exemplars,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_stage_bundle", {
    p_plan_id: planId,
    p_stage: stage,
  });
  if (error || !data) throw new Error(error?.message ?? "Failed to load stage.");

  const bundle = data as unknown as {
    fields: StageFieldSummary[];
    responses: Record<string, JSONContent>;
    checklistItems: { item_key: string; label: string; sort_order: number }[];
    checklistState: Record<string, boolean>;
    exemplars: ExemplarData[];
  };

  return {
    fields: bundle.fields,
    responses: bundle.responses,
    checklist: bundle.checklistItems.map((item) => ({
      item_key: item.item_key,
      label: item.label,
      checked: bundle.checklistState[item.item_key] ?? false,
    })),
    exemplars: bundle.exemplars,
  };
}

// Exemplars are just approved published-plan submissions an admin has
// flagged (published_plans.is_exemplar) — see 0028_published_plan_exemplars.sql
// for why this replaced the old, separate exemplars/exemplar_fields tables
// (which had no admin write RLS and couldn't render row-table fields at
// all). `getExemplars` only needs each exemplar's metadata plus this one
// stage's fields for the dropdown; `getExemplarDetail` below fetches the
// *whole* exemplar (every stage) once one is actually selected, since
// row-table fields like Solution Requirements need cross-stage labels to
// render correctly (see read-only-field-content.tsx).
export async function getExemplars(stage: CcpsStage): Promise<ExemplarData[]> {
  if (DEV_MOCK) return mock.mockGetExemplars(stage);

  const supabase = await createClient();
  const [{ data: exemplars }, { data: exemplarFields }] = await Promise.all([
    supabase
      .from("published_plans")
      .select("id, snapshot_name")
      .eq("is_exemplar", true)
      .eq("status", "approved")
      .order("snapshot_name"),
    supabase
      .from("published_plan_fields")
      .select("published_plan_id, field_key, content")
      .eq("stage", stage),
  ]);

  return (exemplars ?? []).map((ex) => ({
    id: ex.id,
    name: ex.snapshot_name,
    fields: Object.fromEntries(
      (exemplarFields ?? [])
        .filter((f) => f.published_plan_id === ex.id)
        .map((f) => [f.field_key, f.content as JSONContent])
    ),
  }));
}

export async function getExemplarDetail(
  publishedPlanId: string
): Promise<PublicPlanBundle | null> {
  if (DEV_MOCK) return mock.mockGetExemplarDetail(publishedPlanId);

  const supabase = await createClient();
  const [{ data: plan }, { data: fields }, { data: stages }] = await Promise.all([
    supabase
      .from("published_plans")
      .select("id, snapshot_name")
      .eq("id", publishedPlanId)
      .eq("is_exemplar", true)
      .eq("status", "approved")
      .maybeSingle(),
    supabase
      .from("published_plan_fields")
      .select("stage, field_key, content")
      .eq("published_plan_id", publishedPlanId),
    supabase.from("stages").select("key, label, sort_order").order("sort_order"),
  ]);
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.snapshot_name,
    background: EMPTY_DOC,
    tags: [],
    stages: (stages ?? []).map((s) => ({
      key: s.key,
      label: s.label,
      sort_order: s.sort_order,
      fields: [],
      responses: Object.fromEntries(
        (fields ?? [])
          .filter((f) => f.stage === s.key)
          .map((f) => [f.field_key, f.content as JSONContent])
      ),
    })),
  };
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
  stage: CcpsStage | null,
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

export async function deletePlanRecord(planId: string) {
  if (DEV_MOCK) {
    mock.mockDeletePlan(planId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) throw new Error(error.message);
}

export async function deletePlanRecords(planIds: string[]) {
  if (DEV_MOCK) {
    for (const id of planIds) mock.mockDeletePlan(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().in("id", planIds);
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
  // plan_tags has no columns beyond its (plan_id, tag) primary key, so
  // there's nothing to update on conflict — ignoreDuplicates compiles to
  // `on conflict do nothing`, which only needs INSERT privilege (matching
  // the table's actual grant) instead of the UPDATE privilege a default
  // upsert would require for no benefit.
  const { error } = await supabase
    .from("plan_tags")
    .upsert(
      { plan_id: planId, tag },
      { onConflict: "plan_id,tag", ignoreDuplicates: true }
    );
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

  const stages = await listStages();
  const stageResponsesByStage = await Promise.all(
    stages.map((s) => getStageResponses(planId, s.key))
  );
  const checklistState = await getChecklistState(planId);

  if (DEV_MOCK) {
    return mock.mockPublishPlan(
      planId,
      orgId,
      userId,
      plan.name,
      plan.current_stage,
      stages.map((s, i) => ({ stage: s.key, fields: stageResponsesByStage[i] })),
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

  const fieldRows = stages.flatMap((s, i) =>
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
      "id, snapshot_name, snapshot_current_stage, status, created_at, review_note, is_exemplar, organisations(name)"
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
    isExemplar: r.is_exemplar,
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

export async function setPublishedPlanExemplarRecord(
  id: string,
  isExemplar: boolean
) {
  if (DEV_MOCK) {
    mock.mockSetPublishedPlanExemplar(id, isExemplar);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("published_plans")
    .update({ is_exemplar: isExemplar })
    .eq("id", id);
  if (error) throw new Error(error.message);
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

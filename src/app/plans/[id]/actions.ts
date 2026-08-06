"use server";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/react";
import { STAGES, MEASURES_FIELD_KEY } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { MeasureRow, StageBundle } from "@/lib/ccps/types";
import {
  saveStageResponseRecord,
  toggleChecklistItemRecord,
  addFeedbackRecord,
  toggleFeedbackResolvedRecord,
  renamePlanRecord,
  saveBackgroundRecord,
  addPlanTagRecord,
  removePlanTagRecord,
  getCurrentUserId,
  getCurrentOrg,
  publishPlanRecord,
  getStageFields,
  getStageResponses,
  getChecklistItems,
  getChecklistState,
  getExemplars,
} from "@/lib/db";

// Granular per-field saves don't revalidate the page — the client already
// reflects the change (either the editor keeps its own content, as with
// Tiptap, or the component updates its own local state optimistically), so
// re-fetching the whole page on every keystroke-blur/checkbox-click would
// just be wasted round trips. See getStageBundle below for how a given
// stage's data is (re)loaded when it's actually needed.

export async function saveStageResponse(
  planId: string,
  stage: CcpsStage,
  fieldKey: string,
  content: JSONContent
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(planId, stage, fieldKey, content, userId);
}

export async function toggleChecklistItem(
  planId: string,
  itemKey: string,
  checked: boolean
) {
  await toggleChecklistItemRecord(planId, itemKey, checked);
}

export async function addFeedback(
  planId: string,
  stage: CcpsStage,
  body: string
) {
  const trimmed = body.trim();
  if (!trimmed) return;

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated.");

  await addFeedbackRecord(planId, stage, trimmed, userId);
  revalidatePath(`/plans/${planId}`);
}

export async function toggleFeedbackResolved(
  planId: string,
  feedbackId: string,
  resolved: boolean
) {
  const userId = await getCurrentUserId();
  await toggleFeedbackResolvedRecord(feedbackId, resolved, userId);
}

export async function renamePlan(planId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  await renamePlanRecord(planId, trimmed);
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
}

export async function saveBackground(planId: string, content: JSONContent) {
  await saveBackgroundRecord(planId, content);
}

export async function addPlanTag(planId: string, tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return;

  await addPlanTagRecord(planId, trimmed);
}

export async function removePlanTag(planId: string, tag: string) {
  await removePlanTagRecord(planId, tag);
}

export async function saveMeasureRows(planId: string, rows: MeasureRow[]) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "PI",
    MEASURES_FIELD_KEY,
    rows as unknown as JSONContent,
    userId
  );
}

export async function publishPlan(planId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated.");

  const { orgId } = await getCurrentOrg();
  await publishPlanRecord(planId, orgId, userId);
  revalidatePath(`/plans/${planId}`);
}

// Bundles everything a single stage tab needs into one call, so switching to
// a stage that hasn't been loaded yet costs one round trip instead of
// fetching all 5 stages' worth of data up front (see plan-workspace.tsx).
export async function getStageBundle(
  planId: string,
  stage: CcpsStage
): Promise<StageBundle> {
  if (!STAGES.some((s) => s.key === stage)) {
    throw new Error(`Unknown stage: ${stage}`);
  }

  const [fields, responses, checklistItems, checklistState, exemplars] =
    await Promise.all([
      getStageFields(stage),
      getStageResponses(planId, stage),
      getChecklistItems(planId, stage),
      getChecklistState(planId),
      getExemplars(stage),
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

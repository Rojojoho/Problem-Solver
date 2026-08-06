"use server";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/react";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { MeasureRow } from "@/lib/ccps/types";
import { MEASURES_FIELD_KEY } from "@/lib/ccps/constants";
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
} from "@/lib/db";

export async function saveStageResponse(
  planId: string,
  stage: CcpsStage,
  fieldKey: string,
  content: JSONContent
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(planId, stage, fieldKey, content, userId);
  revalidatePath(`/plans/${planId}`);
}

export async function toggleChecklistItem(
  planId: string,
  itemKey: string,
  checked: boolean
) {
  await toggleChecklistItemRecord(planId, itemKey, checked);
  revalidatePath(`/plans/${planId}`);
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
  revalidatePath(`/plans/${planId}`);
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
  revalidatePath(`/plans/${planId}`);
}

export async function addPlanTag(planId: string, tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return;

  await addPlanTagRecord(planId, trimmed);
  revalidatePath(`/plans/${planId}`);
}

export async function removePlanTag(planId: string, tag: string) {
  await removePlanTagRecord(planId, tag);
  revalidatePath(`/plans/${planId}`);
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
  revalidatePath(`/plans/${planId}`);
}

export async function publishPlan(planId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated.");

  const { orgId } = await getCurrentOrg();
  await publishPlanRecord(planId, orgId, userId);
  revalidatePath(`/plans/${planId}`);
}

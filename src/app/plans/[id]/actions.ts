"use server";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/react";
import {
  asRowArray,
  MEASURES_FIELD_KEY,
  CAUSAL_HYPOTHESES_FIELD_KEY,
  CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY,
  CONSOLIDATED_HYPOTHESES_FIELD_KEY,
  SOLUTION_REQUIREMENTS_FIELD_KEY,
  SOLUTION_STRATEGIES_FIELD_KEY,
  IMPLEMENTATION_MONITORING_FIELD_KEY,
} from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ConsolidatedHypothesisRow,
  HypothesisRow,
  ImplementationRow,
  MeasureRow,
  SolutionRequirementRow,
  SolutionStrategyRow,
  StageBundle,
} from "@/lib/ccps/types";
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
  listValidationOptions,
  listRequirementTypes,
  listMoscowOptions,
  listSolutionStrategyStatuses,
} from "@/lib/db";

// Stage 4's table mirrors Stage 3B's solution strategies live — shared by
// getStageBundle (below) and plans/[id]/page.tsx's initial-load equivalent.
export async function getStrategyRows(
  planId: string
): Promise<SolutionStrategyRow[]> {
  const ssResponses = await getStageResponses(planId, "SS");
  return asRowArray<SolutionStrategyRow>(
    ssResponses[SOLUTION_STRATEGIES_FIELD_KEY]
  );
}

// Stage 3A's Link column offers the plan's confirmed 2.3 causes and 1.2
// measures as one-click suggestions — shared by getStageBundle (below) and
// plans/[id]/page.tsx's initial-load equivalent.
export async function getSolutionRequirementSuggestions(planId: string) {
  const [cvResponses, piResponses] = await Promise.all([
    getStageResponses(planId, "CV"),
    getStageResponses(planId, "PI"),
  ]);

  const causeRows =
    (cvResponses[CONSOLIDATED_HYPOTHESES_FIELD_KEY] as unknown as
      | ConsolidatedHypothesisRow[]
      | undefined) ?? [];
  const measureRows =
    (piResponses[MEASURES_FIELD_KEY] as unknown as MeasureRow[] | undefined) ??
    [];

  return {
    causeSuggestions: causeRows
      .filter((row) => row.confirmed === true)
      .map((row) => row.hypothesis)
      .filter(Boolean),
    measureSuggestions: measureRows.map((row) => row.measure).filter(Boolean),
  };
}

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

export async function saveCausalHypothesisRows(
  planId: string,
  rows: HypothesisRow[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "PC",
    CAUSAL_HYPOTHESES_FIELD_KEY,
    rows as unknown as JSONContent,
    userId
  );
}

export async function saveCausalHypothesisCategories(
  planId: string,
  categories: string[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "PC",
    CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY,
    categories as unknown as JSONContent,
    userId
  );
}

// One-off copy from 2A into 2B: groups the causal hypotheses that aren't
// Parked by tag, writing one 2B row per tag (hypothesis = tag name,
// description = the grouped causes). Not a live link — overwrites whatever
// is currently in 2B, same as re-running it later would.
export async function consolidateCausalHypotheses(
  planId: string
): Promise<ConsolidatedHypothesisRow[]> {
  const pcResponses = await getStageResponses(planId, "PC");
  const causalRows = asRowArray<HypothesisRow>(
    pcResponses[CAUSAL_HYPOTHESES_FIELD_KEY]
  );
  const categoryOrder = asRowArray<string>(
    pcResponses[CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY]
  );

  const grouped = new Map<string, string[]>();
  for (const row of causalRows) {
    if (row.validation === "Parked" || !row.text.trim()) continue;
    const tags = row.categories.length ? row.categories : ["Untagged"];
    for (const tag of tags) {
      if (!grouped.has(tag)) grouped.set(tag, []);
      grouped.get(tag)!.push(row.text);
    }
  }

  const orderedTags = [
    ...categoryOrder.filter((tag) => grouped.has(tag)),
    ...Array.from(grouped.keys()).filter((tag) => !categoryOrder.includes(tag)),
  ];

  const consolidatedRows: ConsolidatedHypothesisRow[] = orderedTags.map((tag) => ({
    id: crypto.randomUUID(),
    hypothesis: tag,
    description: (grouped.get(tag) ?? []).join("\n"),
    validityTest: "",
    confirmed: null,
    notes: "",
  }));

  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "CV",
    CONSOLIDATED_HYPOTHESES_FIELD_KEY,
    consolidatedRows as unknown as JSONContent,
    userId
  );

  return consolidatedRows;
}

export async function saveConsolidatedHypothesisRows(
  planId: string,
  rows: ConsolidatedHypothesisRow[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "CV",
    CONSOLIDATED_HYPOTHESES_FIELD_KEY,
    rows as unknown as JSONContent,
    userId
  );
}

export async function saveSolutionRequirementRows(
  planId: string,
  rows: SolutionRequirementRow[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "SR",
    SOLUTION_REQUIREMENTS_FIELD_KEY,
    rows as unknown as JSONContent,
    userId
  );
}

export async function saveSolutionStrategyRows(
  planId: string,
  rows: SolutionStrategyRow[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "SS",
    SOLUTION_STRATEGIES_FIELD_KEY,
    rows as unknown as JSONContent,
    userId
  );
}

export async function saveImplementationRows(
  planId: string,
  rows: ImplementationRow[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "IM",
    IMPLEMENTATION_MONITORING_FIELD_KEY,
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
//
// `stage` is trusted rather than re-validated against `listStages()` here —
// that would be a whole extra sequential round trip on every single stage
// switch (blocking the Promise.all below from even starting) to guard
// against a value that can only ever come from a tab the UI already
// rendered from that same stages list.
export async function getStageBundle(
  planId: string,
  stage: CcpsStage
): Promise<StageBundle> {
  // Checklist/checklist-state/exemplars are only ever displayed once we know
  // the stage actually has fields (an empty-fields stage renders "Coming
  // soon" and its side panel shows "Not available") — chaining them off the
  // (fast) fields query lets a blank stage skip 3 queries entirely, while
  // every independent query below still starts immediately in parallel.
  const fieldsPromise = getStageFields(stage);

  const [
    fields,
    responses,
    checklistItems,
    checklistState,
    exemplars,
    validationOptions,
    requirementTypes,
    moscowOptions,
    suggestions,
    strategyStatuses,
    strategyRows,
  ] = await Promise.all([
    fieldsPromise,
    getStageResponses(planId, stage),
    fieldsPromise.then((f) => (f.length ? getChecklistItems(planId, stage) : [])),
    fieldsPromise.then((f) =>
      f.length ? getChecklistState(planId) : Promise.resolve({} as Record<string, boolean>)
    ),
    fieldsPromise.then((f) => (f.length ? getExemplars(stage) : [])),
    stage === "PC" ? listValidationOptions() : Promise.resolve([]),
    stage === "SR" ? listRequirementTypes() : Promise.resolve([]),
    stage === "SR" ? listMoscowOptions() : Promise.resolve([]),
    stage === "SR"
      ? getSolutionRequirementSuggestions(planId)
      : Promise.resolve({ causeSuggestions: [], measureSuggestions: [] }),
    stage === "SS" ? listSolutionStrategyStatuses() : Promise.resolve([]),
    stage === "IM" ? getStrategyRows(planId) : Promise.resolve([]),
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
    validationOptions,
    requirementTypes,
    moscowOptions,
    causeSuggestions: suggestions.causeSuggestions,
    measureSuggestions: suggestions.measureSuggestions,
    strategyStatuses,
    strategyRows,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/react";
import {
  asRowArray,
  EMPTY_DOC,
  MEASURES_FIELD_KEY,
  CAUSAL_HYPOTHESES_FIELD_KEY,
  CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY,
  CONSOLIDATED_HYPOTHESES_FIELD_KEY,
  SOLUTION_REQUIREMENTS_FIELD_KEY,
  SOLUTION_STRATEGIES_FIELD_KEY,
  IMPLEMENTATION_MONITORING_FIELD_KEY,
  IMPLEMENTATION_ROW_ORDER_FIELD_KEY,
  IMPACT_MEASURES_FIELD_KEY,
  IMPACT_OUTCOME_GROUPS_FIELD_KEY,
} from "@/lib/ccps/constants";
import { docToParagraphs } from "@/lib/ccps/doc-to-text";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ConsolidatedHypothesisRow,
  HypothesisRow,
  ImplementationRow,
  ImpactMeasureRow,
  MeasureRow,
  OutcomeGroup,
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
  listImpactMeasureTypes,
  getPlan,
  getPlanTags,
  listStages,
} from "@/lib/db";

export interface PlanExport {
  version: 1;
  name: string;
  background: JSONContent;
  tags: string[];
  // stage key -> field_key -> content
  responses: Record<string, Record<string, JSONContent>>;
}

// A quick way to move a plan between two separate environments (e.g. a
// local dev Supabase project and the one Vercel deploys against) that
// don't share a database — download here, upload there via importPlan
// in plans/actions.ts. Not a full backup: feedback comments, checklist
// progress, and publish history are intentionally left out since this is
// meant for moving working content around, not archiving everything.
export async function exportPlan(planId: string): Promise<PlanExport> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error("Plan not found.");

  const [stages, tags] = await Promise.all([listStages(), getPlanTags(planId)]);

  const responses: Record<string, Record<string, JSONContent>> = {};
  await Promise.all(
    stages.map(async (stage) => {
      const stageResponses = await getStageResponses(
        planId,
        stage.key as CcpsStage
      );
      if (Object.keys(stageResponses).length) {
        responses[stage.key] = stageResponses;
      }
    })
  );

  return {
    version: 1,
    name: plan.name,
    background: plan.background ?? EMPTY_DOC,
    tags,
    responses,
  };
}

export interface PlanSummaryField {
  fieldKey: string;
  internalId: string;
  label: string;
  content: JSONContent;
}

export interface PlanSummaryStrategy {
  strategy: string;
  description: string;
}

export interface PlanSummaryData {
  fields: PlanSummaryField[];
  requirements: string[];
  strategies: PlanSummaryStrategy[];
}

// Fixed set of fields the Summary tab surfaces, independent of whichever
// stage tabs the user has actually visited this session.
const SUMMARY_FIELD_KEYS = [
  "pi_problem_description", // 1.1
  "pi_educational_argument", // 1.3
  "cv_validated_causal_story", // 2.4
] as const;

// Read-only rollup of a plan's key content — pulled fresh every time the
// Summary tab is opened (same live-fetch reasoning as the cross-stage
// suggestion pickers elsewhere in this file: a cached snapshot would go
// stale the moment 1/2B/3A/3B are edited after Summary was last visited).
export async function getPlanSummary(planId: string): Promise<PlanSummaryData> {
  const [piFields, cvFields, piResponses, cvResponses, srResponses, ssResponses] =
    await Promise.all([
      getStageFields("PI"),
      getStageFields("CV"),
      getStageResponses(planId, "PI"),
      getStageResponses(planId, "CV"),
      getStageResponses(planId, "SR"),
      getStageResponses(planId, "SS"),
    ]);

  const fieldMeta = [...piFields, ...cvFields];
  const responses: Record<string, JSONContent> = { ...piResponses, ...cvResponses };

  const fields = SUMMARY_FIELD_KEYS.map((fieldKey) => {
    const meta = fieldMeta.find((f) => f.field_key === fieldKey);
    return {
      fieldKey,
      internalId: meta?.internal_id ?? "",
      label: meta?.full_prompt ?? fieldKey,
      content: responses[fieldKey] ?? EMPTY_DOC,
    };
  });

  const requirements = asRowArray<SolutionRequirementRow>(
    srResponses[SOLUTION_REQUIREMENTS_FIELD_KEY]
  )
    .map((r) => r.requirement)
    .filter(Boolean);

  const strategies = asRowArray<SolutionStrategyRow>(
    ssResponses[SOLUTION_STRATEGIES_FIELD_KEY]
  )
    .filter((r) => r.strategy)
    .map((r) => ({ strategy: r.strategy, description: r.description }));

  return { fields, requirements, strategies };
}

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

// Stage 3A's Link column offers the plan's confirmed 2.3 causes (as live
// ref picks — id + current label) and 1.2 measures (as plain-text
// suggestions only, since MeasureRow has no stable id to reference) —
// shared by getStageBundle (below) and plans/[id]/page.tsx's initial-load
// equivalent.
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
    causeOptions: causeRows
      .filter((row) => row.confirmed === true && row.hypothesis)
      .map((row) => ({ id: row.id, label: row.hypothesis })),
    measureSuggestions: measureRows.map((row) => row.measure).filter(Boolean),
  };
}

// Stage 3B's Link column offers 3A's current requirements as live ref
// picks (id + current shortId) — fetched live (not through the cached
// stage bundle) every time that picker opens, same reasoning as
// getSolutionRequirementSuggestions above: a cached snapshot goes stale
// the moment 3A is edited after 3B was visited.
export async function getSolutionRequirementOptions(
  planId: string
): Promise<{ id: string; label: string }[]> {
  const srResponses = await getStageResponses(planId, "SR");
  const rows = asRowArray<SolutionRequirementRow>(
    srResponses[SOLUTION_REQUIREMENTS_FIELD_KEY]
  );
  return rows
    .filter((row) => row.shortId)
    .map((row) => ({ id: row.id, label: row.shortId }));
}

export interface TraceCauseNode {
  id: string; // ConsolidatedHypothesisRow.id for causes; measure name for measures; synthetic for dangling — lets the diagram dedupe a cause shared by multiple requirements into one box
  kind: "cause" | "measure" | "dangling" | "text";
  label: string;
  detail?: string;
}

export interface TraceRequirement {
  id: string;
  shortId: string;
  requirement: string;
  dangling?: boolean;
  causes: TraceCauseNode[];
}

export interface StrategyTraceability {
  strategy: { name: string; description: string } | null;
  problemStatement: string[];
  requirements: TraceRequirement[];
}

// Powers the 3.2 "trace" popup: walks a strategy's links down to the
// requirements it's linked to, and each of those requirements' own links
// down to validated causes (2.3) or 1.2 measures — fetched fresh every
// time (same live-refetch reasoning as the pickers above, since this
// crosses the same stages they do). The 2.3 -> 2A / 1.1 connection isn't
// stored anywhere (consolidateCausalHypotheses does a one-time textual
// copy, not a live link), so the 1.1 problem statement is surfaced here
// as fixed context rather than a traced edge, and 2A is skipped entirely.
export async function getSolutionStrategyTraceability(
  planId: string,
  strategyId: string
): Promise<StrategyTraceability> {
  const [piResponses, cvResponses, srResponses, ssResponses] = await Promise.all([
    getStageResponses(planId, "PI"),
    getStageResponses(planId, "CV"),
    getStageResponses(planId, "SR"),
    getStageResponses(planId, "SS"),
  ]);

  const measureRows = asRowArray<MeasureRow>(piResponses[MEASURES_FIELD_KEY]);
  const causeRows = asRowArray<ConsolidatedHypothesisRow>(
    cvResponses[CONSOLIDATED_HYPOTHESES_FIELD_KEY]
  );
  const requirementRows = asRowArray<SolutionRequirementRow>(
    srResponses[SOLUTION_REQUIREMENTS_FIELD_KEY]
  );
  const strategyRows = asRowArray<SolutionStrategyRow>(
    ssResponses[SOLUTION_STRATEGIES_FIELD_KEY]
  );

  const causeById = new Map(causeRows.map((c) => [c.id, c]));
  const measureByName = new Map(measureRows.map((m) => [m.measure, m]));
  const causeByHypothesis = new Map(causeRows.map((c) => [c.hypothesis, c]));
  const requirementById = new Map(requirementRows.map((r) => [r.id, r]));

  const strategyRow = strategyRows.find((s) => s.id === strategyId) ?? null;

  const requirements: TraceRequirement[] = (strategyRow?.links ?? []).map((link) => {
    const requirement = link.type === "ref" ? requirementById.get(link.targetId) : undefined;
    if (!requirement) {
      const label = link.type === "text" ? link.value : "Deleted requirement";
      return { id: link.type === "ref" ? link.targetId : label, shortId: label, requirement: "", dangling: true, causes: [] };
    }

    const causes: TraceCauseNode[] = requirement.links.map((l): TraceCauseNode => {
      if (l.type === "ref") {
        const cause = causeById.get(l.targetId);
        return cause
          ? { id: cause.id, kind: "cause", label: cause.hypothesis, detail: cause.description || undefined }
          : { id: `dangling:${l.targetId}`, kind: "dangling", label: "Deleted item" };
      }
      // Text links are usually 1.2 measures (the only thing the Link
      // column ever creates a text link for) — but a user can also type a
      // cause's exact wording as free text instead of picking it from the
      // suggestions, so check for that match too before assuming "measure".
      const measure = measureByName.get(l.value);
      if (measure) {
        return {
          id: `measure:${l.value}`,
          kind: "measure",
          label: l.value,
          detail: measure.baseline || measure.target
            ? `${measure.baseline || "—"} → ${measure.target || "—"}`
            : undefined,
        };
      }
      const matchedCause = causeByHypothesis.get(l.value);
      if (matchedCause) {
        return {
          id: matchedCause.id,
          kind: "cause",
          label: matchedCause.hypothesis,
          detail: matchedCause.description || undefined,
        };
      }
      return { id: `text:${l.value}`, kind: "text", label: l.value };
    });

    return {
      id: requirement.id,
      shortId: requirement.shortId,
      requirement: requirement.requirement,
      causes,
    };
  });

  const problemStatement = docToParagraphs(piResponses["pi_problem_description"]);

  return {
    strategy: strategyRow
      ? { name: strategyRow.strategy || "Untitled strategy", description: strategyRow.description }
      : null,
    problemStatement,
    requirements,
  };
}

// Stage 5's "Import measures from Stage 1" button calls this directly from
// the client (not through the cached stage bundle) so it always reflects
// Stage 1's current measures, same live-fetch-on-demand reasoning as Stage
// 4's "Refresh strategies" (getStrategyRows above).
export async function getSourceMeasureRows(planId: string): Promise<MeasureRow[]> {
  const piResponses = await getStageResponses(planId, "PI");
  return asRowArray<MeasureRow>(piResponses[MEASURES_FIELD_KEY]);
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
  stage: CcpsStage | null,
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

export async function saveImplementationRowOrder(
  planId: string,
  order: string[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "IM",
    IMPLEMENTATION_ROW_ORDER_FIELD_KEY,
    order as unknown as JSONContent,
    userId
  );
}

export async function saveImpactMeasureRows(
  planId: string,
  rows: ImpactMeasureRow[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "EI",
    IMPACT_MEASURES_FIELD_KEY,
    rows as unknown as JSONContent,
    userId
  );
}

export async function saveImpactOutcomeGroups(
  planId: string,
  groups: OutcomeGroup[]
) {
  const userId = await getCurrentUserId();
  await saveStageResponseRecord(
    planId,
    "EI",
    IMPACT_OUTCOME_GROUPS_FIELD_KEY,
    groups as unknown as JSONContent,
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
    suggestions,
    requirementOptions,
    strategyRows,
    impactMeasureTypes,
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
    stage === "SR"
      ? getSolutionRequirementSuggestions(planId)
      : Promise.resolve({ causeOptions: [], measureSuggestions: [] }),
    stage === "SS" ? getSolutionRequirementOptions(planId) : Promise.resolve([]),
    stage === "IM" ? getStrategyRows(planId) : Promise.resolve([]),
    stage === "EI" ? listImpactMeasureTypes() : Promise.resolve([]),
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
    causeOptions: suggestions.causeOptions,
    measureSuggestions: suggestions.measureSuggestions,
    requirementOptions,
    strategyRows,
    impactMeasureTypes,
  };
}

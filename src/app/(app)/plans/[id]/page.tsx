import { notFound } from "next/navigation";
import {
  getPlan,
  getStageResponses,
  getStageFields,
  getChecklistItems,
  getChecklistState,
  getExemplars,
  getFeedback,
  getLatestPublishedPlanForSource,
  listKbArticles,
  getPlanTags,
  listValidationOptions,
  listRequirementTypes,
  listImpactMeasureTypes,
  listStages,
  getWorkspaceTabPositions,
  getDiagramHeadings,
} from "@/lib/db";
import { EMPTY_DOC } from "@/lib/ccps/constants";
import type { StageBundle } from "@/lib/ccps/types";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import { makeTimer } from "@/lib/timing";
import {
  getSolutionRequirementSuggestions,
  getSolutionRequirementOptions,
  getStrategyRows,
} from "@/app/(app)/plans/[id]/actions";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { timed, timings } = makeTimer();

  const plan = await timed("getPlan", getPlan(id));
  if (!plan) {
    notFound();
  }

  const stage = plan.current_stage;

  // Checklist/checklist-state/exemplars are only ever displayed once we know
  // the stage actually has fields — chaining them off the (fast) fields
  // query lets a blank stage skip 3 queries entirely, while every
  // independent query below still starts immediately in parallel.
  const fieldsPromise = timed("fields", getStageFields(stage));

  const [
    fields,
    responses,
    checklistItems,
    exemplars,
    checklistState,
    feedback,
    latestPublished,
    kbArticles,
    tags,
    validationOptions,
    requirementTypes,
    suggestions,
    requirementOptions,
    strategyRows,
    impactMeasureTypes,
    stages,
    tabPositions,
    headings,
  ] = await timed(
    "PlanPage TOTAL",
    Promise.all([
      fieldsPromise,
      timed("responses", getStageResponses(id, stage)),
      timed("checklistItems", fieldsPromise.then((f) => (f.length ? getChecklistItems(id, stage) : []))),
      timed("exemplars", fieldsPromise.then((f) => (f.length ? getExemplars(stage) : []))),
      timed(
        "checklistState",
        fieldsPromise.then((f) =>
          f.length ? getChecklistState(id) : Promise.resolve({} as Record<string, boolean>)
        )
      ),
      timed("feedback", getFeedback(id)),
      timed("latestPublished", getLatestPublishedPlanForSource(id)),
      timed("kbArticles", listKbArticles(true)),
      timed("tags", getPlanTags(id)),
      timed("validationOptions", stage === "PC" ? listValidationOptions() : Promise.resolve([])),
      timed("requirementTypes", stage === "SR" ? listRequirementTypes() : Promise.resolve([])),
      timed(
        "suggestions",
        stage === "SR"
          ? getSolutionRequirementSuggestions(id)
          : Promise.resolve({ causeOptions: [], measureSuggestions: [] })
      ),
      timed("requirementOptions", stage === "SS" ? getSolutionRequirementOptions(id) : Promise.resolve([])),
      timed("strategyRows", stage === "IM" ? getStrategyRows(id) : Promise.resolve([])),
      timed("impactMeasureTypes", stage === "EI" ? listImpactMeasureTypes() : Promise.resolve([])),
      timed("stages", listStages()),
      timed("tabPositions", getWorkspaceTabPositions()),
      timed("headings", getDiagramHeadings()),
    ])
  );

  const initialBundle: StageBundle = {
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

  return (
    <PlanWorkspace
      planName={plan.name}
      planId={plan.id}
      stages={stages}
      initialStage={stage}
      initialBundle={initialBundle}
      background={plan.background ?? EMPTY_DOC}
      tags={tags}
      feedback={feedback}
      publishStatus={latestPublished?.status ?? null}
      kbArticles={kbArticles}
      shareEnabled={plan.share_enabled}
      shareToken={plan.share_token}
      tabPositions={tabPositions}
      headings={headings}
      initialLoadTimings={timings}
    />
  );
}

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
} from "@/lib/db";
import { EMPTY_DOC } from "@/lib/ccps/constants";
import type { StageBundle } from "@/lib/ccps/types";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import {
  getSolutionRequirementSuggestions,
  getSolutionRequirementOptions,
  getStrategyRows,
} from "@/app/plans/[id]/actions";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const plan = await getPlan(id);
  if (!plan) {
    notFound();
  }

  const stage = plan.current_stage;

  // Checklist/checklist-state/exemplars are only ever displayed once we know
  // the stage actually has fields — chaining them off the (fast) fields
  // query lets a blank stage skip 3 queries entirely, while every
  // independent query below still starts immediately in parallel.
  const fieldsPromise = getStageFields(stage);

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
  ] = await Promise.all([
    fieldsPromise,
    getStageResponses(id, stage),
    fieldsPromise.then((f) => (f.length ? getChecklistItems(id, stage) : [])),
    fieldsPromise.then((f) => (f.length ? getExemplars(stage) : [])),
    fieldsPromise.then((f) =>
      f.length ? getChecklistState(id) : Promise.resolve({} as Record<string, boolean>)
    ),
    getFeedback(id),
    getLatestPublishedPlanForSource(id),
    listKbArticles(true),
    getPlanTags(id),
    stage === "PC" ? listValidationOptions() : Promise.resolve([]),
    stage === "SR" ? listRequirementTypes() : Promise.resolve([]),
    stage === "SR"
      ? getSolutionRequirementSuggestions(id)
      : Promise.resolve({ causeOptions: [], measureSuggestions: [] }),
    stage === "SS" ? getSolutionRequirementOptions(id) : Promise.resolve([]),
    stage === "IM" ? getStrategyRows(id) : Promise.resolve([]),
    stage === "EI" ? listImpactMeasureTypes() : Promise.resolve([]),
    listStages(),
  ]);

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
    />
  );
}

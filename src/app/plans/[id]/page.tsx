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
  listMoscowOptions,
  listStages,
} from "@/lib/db";
import { EMPTY_DOC } from "@/lib/ccps/constants";
import type { StageBundle } from "@/lib/ccps/types";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import { getSolutionRequirementSuggestions } from "@/app/plans/[id]/actions";

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
    moscowOptions,
    suggestions,
    stages,
  ] = await Promise.all([
    getStageFields(stage),
    getStageResponses(id, stage),
    getChecklistItems(id, stage),
    getExemplars(stage),
    getChecklistState(id),
    getFeedback(id),
    getLatestPublishedPlanForSource(id),
    listKbArticles(true),
    getPlanTags(id),
    stage === "PC" ? listValidationOptions() : Promise.resolve([]),
    stage === "SR" ? listRequirementTypes() : Promise.resolve([]),
    stage === "SR" ? listMoscowOptions() : Promise.resolve([]),
    stage === "SR"
      ? getSolutionRequirementSuggestions(id)
      : Promise.resolve({ causeSuggestions: [], measureSuggestions: [] }),
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
    moscowOptions,
    causeSuggestions: suggestions.causeSuggestions,
    measureSuggestions: suggestions.measureSuggestions,
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

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
  listStages,
} from "@/lib/db";
import { EMPTY_DOC } from "@/lib/ccps/constants";
import type { StageBundle } from "@/lib/ccps/types";
import { PlanWorkspace } from "@/components/plan/plan-workspace";

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

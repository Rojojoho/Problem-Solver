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
} from "@/lib/db";
import { EMPTY_DOC, STAGES } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { ChecklistItemData } from "@/lib/ccps/types";
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

  const [
    fieldsPerStage,
    responsesPerStage,
    checklistItemsPerStage,
    exemplarsPerStage,
    checklistState,
    feedback,
    latestPublished,
    kbArticles,
    tags,
  ] = await Promise.all([
    Promise.all(STAGES.map((s) => getStageFields(id, s.key))),
    Promise.all(STAGES.map((s) => getStageResponses(id, s.key))),
    Promise.all(STAGES.map((s) => getChecklistItems(id, s.key))),
    Promise.all(STAGES.map((s) => getExemplars(s.key))),
    getChecklistState(id),
    getFeedback(id),
    getLatestPublishedPlanForSource(id),
    listKbArticles(true),
    getPlanTags(id),
  ]);

  const fieldsByStage = Object.fromEntries(
    STAGES.map((s, i) => [s.key, fieldsPerStage[i]])
  ) as Record<CcpsStage, (typeof fieldsPerStage)[number]>;

  const responsesByStage = Object.fromEntries(
    STAGES.map((s, i) => [s.key, responsesPerStage[i]])
  ) as Record<CcpsStage, (typeof responsesPerStage)[number]>;

  const checklistByStage = Object.fromEntries(
    STAGES.map((s, i) => [
      s.key,
      checklistItemsPerStage[i].map(
        (item): ChecklistItemData => ({
          item_key: item.item_key,
          label: item.label,
          checked: checklistState[item.item_key] ?? false,
        })
      ),
    ])
  ) as Record<CcpsStage, ChecklistItemData[]>;

  const exemplarsByStage = Object.fromEntries(
    STAGES.map((s, i) => [s.key, exemplarsPerStage[i]])
  ) as Record<CcpsStage, (typeof exemplarsPerStage)[number]>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{plan.name}</h1>
      </div>
      <PlanWorkspace
        planId={plan.id}
        initialStage={plan.current_stage}
        background={plan.background ?? EMPTY_DOC}
        tags={tags}
        fieldsByStage={fieldsByStage}
        responsesByStage={responsesByStage}
        checklistByStage={checklistByStage}
        exemplarsByStage={exemplarsByStage}
        feedback={feedback}
        publishStatus={latestPublished?.status ?? null}
        kbArticles={kbArticles}
      />
    </div>
  );
}

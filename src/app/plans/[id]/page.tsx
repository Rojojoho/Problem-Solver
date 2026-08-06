import { notFound } from "next/navigation";
import {
  getPlan,
  getStageResponses,
  getChecklistItems,
  getChecklistState,
  getExemplars,
  getFeedback,
  getLatestPublishedPlanForSource,
  listKbArticles,
  getPlanTags,
} from "@/lib/db";
import { EMPTY_DOC } from "@/lib/ccps/constants";
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
    piResponses,
    checklistItems,
    checklistState,
    exemplars,
    feedback,
    latestPublished,
    kbArticles,
    tags,
  ] = await Promise.all([
    getStageResponses(id, "PI"),
    getChecklistItems(id, "PI"),
    getChecklistState(id),
    getExemplars("PI"),
    getFeedback(id),
    getLatestPublishedPlanForSource(id),
    listKbArticles(true),
    getPlanTags(id),
  ]);

  const checklist = checklistItems.map((item) => ({
    item_key: item.item_key,
    label: item.label,
    checked: checklistState[item.item_key] ?? false,
  }));

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
        piResponses={piResponses}
        checklist={checklist}
        exemplars={exemplars}
        feedback={feedback}
        publishStatus={latestPublished?.status ?? null}
        kbArticles={kbArticles}
      />
    </div>
  );
}

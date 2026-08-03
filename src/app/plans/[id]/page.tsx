import { notFound } from "next/navigation";
import {
  getPlan,
  getStageResponses,
  getChecklistItems,
  getChecklistState,
  getExemplars,
  getFeedback,
} from "@/lib/db";
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

  const [piResponses, checklistItems, checklistState, exemplars, feedback] =
    await Promise.all([
      getStageResponses(id, "PI"),
      getChecklistItems("PI"),
      getChecklistState(id),
      getExemplars("PI"),
      getFeedback(id),
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
        piResponses={piResponses}
        checklist={checklist}
        exemplars={exemplars}
        feedback={feedback}
      />
    </div>
  );
}

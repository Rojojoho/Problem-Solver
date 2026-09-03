import { NewPlanDialog } from "@/components/plan/new-plan-dialog";
import { ImportPlanDialog } from "@/components/plan/import-plan-dialog";
import { PlansView } from "@/components/plan/plans-view";
import { getCurrentOrg } from "@/lib/org";
import { listPlans, listStages } from "@/lib/db";
import { stageLabelMap } from "@/lib/ccps/constants";

export default async function PlansPage() {
  const { orgId, orgName } = await getCurrentOrg();
  const [plans, stages] = await Promise.all([listPlans(orgId), listStages()]);
  const stageLabels = stageLabelMap(stages);
  const stageOrder = stages.map((s) => s.key);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">{orgName}</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportPlanDialog />
          <NewPlanDialog />
        </div>
      </div>

      <PlansView plans={plans} stageLabels={stageLabels} stageOrder={stageOrder} />
    </div>
  );
}

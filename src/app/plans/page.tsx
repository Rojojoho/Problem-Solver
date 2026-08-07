import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewPlanDialog } from "@/components/plan/new-plan-dialog";
import { DeletePlanButton } from "@/components/plan/delete-plan-button";
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
        <NewPlanDialog />
      </div>

      {!plans.length ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No plans yet</CardTitle>
            <CardDescription>
              Create your first problem-solving plan to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="relative h-full">
              <Link href={`/plans/${plan.id}`}>
                <Card
                  className="h-full border-l-4 transition-colors hover:border-foreground/30"
                  style={{
                    borderLeftColor: `var(--chart-${(stageOrder.indexOf(plan.current_stage) % 5) + 1})`,
                  }}
                >
                  <CardHeader>
                    <CardTitle className="pr-8">{plan.name}</CardTitle>
                    <CardDescription>
                      Stage: {stageLabels[plan.current_stage]}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <DeletePlanButton
                planId={plan.id}
                planName={plan.name}
                className="absolute top-4 right-4"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

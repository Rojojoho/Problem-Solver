import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewPlanDialog } from "@/components/plan/new-plan-dialog";
import { getCurrentOrg } from "@/lib/org";
import { listPlans } from "@/lib/db";

export default async function PlansPage() {
  const { orgId, orgName } = await getCurrentOrg();
  const plans = await listPlans(orgId);

  return (
    <div className="space-y-6">
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
            <Link key={plan.id} href={`/plans/${plan.id}`}>
              <Card
                className="h-full border-l-4 transition-colors hover:border-foreground/30"
                style={{ borderLeftColor: `var(--chart-${STAGE_ORDER.indexOf(plan.current_stage) + 1})` }}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    Stage: {STAGE_LABELS[plan.current_stage]}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  PI: "1 · Problem Identification",
  PC: "2 · Inquire into Causes",
  SR: "3 · Solution Requirements",
  SS: "4 · Solution Strategies",
  EI: "5 · Evaluate Impact",
};

const STAGE_ORDER = ["PI", "PC", "SR", "SS", "EI"];

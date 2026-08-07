import { listSolutionStrategyStatuses } from "@/lib/db";
import { StrategyStatusesEditor } from "@/components/admin/strategy-statuses-editor";

export default async function AdminStrategyStatusesPage() {
  const options = await listSolutionStrategyStatuses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Solution strategy statuses
        </h1>
        <p className="text-sm text-muted-foreground">
          These statuses are selectable per solution strategy on Stage 3B.
          Changes apply immediately across all plans.
        </p>
      </div>

      <StrategyStatusesEditor options={options} />
    </div>
  );
}

import { listImpactMeasureTypes } from "@/lib/db";
import { ImpactMeasureTypesEditor } from "@/components/admin/impact-measure-types-editor";

export default async function AdminImpactMeasureTypesPage() {
  const options = await listImpactMeasureTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impact measure types</h1>
        <p className="text-sm text-muted-foreground">
          These types are selectable per measure on Stage 5. Changes apply
          immediately across all plans.
        </p>
      </div>

      <ImpactMeasureTypesEditor options={options} />
    </div>
  );
}

import { listRequirementTypes } from "@/lib/db";
import { RequirementTypesEditor } from "@/components/admin/requirement-types-editor";

export default async function AdminRequirementTypesPage() {
  const options = await listRequirementTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Requirement types</h1>
        <p className="text-sm text-muted-foreground">
          These types are selectable per solution requirement on Stage 3A.
          Changes apply immediately across all plans.
        </p>
      </div>

      <RequirementTypesEditor options={options} />
    </div>
  );
}

import { listValidationOptions } from "@/lib/db";
import { ValidationOptionsEditor } from "@/components/admin/validation-options-editor";

export default async function AdminValidationOptionsPage() {
  const options = await listValidationOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Initial Validation options
        </h1>
        <p className="text-sm text-muted-foreground">
          These statuses are selectable per causal hypothesis on Stage 2.
          Changes apply immediately across all plans.
        </p>
      </div>

      <ValidationOptionsEditor options={options} />
    </div>
  );
}

import { listChecklistTemplateItems } from "@/lib/db";
import { STAGES } from "@/lib/ccps/constants";
import { ChecklistTemplateEditor } from "@/components/admin/checklist-template-editor";

export default async function AdminChecklistTemplatesPage() {
  const itemsByStage = Object.fromEntries(
    await Promise.all(
      STAGES.map(async (s) => [s.key, await listChecklistTemplateItems(s.key)] as const)
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Checklist templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Changes here only apply to plans created from now on — plans
          already in progress keep the checklist they started with.
        </p>
      </div>

      <ChecklistTemplateEditor itemsByStage={itemsByStage} />
    </div>
  );
}

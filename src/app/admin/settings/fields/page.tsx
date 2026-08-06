import { listStageFieldTemplates } from "@/lib/db";
import { STAGES } from "@/lib/ccps/constants";
import { StageFieldTemplateEditor } from "@/components/admin/stage-field-template-editor";

export default async function AdminStageFieldsPage() {
  const fieldsByStage = Object.fromEntries(
    await Promise.all(
      STAGES.map(async (s) => [s.key, await listStageFieldTemplates(s.key)] as const)
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stage fields</h1>
        <p className="text-sm text-muted-foreground">
          The input fields shown on each stage. Changes here only apply to
          plans created from now on — plans already in progress keep the
          fields they started with. A stage with no fields shows &quot;Coming
          soon&quot; to users.
        </p>
      </div>

      <StageFieldTemplateEditor fieldsByStage={fieldsByStage} />
    </div>
  );
}

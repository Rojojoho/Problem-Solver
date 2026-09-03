import { getStageFields, listStages } from "@/lib/db";
import { StageFieldTemplateEditor } from "@/components/admin/stage-field-template-editor";

export default async function AdminStageFieldsPage() {
  const stages = await listStages();
  const fieldsByStage = Object.fromEntries(
    await Promise.all(
      stages.map(
        async (s) => [s.key, await getStageFields(s.key, { includeHidden: true })] as const
      )
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stage fields</h1>
        <p className="text-sm text-muted-foreground">
          Reference IDs and editable titles for each stage&apos;s input
          fields. The fields themselves are fixed (they stay aligned with
          exemplars and existing plan data) — only the Short Name, Full
          Prompt, Helper Text, order, and visibility shown to users can be
          edited here. Hiding a field keeps its saved data intact.
        </p>
      </div>

      <StageFieldTemplateEditor stages={stages} fieldsByStage={fieldsByStage} />
    </div>
  );
}

import { listStages, getWorkspaceTabPositions, getStageFields } from "@/lib/db";
import { StagesEditor } from "@/components/admin/stages-editor";

export default async function AdminStagesPage() {
  const [stages, tabPositions] = await Promise.all([
    listStages(),
    getWorkspaceTabPositions(),
  ]);
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
        <h1 className="text-3xl font-bold tracking-tight">Stages</h1>
        <p className="text-sm text-muted-foreground">
          Tab name, full name, and description for every stage — including
          Plan Details and Summary — plus each field&apos;s title and
          subtitle. Adding a stage here creates a new tab, but it shows
          &quot;Coming soon&quot; until its input fields are configured.
        </p>
      </div>

      <StagesEditor stages={stages} tabPositions={tabPositions} fieldsByStage={fieldsByStage} />
    </div>
  );
}

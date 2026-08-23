import { listStages, getWorkspaceTabPositions } from "@/lib/db";
import { StagesEditor } from "@/components/admin/stages-editor";

export default async function AdminStagesPage() {
  const [stages, tabPositions] = await Promise.all([
    listStages(),
    getWorkspaceTabPositions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stages</h1>
        <p className="text-sm text-muted-foreground">
          Rename or reorder the tabs shown on every plan, including Plan
          Details and Summary. Adding a stage here creates a new tab, but it
          shows &quot;Coming soon&quot; until its input fields are
          configured.
        </p>
      </div>

      <StagesEditor stages={stages} tabPositions={tabPositions} />
    </div>
  );
}

import { listMoscowOptions } from "@/lib/db";
import { MoscowOptionsEditor } from "@/components/admin/moscow-options-editor";

export default async function AdminMoscowOptionsPage() {
  const options = await listMoscowOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MoSCoW options</h1>
        <p className="text-sm text-muted-foreground">
          These are the &quot;A solution…&quot; options selectable per
          solution requirement on Stage 3A. Changes apply immediately across
          all plans.
        </p>
      </div>

      <MoscowOptionsEditor options={options} />
    </div>
  );
}

import { listKnowledgeTypes } from "@/lib/db";
import { KnowledgeTypesEditor } from "@/components/admin/knowledge-types-editor";

export default async function AdminKnowledgeTypesPage() {
  const options = await listKnowledgeTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge types</h1>
        <p className="text-sm text-muted-foreground">
          These types are selectable per Knowledge item in every plan&apos;s
          side panel. Changes apply immediately across all plans.
        </p>
      </div>

      <KnowledgeTypesEditor options={options} />
    </div>
  );
}

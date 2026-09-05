import { listPageSettings, listKnowledgeTypes } from "@/lib/db";
import { PagesSettingsEditor } from "@/components/admin/pages-settings-editor";

export default async function AdminPagesSettingsPage() {
  const [pageSettings, knowledgeTypes] = await Promise.all([
    listPageSettings(),
    listKnowledgeTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
        <p className="text-sm text-muted-foreground">
          Menu title, screen title, and description for each school-facing
          section. Changes apply immediately across every school.
        </p>
      </div>

      <PagesSettingsEditor pageSettings={pageSettings} knowledgeTypes={knowledgeTypes} />
    </div>
  );
}

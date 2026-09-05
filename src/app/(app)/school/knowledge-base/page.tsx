import { getCurrentOrg } from "@/lib/org";
import { listSharedKnowledgeItems, getPageSetting } from "@/lib/db";
import { KnowledgeBaseView } from "@/components/school/knowledge-base-view";

export default async function SchoolKnowledgeBasePage() {
  const { orgId } = await getCurrentOrg();
  const [items, pageSettings] = await Promise.all([
    listSharedKnowledgeItems(orgId),
    getPageSetting("knowledge_base"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pageSettings.screenTitle}</h1>
        {pageSettings.description && (
          <p className="text-sm text-muted-foreground">{pageSettings.description}</p>
        )}
      </div>

      <KnowledgeBaseView items={items} />
    </div>
  );
}

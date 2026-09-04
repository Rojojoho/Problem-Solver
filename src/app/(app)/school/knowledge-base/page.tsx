import { getCurrentOrg } from "@/lib/org";
import { listSharedKnowledgeItems } from "@/lib/db";
import { KnowledgeBaseView } from "@/components/school/knowledge-base-view";

export default async function SchoolKnowledgeBasePage() {
  const { orgId, orgName } = await getCurrentOrg();
  const items = await listSharedKnowledgeItems(orgId);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          Every knowledge item shared across {orgName}&apos;s plans. To add,
          edit, or adapt one, open it from its plan&apos;s Knowledge tab.
        </p>
      </div>

      <KnowledgeBaseView items={items} />
    </div>
  );
}

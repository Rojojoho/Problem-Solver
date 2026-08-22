import { getDiagramHeadings } from "@/lib/db";
import { DiagramHeadingsEditor } from "@/components/admin/diagram-headings-editor";

export default async function AdminDiagramHeadingsPage() {
  const headings = await getDiagramHeadings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connections diagram headings</h1>
        <p className="text-sm text-muted-foreground">
          Column headings shown on the 3.2 &quot;Connections&quot; popup.
          Changes apply immediately across all plans.
        </p>
      </div>

      <DiagramHeadingsEditor headings={headings} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getKbArticle } from "@/lib/db";
import { STAGE_LABELS } from "@/lib/ccps/constants";
import { TiptapEditor } from "@/components/tiptap-editor";

export default async function KbArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getKbArticle(id);
  if (!article || article.status !== "published") notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          {article.stage ? STAGE_LABELS[article.stage] : "General"}
        </p>
      </div>
      <TiptapEditor content={article.body} editable={false} />
    </div>
  );
}

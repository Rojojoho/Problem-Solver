import { notFound } from "next/navigation";
import { getKbArticle, listStages } from "@/lib/db";
import { stageLabelMap } from "@/lib/ccps/constants";
import { TiptapEditor } from "@/components/tiptap-editor";

export default async function KbArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [article, stages] = await Promise.all([getKbArticle(id), listStages()]);
  if (!article || article.status !== "published") notFound();
  const stageLabels = stageLabelMap(stages);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          {article.stage ? stageLabels[article.stage] : "General"}
        </p>
      </div>
      <TiptapEditor content={article.body} editable={false} />
    </div>
  );
}

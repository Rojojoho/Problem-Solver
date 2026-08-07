import { notFound } from "next/navigation";
import { getKbArticle, listStages } from "@/lib/db";
import { KbArticleEditor } from "@/components/admin/kb-article-editor";

export default async function AdminKbArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [article, stages] = await Promise.all([getKbArticle(id), listStages()]);
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <KbArticleEditor article={article} stages={stages} />
    </div>
  );
}

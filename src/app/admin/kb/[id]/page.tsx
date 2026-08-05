import { notFound } from "next/navigation";
import { getKbArticle } from "@/lib/db";
import { KbArticleEditor } from "@/components/admin/kb-article-editor";

export default async function AdminKbArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getKbArticle(id);
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <KbArticleEditor article={article} />
    </div>
  );
}

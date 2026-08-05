import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listKbArticles } from "@/lib/db";
import { STAGE_LABELS } from "@/lib/ccps/constants";
import { NewKbArticleDialog } from "@/components/admin/new-kb-article-dialog";

export default async function AdminKbPage() {
  const articles = await listKbArticles(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge base</h1>
          <p className="text-sm text-muted-foreground">
            Articles shown on the Knowledge Base page and in the plan side
            panel.
          </p>
        </div>
        <NewKbArticleDialog />
      </div>

      {!articles.length ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No articles yet</CardTitle>
            <CardDescription>
              Create your first knowledge base article to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={`/admin/kb/${article.id}`}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{article.title}</CardTitle>
                    <Badge variant={article.status === "published" ? "success" : "outline"}>
                      {article.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {article.stage ? STAGE_LABELS[article.stage] : "General"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listKbArticles, listStages, getPageSetting } from "@/lib/db";
import { stageLabelMap } from "@/lib/ccps/constants";

export default async function KbPage() {
  const [articles, stages, pageSettings] = await Promise.all([
    listKbArticles(true),
    listStages(),
    getPageSetting("guide"),
  ]);
  const stageLabels = stageLabelMap(stages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pageSettings.screenTitle}</h1>
        {pageSettings.description && (
          <p className="text-sm text-muted-foreground">{pageSettings.description}</p>
        )}
      </div>

      {!articles.length ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Nothing here yet</CardTitle>
            <CardDescription>
              Check back later — articles will appear here as they&apos;re
              published.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={`/kb/${article.id}`}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle>{article.title}</CardTitle>
                  <CardDescription>
                    {article.stage ? stageLabels[article.stage] : "General"}
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

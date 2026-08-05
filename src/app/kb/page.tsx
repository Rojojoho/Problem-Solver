import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listKbArticles } from "@/lib/db";
import { STAGE_LABELS } from "@/lib/ccps/constants";

export default async function KbPage() {
  const articles = await listKbArticles(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          Guidance and worked advice for the CCPS process.
        </p>
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

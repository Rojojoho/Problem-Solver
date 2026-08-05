import Link from "next/link";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { KbArticleSummary } from "@/lib/ccps/types";

interface KbPanelProps {
  stage: CcpsStage;
  articles: KbArticleSummary[];
}

export function KbPanel({ stage, articles }: KbPanelProps) {
  const relevant = articles.filter(
    (a) => a.stage === null || a.stage === stage
  );

  if (!relevant.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No knowledge base articles for this stage yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {relevant.map((article) => (
        <li key={article.id}>
          <Link
            href={`/kb/${article.id}`}
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            {article.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

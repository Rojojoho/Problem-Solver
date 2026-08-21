import Link from "next/link";
import type { KbArticleData } from "@/lib/ccps/types";
import type { PanelStage } from "@/components/plan/side-panel";
import { TiptapEditor } from "@/components/tiptap-editor";

interface KbPanelProps {
  stage: PanelStage;
  articles: KbArticleData[];
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
    <div className="space-y-2">
      {relevant.map((article) => (
        <details key={article.id} className="rounded-md border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted/50">
            {article.title}
          </summary>
          <div className="border-t border-border px-3 py-2">
            <TiptapEditor content={article.body} editable={false} />
            <Link
              href={`/kb/${article.id}`}
              target="_blank"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Open full page
            </Link>
          </div>
        </details>
      ))}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  askKnowledgeBase,
  type KnowledgeBaseAnswer,
} from "@/app/plans/[id]/rag-actions";

export function AskPanel() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<KnowledgeBaseAnswer | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!question.trim()) return;
    startTransition(async () => {
      try {
        const answer = await askKnowledgeBase(question);
        setResult(answer);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't get an answer."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Ask a question about the source documents in the local knowledge
        base. Local-only — this needs the app running on your own machine.
      </p>

      <div className="space-y-2">
        <Textarea
          placeholder="Ask a question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !question.trim()}
        >
          {isPending ? "Thinking…" : "Ask"}
        </Button>
      </div>

      {result && (
        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <p className="whitespace-pre-wrap">{result.answer}</p>
          {result.sources.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Sources</p>
              <ul className="list-inside list-disc">
                {result.sources.map((src) => (
                  <li key={`${src.source}-${src.page}`}>
                    {src.source} (page {src.page})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

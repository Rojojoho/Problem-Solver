"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addFeedback } from "@/app/plans/[id]/actions";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { FeedbackItemData } from "@/lib/ccps/types";

interface FeedbackPanelProps {
  planId: string;
  stage: CcpsStage;
  feedback: FeedbackItemData[];
}

export function FeedbackPanel({ planId, stage, feedback }: FeedbackPanelProps) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const stageFeedback = feedback.filter((f) => f.stage === stage);

  function handleSubmit() {
    if (!value.trim()) return;
    startTransition(async () => {
      try {
        await addFeedback(planId, stage, value);
        setValue("");
      } catch {
        toast.error("Couldn't post feedback.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Leave feedback on this stage…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !value.trim()}
        >
          {isPending ? "Posting…" : "Post feedback"}
        </Button>
      </div>

      <div>
        {stageFeedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback yet.</p>
        ) : (
          stageFeedback.map((f) => (
            <div
              key={f.id}
              className="border-b border-border py-3 text-sm last:border-b-0"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{f.author_name}</span>
                <span>{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              <p>{f.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

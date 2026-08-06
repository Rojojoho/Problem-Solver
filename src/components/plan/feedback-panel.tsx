"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { addFeedback, toggleFeedbackResolved } from "@/app/plans/[id]/actions";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { FeedbackItemData } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";

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
            <FeedbackItem key={f.id} planId={planId} feedback={f} />
          ))
        )}
      </div>
    </div>
  );
}

function FeedbackItem({
  planId,
  feedback,
}: {
  planId: string;
  feedback: FeedbackItemData;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(resolved: boolean) {
    startTransition(async () => {
      try {
        await toggleFeedbackResolved(planId, feedback.id, resolved);
      } catch {
        toast.error("Couldn't update that comment.");
      }
    });
  }

  return (
    <div className="border-b border-border py-3 text-sm last:border-b-0">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{feedback.author_name}</span>
        <span>{feedback.created_at.slice(0, 10)}</span>
      </div>
      <p className={cn(feedback.resolved && "text-muted-foreground line-through")}>
        {feedback.body}
      </p>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <Checkbox
          checked={feedback.resolved}
          onCheckedChange={(checked) => handleToggle(checked === true)}
          disabled={isPending}
        />
        Resolved
        {feedback.resolved && <Badge variant="success">Resolved</Badge>}
      </label>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { addFeedback, toggleFeedbackResolved } from "@/app/(app)/plans/[id]/actions";
import type { FeedbackItemData } from "@/lib/ccps/types";
import type { PanelStage } from "@/components/plan/side-panel";
import { cn } from "@/lib/utils";

interface FeedbackPanelProps {
  planId: string;
  stage: PanelStage;
  feedback: FeedbackItemData[];
}

export function FeedbackPanel({ planId, stage, feedback }: FeedbackPanelProps) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  // Summary and Plan Details aren't real stages — their feedback is filed
  // as general (no stage), the same "not tied to one stage" concept KB
  // articles already use.
  const dbStage = stage === "summary" || stage === "details" ? null : stage;
  const stageFeedback = feedback.filter((f) => f.stage === dbStage);

  function handleSubmit() {
    if (!value.trim()) return;
    startTransition(async () => {
      try {
        await addFeedback(planId, dbStage, value);
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
  const [resolved, setResolved] = useState(feedback.resolved);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setResolved(next);
    startTransition(async () => {
      try {
        await toggleFeedbackResolved(planId, feedback.id, next);
      } catch {
        toast.error("Couldn't update that comment.");
        setResolved(!next);
      }
    });
  }

  return (
    <div className="border-b border-border py-3 text-sm last:border-b-0">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{feedback.author_name}</span>
        <span>{feedback.created_at.slice(0, 10)}</span>
      </div>
      <p className={cn(resolved && "text-muted-foreground line-through")}>
        {feedback.body}
      </p>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <Checkbox
          checked={resolved}
          onCheckedChange={(checked) => handleToggle(checked === true)}
          disabled={isPending}
        />
        Resolved
        {resolved && <Badge variant="success">Resolved</Badge>}
      </label>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publishPlan } from "@/app/plans/[id]/actions";
import type { PublishedStatus } from "@/lib/supabase/database.types";

const STATUS_BADGE: Record<
  PublishedStatus,
  { label: string; variant: "warning" | "success" | "destructive" }
> = {
  pending: { label: "Pending review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function PublishButton({
  planId,
  status,
}: {
  planId: string;
  status: PublishedStatus | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      try {
        await publishPlan(planId);
        toast.success("Plan published for review.");
      } catch {
        toast.error("Couldn't publish this plan.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <Badge variant={STATUS_BADGE[status].variant}>
          {STATUS_BADGE[status].label}
        </Badge>
      )}
      <Button
        variant="outline-primary"
        size="sm"
        onClick={handlePublish}
        disabled={isPending}
      >
        {isPending ? "Publishing…" : "Publish this plan"}
      </Button>
    </div>
  );
}

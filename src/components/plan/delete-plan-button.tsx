"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePlan } from "@/app/plans/actions";
import { cn } from "@/lib/utils";

export function DeletePlanButton({
  planId,
  planName,
  className,
}: {
  planId: string;
  planName: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${planName}"? This can't be undone.`)) return;

    startTransition(async () => {
      try {
        await deletePlan(planId);
        toast.success("Plan deleted.");
      } catch {
        toast.error("Couldn't delete this plan.");
      }
    });
  }

  return (
    <Button
      variant="outline-destructive"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Delete ${planName}`}
      className={cn("bg-background", className)}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

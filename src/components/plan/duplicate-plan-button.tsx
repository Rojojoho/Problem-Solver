"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { duplicatePlan } from "@/app/plans/actions";
import { cn } from "@/lib/utils";

export function DuplicatePlanButton({
  planId,
  planName,
  className,
}: {
  planId: string;
  planName: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      try {
        const { id } = await duplicatePlan(planId);
        toast.success("Plan duplicated.");
        router.push(`/plans/${id}`);
      } catch {
        toast.error("Couldn't duplicate this plan.");
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={handleDuplicate}
      disabled={isPending}
      aria-label={`Duplicate ${planName}`}
      className={cn("bg-background", className)}
    >
      <Copy className="size-4" />
    </Button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { publishPlan } from "@/app/(app)/plans/[id]/actions";
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      try {
        await publishPlan(planId);
        toast.success("Plan submitted.");
        setOpen(false);
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="outline-primary" size="sm">
              {status ? "Submit an update" : "Publish this plan"}
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this plan with Resolve</DialogTitle>
            <DialogDescription>
              A snapshot of this plan — its answers, tags, and stage — is
              shared with the Resolve team to help build a research database
              of school problem-solving plans. It stays private to us unless
              we separately mark it &quot;approved&quot;, at which point it
              becomes visible (read-only) to other schools using Resolve.
              You can submit an updated snapshot any time your plan changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? "Submitting…" : "Share this plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

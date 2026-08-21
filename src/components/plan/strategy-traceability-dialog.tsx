"use client";

import { useState } from "react";
import { Loader2, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getSolutionStrategyTraceability,
  type StrategyTraceability,
  type TraceCauseNode,
  type TraceRequirement,
} from "@/app/plans/[id]/actions";
import { cn } from "@/lib/utils";

interface StrategyTraceabilityDialogProps {
  planId: string;
  strategyId: string;
  strategyLabel: string;
}

// Fetched fresh every time the dialog opens rather than cached — same
// live-refetch reasoning as every other cross-stage picker in these
// tables (LinkCell/LinkPicker's onOpenChange), since a stale snapshot
// would silently show connections that have since changed or been removed.
export function StrategyTraceabilityDialog({
  planId,
  strategyId,
  strategyLabel,
}: StrategyTraceabilityDialogProps) {
  const [data, setData] = useState<StrategyTraceability | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) return;
    setLoading(true);
    setData(null);
    getSolutionStrategyTraceability(planId, strategyId)
      .then(setData)
      .catch(() => toast.error("Couldn't load the connections for this strategy."))
      .finally(() => setLoading(false));
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            aria-label="View connections"
          >
            <Waypoints className="size-3.5" />
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Connections{strategyLabel ? ` — ${strategyLabel}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : data ? (
          <TraceabilityView data={data} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TraceabilityView({ data }: { data: StrategyTraceability }) {
  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="text-xs font-medium text-muted-foreground uppercase">
          1.1 Problem
        </div>
        {data.problemStatement.length ? (
          <div className="mt-1 space-y-1 text-sm">
            {data.problemStatement.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground italic">
            Not filled in yet.
          </p>
        )}
      </div>

      {data.requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This strategy isn&apos;t linked to any requirements yet.
        </p>
      ) : (
        <div className="space-y-3">
          {data.requirements.map((requirement, i) => (
            <RequirementBranch key={requirement.id + i} requirement={requirement} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequirementBranch({ requirement }: { requirement: TraceRequirement }) {
  if (requirement.dangling) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground italic">
        Deleted requirement
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-sm font-medium">
        {requirement.shortId}
        {requirement.requirement ? (
          <span className="ml-1.5 font-normal text-muted-foreground">
            {requirement.requirement}
          </span>
        ) : null}
      </div>

      {requirement.causes.length === 0 ? (
        <p className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground italic">
          No causes or measures linked yet.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
          {requirement.causes.map((cause, i) => (
            <CauseLeaf key={i} cause={cause} />
          ))}
        </div>
      )}
    </div>
  );
}

function CauseLeaf({ cause }: { cause: TraceCauseNode }) {
  const isDangling = cause.kind === "dangling";
  return (
    <div className="text-xs">
      <span
        className={cn(
          "font-medium",
          isDangling && "text-muted-foreground italic"
        )}
      >
        {cause.kind === "measure" ? "Measure: " : isDangling ? "" : "Cause: "}
        {cause.label}
      </span>
      {cause.detail ? (
        <span className="ml-1 text-muted-foreground">({cause.detail})</span>
      ) : null}
    </div>
  );
}

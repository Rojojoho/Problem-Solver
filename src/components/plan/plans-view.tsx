"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DeletePlanButton } from "@/components/plan/delete-plan-button";
import { DuplicatePlanButton } from "@/components/plan/duplicate-plan-button";
import { deletePlans } from "@/app/(app)/plans/actions";
import { cn } from "@/lib/utils";

interface PlanSummary {
  id: string;
  name: string;
  current_stage: string;
}

interface PlansViewProps {
  plans: PlanSummary[];
  stageLabels: Record<string, string>;
  stageOrder: string[];
}

type ViewMode = "tile" | "list";

const VIEW_MODE_KEY = "ccps:plans-view-mode";

function stageColor(stageOrder: string[], stage: string) {
  const index = stageOrder.indexOf(stage);
  return `var(--chart-${(index >= 0 ? index % 5 : 0) + 1})`;
}

export function PlansView({ plans, stageLabels, stageOrder }: PlansViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tile");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "tile" || saved === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a persisted user preference from localStorage on mount
      setViewMode(saved);
    }
  }, []);

  function changeViewMode(next: ViewMode) {
    setViewMode(next);
    localStorage.setItem(VIEW_MODE_KEY, next);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === plans.length ? new Set() : new Set(plans.map((p) => p.id))));
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (
      !window.confirm(
        `Delete ${ids.length} plan${ids.length === 1 ? "" : "s"}? This can't be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePlans(ids);
      toast.success(`${ids.length} plan${ids.length === 1 ? "" : "s"} deleted.`);
      setSelected(new Set());
    } catch {
      toast.error("Couldn't delete the selected plans.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!plans.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No plans yet</CardTitle>
          <CardDescription>
            Create your first problem-solving plan to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allSelected = selected.size > 0 && selected.size === plans.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all plans"
            />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
          {selected.size > 0 && (
            <Button
              variant="outline-destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="size-3.5" />
              Delete selected
            </Button>
          )}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <Button
            type="button"
            variant={viewMode === "tile" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Tile view"
            aria-pressed={viewMode === "tile"}
            onClick={() => changeViewMode("tile")}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => changeViewMode("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {viewMode === "tile" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="relative h-full">
              <div className="absolute top-3 left-3 z-10 rounded bg-background p-0.5 shadow-sm">
                <Checkbox
                  checked={selected.has(plan.id)}
                  onCheckedChange={() => toggleSelected(plan.id)}
                  aria-label={`Select ${plan.name}`}
                />
              </div>
              <Link href={`/plans/${plan.id}`}>
                <Card
                  className="h-full border-l-4 transition-colors hover:border-foreground/30"
                  style={{ borderLeftColor: stageColor(stageOrder, plan.current_stage) }}
                >
                  <CardHeader>
                    <CardTitle className="pr-8 pl-6">{plan.name}</CardTitle>
                    <CardDescription className="pl-6">
                      Stage: {stageLabels[plan.current_stage]}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <DuplicatePlanButton planId={plan.id} planName={plan.name} />
                <DeletePlanButton planId={plan.id} planName={plan.name} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50",
                selected.has(plan.id) && "bg-muted/30"
              )}
            >
              <Checkbox
                checked={selected.has(plan.id)}
                onCheckedChange={() => toggleSelected(plan.id)}
                aria-label={`Select ${plan.name}`}
              />
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: stageColor(stageOrder, plan.current_stage) }}
              />
              <Link
                href={`/plans/${plan.id}`}
                className="flex flex-1 items-center justify-between gap-3 overflow-hidden"
              >
                <span className="truncate font-medium">{plan.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {stageLabels[plan.current_stage]}
                </span>
              </Link>
              <DuplicatePlanButton planId={plan.id} planName={plan.name} />
              <DeletePlanButton planId={plan.id} planName={plan.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

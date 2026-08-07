"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleChecklistItem } from "@/app/plans/[id]/actions";
import type { ChecklistItemData } from "@/lib/ccps/types";

interface ChecklistPanelProps {
  planId: string;
  stageLabel: string;
  items: ChecklistItemData[];
}

export function ChecklistPanel({
  planId,
  stageLabel,
  items,
}: ChecklistPanelProps) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.item_key, i.checked]))
  );
  const [, startTransition] = useTransition();

  function handleToggle(itemKey: string, checked: boolean) {
    setState((prev) => ({ ...prev, [itemKey]: checked }));
    startTransition(async () => {
      try {
        await toggleChecklistItem(planId, itemKey, checked);
      } catch {
        toast.error("Couldn't save checklist state.");
        setState((prev) => ({ ...prev, [itemKey]: !checked }));
      }
    });
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No checklist items.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium">
        Does it meet the success criteria for {stageLabel}?
      </p>
      {items.map((item) => (
        <label
          key={item.item_key}
          className="flex items-start gap-2 border-b border-border px-1 py-2.5 text-sm leading-snug last:border-b-0 hover:bg-muted/50"
        >
          <Checkbox
            checked={state[item.item_key] ?? false}
            onCheckedChange={(checked) =>
              handleToggle(item.item_key, checked === true)
            }
            className="mt-0.5"
          />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

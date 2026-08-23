"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StageData, WorkspaceTabPositions } from "@/lib/ccps/types";
import {
  createStage,
  updateStage,
  updateWorkspaceTabPosition,
} from "@/app/admin/settings/stages/actions";

type MergedRow =
  | { kind: "stage"; key: string; label: string; sortOrder: number }
  | { kind: "details" | "summary"; label: string; sortOrder: number };

export function StagesEditor({
  stages,
  tabPositions,
}: {
  stages: StageData[];
  tabPositions: WorkspaceTabPositions;
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [pending, setPending] = useState(false);

  // Plan Details/Summary aren't rows in the `stages` table (see
  // 0023_workspace_tab_positions.sql for why), but they're shown merged
  // into the same reorderable list here so an admin can freely interleave
  // them with the real stages — e.g. move Summary to the end.
  const rows: MergedRow[] = [
    ...stages.map((s): MergedRow => ({ kind: "stage", key: s.key, label: s.label, sortOrder: s.sort_order })),
    { kind: "details", label: "Plan Details", sortOrder: tabPositions.details } satisfies MergedRow,
    { kind: "summary", label: "Summary", sortOrder: tabPositions.summary } satisfies MergedRow,
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("label", label);
      await createStage(formData);
      toast.success("Stage added.");
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that stage.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      {rows.map((row) =>
        row.kind === "stage" ? (
          <StageRow key={row.key} stageKey={row.key} label={row.label} sortOrder={row.sortOrder} />
        ) : (
          <TabPositionRow key={row.kind} tabKey={row.kind} label={row.label} sortOrder={row.sortOrder} />
        )
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. 6 Sustain"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add stage
        </Button>
      </form>
    </div>
  );
}

function StageRow({
  stageKey,
  label: initialLabel,
  sortOrder: initialSortOrder,
}: {
  stageKey: string;
  label: string;
  sortOrder: number;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateStage(stageKey, label, sortOrder);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that stage.");
      }
    });
  }

  return (
    <div className="flex items-start gap-2 border-b border-border py-2.5 last:border-b-0">
      <span className="mt-2 w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {stageKey}
      </span>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
        className="w-20"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Save
      </Button>
    </div>
  );
}

// Plan Details / Summary — same row shape as a real stage, but the label
// is fixed (not admin-editable) and saving updates workspace_tab_positions
// instead of the stages table.
function TabPositionRow({
  tabKey,
  label,
  sortOrder: initialSortOrder,
}: {
  tabKey: "details" | "summary";
  label: string;
  sortOrder: number;
}) {
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateWorkspaceTabPosition(tabKey, sortOrder);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that.");
      }
    });
  }

  return (
    <div className="flex items-start gap-2 border-b border-border py-2.5 last:border-b-0">
      <span className="mt-2 w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {tabKey}
      </span>
      <div className="flex-1 px-3 py-1.5 text-sm text-muted-foreground italic">
        {label}
      </div>
      <Input
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
        className="w-20"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Save
      </Button>
    </div>
  );
}

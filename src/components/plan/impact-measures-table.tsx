"use client";

import { useEffect, useRef, useState } from "react";
import { Download, GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSourceMeasureRows,
  saveImpactMeasureRows,
  saveImpactOutcomeGroups,
} from "@/app/plans/[id]/actions";
import type { ImpactMeasureRow, LabeledOption, OutcomeGroup } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { useSerializedSave } from "@/components/plan/use-serialized-save";

interface ImpactMeasuresTableProps {
  planId: string;
  initialRows: ImpactMeasureRow[];
  initialGroups: OutcomeGroup[];
  impactMeasureTypes: LabeledOption[];
}

const NONE = "__none__";

function defaultGroup(): OutcomeGroup {
  return { id: crypto.randomUUID(), name: "Outcome group 1", description: "" };
}

function blankRow(groupId: string): ImpactMeasureRow {
  return {
    id: crypto.randomUUID(),
    groupId,
    measure: "",
    baseline: "",
    target: "",
    timeframe: "",
    type: null,
    actual: "",
    notes: "",
  };
}

const COLUMN_WIDTHS = [
  { key: "measure", defaultWidth: 200 },
  { key: "baseline", defaultWidth: 120 },
  { key: "target", defaultWidth: 120 },
  { key: "timeframe", defaultWidth: 120 },
  { key: "type", defaultWidth: 116 },
  { key: "actual", defaultWidth: 160 },
  { key: "notes", defaultWidth: 200 },
];

const DATA_COL_COUNT = 9; // drag-handle, 7 fields, delete

export function ImpactMeasuresTable({
  planId,
  initialRows,
  initialGroups,
  impactMeasureTypes,
}: ImpactMeasuresTableProps) {
  const [rows, setRows] = useState<ImpactMeasureRow[]>(initialRows);
  const [groups, setGroups] = useState<OutcomeGroup[]>(() =>
    initialGroups.length ? initialGroups : [defaultGroup()]
  );
  // Mirror `rows`/`groups` synchronously (updated inside every setter below,
  // not via an effect) so onBlur/drop handlers always read the truly-latest
  // state even if they fire before React has re-rendered with a fresh
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<ImpactMeasureRow[]>(rows);
  const groupsRef = useRef<OutcomeGroup[]>(groups);
  const dragRowIdRef = useRef<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:impact-measures",
    COLUMN_WIDTHS
  );
  const saveRows = useSerializedSave<ImpactMeasureRow[]>(
    (nextRows) => saveImpactMeasureRows(planId, nextRows),
    () => toast.error("Couldn't save the impact measures table.")
  );
  const saveGroups = useSerializedSave<OutcomeGroup[]>(
    (nextGroups) => saveImpactOutcomeGroups(planId, nextGroups),
    () => toast.error("Couldn't save the outcome groups.")
  );

  // A brand-new Stage 5 starts with no groups at all — the lazy initializer
  // above already seeds one default group into local state so the page
  // isn't empty, but that seed still needs saving once, here.
  useEffect(() => {
    if (initialGroups.length === 0) {
      saveGroups(groupsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time seed persist on mount only
  }, []);

  function persistRows(nextRows: ImpactMeasureRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    saveRows(nextRows);
  }

  function persistGroups(nextGroups: OutcomeGroup[]) {
    groupsRef.current = nextGroups;
    setGroups(nextGroups);
    saveGroups(nextGroups);
  }

  function updateRow(id: string, updates: Partial<ImpactMeasureRow>) {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      rowsRef.current = next;
      return next;
    });
  }

  function commitRows() {
    persistRows(rowsRef.current);
  }

  function addRow(groupId: string) {
    persistRows([...rowsRef.current, blankRow(groupId)]);
  }

  function removeRow(id: string) {
    persistRows(rowsRef.current.filter((r) => r.id !== id));
  }

  function updateGroup(id: string, updates: Partial<OutcomeGroup>) {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, ...updates } : g));
      groupsRef.current = next;
      return next;
    });
  }

  function commitGroups() {
    persistGroups(groupsRef.current);
  }

  function addGroup() {
    persistGroups([
      ...groupsRef.current,
      {
        id: crypto.randomUUID(),
        name: `Outcome group ${groupsRef.current.length + 1}`,
        description: "",
      },
    ]);
  }

  // Deleting a group folds its rows into the first remaining group rather
  // than losing them — deleting the last group left is disallowed entirely
  // (the remove button is disabled whenever there's only one), since every
  // row always needs some group's table to live in.
  function removeGroup(id: string) {
    if (groupsRef.current.length <= 1) return;
    const remaining = groupsRef.current.filter((g) => g.id !== id);
    const fallbackId = remaining[0].id;
    persistGroups(remaining);
    persistRows(
      rowsRef.current.map((r) => (r.groupId === id ? { ...r, groupId: fallbackId } : r))
    );
  }

  function handleDragStart(rowId: string) {
    return (e: React.DragEvent) => {
      dragRowIdRef.current = rowId;
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  // Dropping onto a row moves the dragged row next to it and adopts its
  // group — reordering within a group and moving between groups (even
  // across separate tables) are the same gesture.
  function handleDropOnRow(targetRow: ImpactMeasureRow) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = dragRowIdRef.current;
      dragRowIdRef.current = null;
      if (!sourceId || sourceId === targetRow.id) return;
      const current = [...rowsRef.current];
      const fromIndex = current.findIndex((r) => r.id === sourceId);
      if (fromIndex === -1) return;
      const [moved] = current.splice(fromIndex, 1);
      const toIndex = current.findIndex((r) => r.id === targetRow.id);
      current.splice(toIndex === -1 ? current.length : toIndex, 0, {
        ...moved,
        groupId: targetRow.groupId,
      });
      persistRows(current);
    };
  }

  // Dropping on a group's "+ Add measure" row appends the dragged row to
  // the end of that group.
  function handleDropOnGroup(groupId: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = dragRowIdRef.current;
      dragRowIdRef.current = null;
      if (!sourceId) return;
      const current = [...rowsRef.current];
      const fromIndex = current.findIndex((r) => r.id === sourceId);
      if (fromIndex === -1) return;
      const [moved] = current.splice(fromIndex, 1);
      current.push({ ...moved, groupId });
      persistRows(current);
    };
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      let targetGroupId = groupsRef.current[0]?.id;
      if (!targetGroupId) {
        const seeded = [defaultGroup()];
        persistGroups(seeded);
        targetGroupId = seeded[0].id;
      }

      const sourceRows = await getSourceMeasureRows(planId);
      const existing = new Set(
        rowsRef.current.map((r) => r.measure.trim().toLowerCase())
      );
      const toAdd = sourceRows
        .filter(
          (r) => r.measure.trim() && !existing.has(r.measure.trim().toLowerCase())
        )
        .map((r) => ({
          id: crypto.randomUUID(),
          groupId: targetGroupId as string,
          measure: r.measure,
          baseline: r.baseline,
          target: r.target,
          timeframe: "",
          type: null,
          actual: "",
          notes: r.notes,
        }));
      if (toAdd.length) {
        persistRows([...rowsRef.current, ...toAdd]);
        toast.success(`Imported ${toAdd.length} measure${toAdd.length === 1 ? "" : "s"}.`);
      } else {
        toast.info("Nothing new to import from Stage 1.");
      }
    } catch {
      toast.error("Couldn't import measures from Stage 1.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleImport}
        disabled={isImporting}
      >
        <Download className="size-3.5" />
        {isImporting ? "Importing…" : "Import measures from Stage 1"}
      </Button>

      {groups.map((group) => {
        const groupRows = rows.filter((r) => r.groupId === group.id);
        return (
          <div key={group.id} className="space-y-2">
            <GroupHeading
              group={group}
              disabledRemove={groups.length <= 1}
              onUpdate={(updates) => updateGroup(group.id, updates)}
              onBlur={commitGroups}
              onRemove={() => removeGroup(group.id)}
            />

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: widths.measure }} />
                  <col style={{ width: widths.baseline }} />
                  <col style={{ width: widths.target }} />
                  <col style={{ width: widths.timeframe }} />
                  <col style={{ width: widths.type }} />
                  <col style={{ width: widths.actual }} />
                  <col style={{ width: widths.notes }} />
                  <col style={{ width: 32 }} />
                </colgroup>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b border-border" />
                    <ResizableTh
                      isDragging={draggingKey === "measure"}
                      onPointerDown={handlePointerDown("measure", 140)}
                    >
                      Measure
                    </ResizableTh>
                    <ResizableTh
                      isDragging={draggingKey === "baseline"}
                      onPointerDown={handlePointerDown("baseline", 90)}
                    >
                      Baseline
                    </ResizableTh>
                    <ResizableTh
                      isDragging={draggingKey === "target"}
                      onPointerDown={handlePointerDown("target", 90)}
                    >
                      Target
                    </ResizableTh>
                    <ResizableTh
                      isDragging={draggingKey === "timeframe"}
                      onPointerDown={handlePointerDown("timeframe", 90)}
                    >
                      Timeframe
                    </ResizableTh>
                    <ResizableTh
                      isDragging={draggingKey === "type"}
                      onPointerDown={handlePointerDown("type", 90)}
                    >
                      Type
                    </ResizableTh>
                    <ResizableTh
                      isDragging={draggingKey === "actual"}
                      onPointerDown={handlePointerDown("actual", 100)}
                    >
                      Actual
                    </ResizableTh>
                    <ResizableTh
                      isDragging={draggingKey === "notes"}
                      onPointerDown={handlePointerDown("notes", 140)}
                    >
                      Notes
                    </ResizableTh>
                    <th className="w-8 border-b border-border" />
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border align-top"
                      onDragOver={handleDragOver}
                      onDrop={handleDropOnRow(row)}
                    >
                      <td className="p-0 text-center">
                        <button
                          type="button"
                          aria-label="Drag to reorder or regroup"
                          draggable
                          onDragStart={handleDragStart(row.id)}
                          className="mt-2 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                        >
                          <GripVertical className="mx-auto size-3.5" />
                        </button>
                      </td>
                      <MeasureCells
                        row={row}
                        impactMeasureTypes={impactMeasureTypes}
                        onUpdate={(updates) => updateRow(row.id, updates)}
                        onBlur={commitRows}
                        onTypeChange={(type) =>
                          persistRows(
                            rowsRef.current.map((r) =>
                              r.id === row.id ? { ...r, type } : r
                            )
                          )
                        }
                        onRemove={() => removeRow(row.id)}
                      />
                    </tr>
                  ))}
                  <tr onDragOver={handleDragOver} onDrop={handleDropOnGroup(group.id)}>
                    <td colSpan={DATA_COL_COUNT} className="p-0">
                      <button
                        type="button"
                        onClick={() => addRow(group.id)}
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      >
                        <Plus className="size-3.5" />
                        Add measure
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addGroup}>
        <Plus className="size-3.5" />
        Add group
      </Button>
    </div>
  );
}

function GroupHeading({
  group,
  disabledRemove,
  onUpdate,
  onBlur,
  onRemove,
}: {
  group: OutcomeGroup;
  disabledRemove: boolean;
  onUpdate: (updates: Partial<OutcomeGroup>) => void;
  onBlur: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-0.5">
        <EditableCell
          value={group.name}
          onChange={(value) => onUpdate({ name: value })}
          onBlur={onBlur}
          className="px-0 py-0 text-base font-semibold"
        />
        <EditableCell
          value={group.description}
          onChange={(value) => onUpdate({ description: value })}
          onBlur={onBlur}
          placeholder="Description…"
          className="px-0 py-0 text-xs text-muted-foreground"
        />
      </div>
      <button
        type="button"
        aria-label={
          disabledRemove
            ? "Can't remove the only remaining group"
            : `Remove ${group.name || "group"}`
        }
        title={disabledRemove ? "You need at least one group" : undefined}
        onClick={onRemove}
        disabled={disabledRemove}
        className="mt-1 shrink-0 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function MeasureCells({
  row,
  impactMeasureTypes,
  onUpdate,
  onBlur,
  onTypeChange,
  onRemove,
}: {
  row: ImpactMeasureRow;
  impactMeasureTypes: LabeledOption[];
  onUpdate: (updates: Partial<ImpactMeasureRow>) => void;
  onBlur: () => void;
  onTypeChange: (type: string | null) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.measure}
          onChange={(value) => onUpdate({ measure: value })}
          onBlur={onBlur}
        />
      </td>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.baseline}
          onChange={(value) => onUpdate({ baseline: value })}
          onBlur={onBlur}
        />
      </td>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.target}
          onChange={(value) => onUpdate({ target: value })}
          onBlur={onBlur}
        />
      </td>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.timeframe}
          onChange={(value) => onUpdate({ timeframe: value })}
          onBlur={onBlur}
        />
      </td>
      <td className="border-r border-border p-1">
        <Select
          value={row.type ?? NONE}
          onValueChange={(v) => onTypeChange(v === NONE ? null : v)}
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue>{(v: string) => (v === NONE ? "—" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {impactMeasureTypes.map((option) => (
              <SelectItem key={option.id} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.actual}
          onChange={(value) => onUpdate({ actual: value })}
          onBlur={onBlur}
        />
      </td>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.notes}
          onChange={(value) => onUpdate({ notes: value })}
          onBlur={onBlur}
        />
      </td>
      <td className="p-0 text-center">
        <button
          type="button"
          aria-label="Remove row"
          onClick={onRemove}
          className="mt-2 text-muted-foreground hover:text-destructive"
        >
          <X className="mx-auto size-3.5" />
        </button>
      </td>
    </>
  );
}

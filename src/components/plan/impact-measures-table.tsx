"use client";

import { Fragment, useRef, useState, useTransition } from "react";
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

interface ImpactMeasuresTableProps {
  planId: string;
  initialRows: ImpactMeasureRow[];
  initialGroups: OutcomeGroup[];
  impactMeasureTypes: LabeledOption[];
}

const NONE = "__none__";

function blankRow(groupId: string | null): ImpactMeasureRow {
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
  { key: "group", defaultWidth: 200 },
  { key: "measure", defaultWidth: 200 },
  { key: "baseline", defaultWidth: 120 },
  { key: "target", defaultWidth: 120 },
  { key: "timeframe", defaultWidth: 120 },
  { key: "type", defaultWidth: 116 },
  { key: "actual", defaultWidth: 160 },
  { key: "notes", defaultWidth: 200 },
];

export function ImpactMeasuresTable({
  planId,
  initialRows,
  initialGroups,
  impactMeasureTypes,
}: ImpactMeasuresTableProps) {
  const [rows, setRows] = useState<ImpactMeasureRow[]>(initialRows);
  const [groups, setGroups] = useState<OutcomeGroup[]>(initialGroups);
  // Mirror `rows`/`groups` synchronously (updated inside every setter below,
  // not via an effect) so onBlur/drop handlers always read the truly-latest
  // state even if they fire before React has re-rendered with a fresh
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<ImpactMeasureRow[]>(rows);
  const groupsRef = useRef<OutcomeGroup[]>(groups);
  const dragRowIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();
  const [isImporting, setIsImporting] = useState(false);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:impact-measures",
    COLUMN_WIDTHS
  );

  function persistRows(nextRows: ImpactMeasureRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    startTransition(async () => {
      try {
        await saveImpactMeasureRows(planId, nextRows);
      } catch {
        toast.error("Couldn't save the impact measures table.");
      }
    });
  }

  function persistGroups(nextGroups: OutcomeGroup[]) {
    groupsRef.current = nextGroups;
    setGroups(nextGroups);
    startTransition(async () => {
      try {
        await saveImpactOutcomeGroups(planId, nextGroups);
      } catch {
        toast.error("Couldn't save the outcome groups.");
      }
    });
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

  function addRow(groupId: string | null) {
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
      { id: crypto.randomUUID(), name: `Outcome group ${groupsRef.current.length + 1}`, description: "" },
    ]);
  }

  function removeGroup(id: string) {
    persistGroups(groupsRef.current.filter((g) => g.id !== id));
    // Non-destructive, same precedent as removing a 2A tag — rows lose the
    // group, they aren't deleted.
    persistRows(rowsRef.current.map((r) => (r.groupId === id ? { ...r, groupId: null } : r)));
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
  // group — reordering within a group and moving between groups are the
  // same gesture.
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

  // Dropping on a group's empty area / "+ Add measure" row appends the
  // dragged row to the end of that group (or ungroups it, for the final
  // section's footer).
  function handleDropOnGroup(groupId: string | null) {
    /* eslint-disable react-hooks/refs -- reading rowsRef.current here is the
       sanctioned case (inside an actual event handler, after preventDefault)
       — same pattern as handleDropOnRow just above, which the rule doesn't
       flag; this appears to be a false positive tied to the nullable
       `groupId` closure rather than real render-time ref access. */
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
    /* eslint-enable react-hooks/refs */
  }

  async function handleImport() {
    setIsImporting(true);
    try {
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
          groupId: null,
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

  const dataColSpan = 8; // measure, baseline, target, timeframe, type, actual, notes, delete
  const ungroupedRows = rows.filter((r) => r.groupId === null);

  return (
    <div className="space-y-3">
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

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: 28 }} />
            <col style={{ width: widths.group }} />
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
                isDragging={draggingKey === "group"}
                onPointerDown={handlePointerDown("group", 140)}
              >
                Group
              </ResizableTh>
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
            {groups.map((group) => {
              const groupRows = rows.filter((r) => r.groupId === group.id);
              return (
                <Fragment key={group.id}>
                  {groupRows.length === 0 ? (
                    <tr
                      className="border-b border-border align-top"
                      onDragOver={handleDragOver}
                      onDrop={handleDropOnGroup(group.id)}
                    >
                      <td />
                      <td className="border-r border-border p-1.5 align-top">
                        <GroupCell
                          group={group}
                          onUpdate={(updates) => updateGroup(group.id, updates)}
                          onBlur={commitGroups}
                          onRemove={() => removeGroup(group.id)}
                        />
                      </td>
                      <td
                        colSpan={dataColSpan}
                        className="p-2 text-xs text-muted-foreground italic"
                      >
                        No measures yet — drag one here, or add below.
                      </td>
                    </tr>
                  ) : (
                    groupRows.map((row, i) => (
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
                        {i === 0 && (
                          <td
                            rowSpan={groupRows.length}
                            className="border-r border-border p-1.5 align-top"
                          >
                            <GroupCell
                              group={group}
                              onUpdate={(updates) => updateGroup(group.id, updates)}
                              onBlur={commitGroups}
                              onRemove={() => removeGroup(group.id)}
                            />
                          </td>
                        )}
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
                    ))
                  )}
                  <tr
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnGroup(group.id)}
                  >
                    <td colSpan={10} className="p-0">
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
                </Fragment>
              );
            })}

            {ungroupedRows.map((row) => (
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
                <td className="border-r border-border bg-muted/20" />
                <MeasureCells
                  row={row}
                  impactMeasureTypes={impactMeasureTypes}
                  onUpdate={(updates) => updateRow(row.id, updates)}
                  onBlur={commitRows}
                  onTypeChange={(type) =>
                    persistRows(
                      rowsRef.current.map((r) => (r.id === row.id ? { ...r, type } : r))
                    )
                  }
                  onRemove={() => removeRow(row.id)}
                />
              </tr>
            ))}
            <tr onDragOver={handleDragOver} onDrop={handleDropOnGroup(null)}>
              <td colSpan={10} className="p-0">
                <button
                  type="button"
                  onClick={() => addRow(null)}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  New measure
                </button>
              </td>
            </tr>
            <tr>
              <td colSpan={10} className="border-t border-border p-0">
                <button
                  type="button"
                  onClick={addGroup}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  Add group
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupCell({
  group,
  onUpdate,
  onBlur,
  onRemove,
}: {
  group: OutcomeGroup;
  onUpdate: (updates: Partial<OutcomeGroup>) => void;
  onBlur: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-1">
        <EditableCell
          value={group.name}
          onChange={(value) => onUpdate({ name: value })}
          onBlur={onBlur}
          className="px-0 py-0 font-semibold"
        />
        <button
          type="button"
          aria-label={`Remove ${group.name || "group"}`}
          onClick={onRemove}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <EditableCell
        value={group.description}
        onChange={(value) => onUpdate({ description: value })}
        onBlur={onBlur}
        placeholder="Description…"
        className="px-0 py-0 text-xs text-muted-foreground"
      />
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

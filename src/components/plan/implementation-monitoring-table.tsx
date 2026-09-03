"use client";

import { useRef, useState } from "react";
import { GripVertical, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getStrategyRows,
  saveImplementationRowOrder,
  saveImplementationRows,
} from "@/app/(app)/plans/[id]/actions";
import type { ImplementationRow, SolutionStrategyRow } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { useSerializedSave } from "@/components/plan/use-serialized-save";

interface ImplementationMonitoringTableProps {
  planId: string;
  initialStrategyRows: SolutionStrategyRow[];
  initialRows: ImplementationRow[];
  initialOrder: string[];
}

type EditableKey =
  | "strategy"
  | "description"
  | "lead"
  | "timeframe"
  | "implementationIndicators"
  | "monitor";

function blankRow(id: string, strategyId: string | null): ImplementationRow {
  return {
    id,
    strategyId,
    strategy: "",
    description: "",
    lead: "",
    timeframe: "",
    implementationIndicators: "",
    monitor: "",
  };
}

const COLUMN_WIDTHS = [
  { key: "strategy", defaultWidth: 200 },
  { key: "description", defaultWidth: 220 },
  { key: "lead", defaultWidth: 140 },
  { key: "timeframe", defaultWidth: 140 },
  { key: "indicators", defaultWidth: 220 },
  { key: "monitor", defaultWidth: 220 },
];

export function ImplementationMonitoringTable({
  planId,
  initialStrategyRows,
  initialRows,
  initialOrder,
}: ImplementationMonitoringTableProps) {
  const [strategyRows, setStrategyRows] =
    useState<SolutionStrategyRow[]>(initialStrategyRows);
  const [rows, setRows] = useState<ImplementationRow[]>(initialRows);
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur handlers always read the truly-latest rows even if
  // the blur fires before React has re-rendered with a fresh `commitRows`
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<ImplementationRow[]>(rows);
  // Rows here are a mix of ones mirrored live from Stage 3B (which have no
  // storage of their own until touched) and standalone extra rows, so
  // neither array captures a user-chosen display order on its own — that
  // order is tracked separately as a flat list of row ids.
  const [order, setOrder] = useState<string[]>(initialOrder);
  const dragIndexRef = useRef<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:implementation-monitoring",
    COLUMN_WIDTHS
  );
  const save = useSerializedSave<ImplementationRow[]>(
    (nextRows) => saveImplementationRows(planId, nextRows),
    () => toast.error("Couldn't save the implementation & monitoring table.")
  );
  const saveOrder = useSerializedSave<string[]>(
    (nextOrder) => saveImplementationRowOrder(planId, nextOrder),
    () => toast.error("Couldn't save the row order.")
  );

  function persist(nextRows: ImplementationRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    save(nextRows);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const latest = await getStrategyRows(planId);
      setStrategyRows(latest);
      toast.success("Strategies updated from Stage 3B.");
    } catch {
      toast.error("Couldn't refresh strategies.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function updateField(rowId: string, strategyId: string | null, key: EditableKey, value: string) {
    setRows((prev) => {
      const existing = prev.find((r) => r.id === rowId);
      const next = existing
        ? prev.map((r) => (r.id === rowId ? { ...r, [key]: value } : r))
        : [...prev, { ...blankRow(rowId, strategyId), [key]: value }];
      rowsRef.current = next;
      return next;
    });
  }

  function commitRows() {
    persist(rowsRef.current);
  }

  function addExtraRow() {
    persist([...rowsRef.current, blankRow(crypto.randomUUID(), null)]);
  }

  function removeRow(rowId: string) {
    persist(rowsRef.current.filter((r) => r.id !== rowId));
  }

  const mirroredRows = strategyRows.map((strategy) => {
    const extra = rows.find((r) => r.strategyId === strategy.id);
    return {
      rowId: extra?.id ?? strategy.id,
      strategyId: strategy.id as string | null,
      strategyName: strategy.strategy,
      strategyDescription: strategy.description,
      editableStrategy: false,
      lead: extra?.lead ?? "",
      timeframe: extra?.timeframe ?? "",
      implementationIndicators: extra?.implementationIndicators ?? "",
      monitor: extra?.monitor ?? "",
    };
  });
  const extraRows = rows
    .filter((r) => r.strategyId === null)
    .map((r) => ({
      rowId: r.id,
      strategyId: null as string | null,
      strategyName: r.strategy,
      strategyDescription: r.description,
      editableStrategy: true,
      lead: r.lead,
      timeframe: r.timeframe,
      implementationIndicators: r.implementationIndicators,
      monitor: r.monitor,
    }));
  // Sort by the persisted order; anything not yet in it (a strategy added
  // in 3B since last reorder, or a brand-new extra row) sorts after
  // everything that is, keeping the mirrored-then-extra default order
  // among themselves since Array#sort is stable.
  const orderIndex = new Map(order.map((id, i) => [id, i]));
  const displayRows = [...mirroredRows, ...extraRows].sort((a, b) => {
    const ai = orderIndex.get(a.rowId) ?? Infinity;
    const bi = orderIndex.get(b.rowId) ?? Infinity;
    return ai - bi;
  });

  function handleDragStart(index: number) {
    return (e: React.DragEvent) => {
      dragIndexRef.current = index;
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(index: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragIndexRef.current;
      dragIndexRef.current = null;
      if (from === null || from === index) return;
      const next = [...displayRows];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      const nextOrder = next.map((r) => r.rowId);
      setOrder(nextOrder);
      saveOrder(nextOrder);
    };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Solution strategy / Description mirror Stage 3B — click Refresh to
          pull in any changes made there.
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={isRefreshing ? "size-3 animate-spin" : "size-3"} />
          Refresh strategies
        </Button>
      </div>

      {displayRows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add solution strategies on Stage 3B, or add one directly below.
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ width: widths.strategy }} />
              <col style={{ width: widths.description }} />
              <col style={{ width: widths.lead }} />
              <col style={{ width: widths.timeframe }} />
              <col style={{ width: widths.indicators }} />
              <col style={{ width: widths.monitor }} />
              <col style={{ width: 32 }} />
            </colgroup>
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b border-border" />
                <ResizableTh
                  isDragging={draggingKey === "strategy"}
                  onPointerDown={handlePointerDown("strategy", 120)}
                >
                  Solution strategy
                </ResizableTh>
                <ResizableTh
                  isDragging={draggingKey === "description"}
                  onPointerDown={handlePointerDown("description", 140)}
                >
                  Description
                </ResizableTh>
                <ResizableTh
                  isDragging={draggingKey === "lead"}
                  onPointerDown={handlePointerDown("lead", 100)}
                >
                  Lead
                </ResizableTh>
                <ResizableTh
                  isDragging={draggingKey === "timeframe"}
                  onPointerDown={handlePointerDown("timeframe", 100)}
                >
                  Timeframe
                </ResizableTh>
                <ResizableTh
                  isDragging={draggingKey === "indicators"}
                  onPointerDown={handlePointerDown("indicators", 140)}
                >
                  Implementation indicators
                </ResizableTh>
                <ResizableTh
                  isDragging={draggingKey === "monitor"}
                  onPointerDown={handlePointerDown("monitor", 140)}
                >
                  Monitor
                </ResizableTh>
                <th className="w-8 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr
                  key={row.rowId}
                  className="border-b border-border last:border-b-0"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(i)}
                >
                  <td className="p-0 text-center">
                    <button
                      type="button"
                      aria-label="Drag to reorder"
                      draggable
                      onDragStart={handleDragStart(i)}
                      className="mt-2 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="mx-auto size-3.5" />
                    </button>
                  </td>
                  <td className="border-r border-border p-0">
                    {row.editableStrategy ? (
                      <EditableCell
                        value={row.strategyName}
                        onChange={(value) =>
                          updateField(row.rowId, row.strategyId, "strategy", value)
                        }
                        onBlur={commitRows}
                      />
                    ) : (
                      <div className="px-2 py-1.5 text-muted-foreground">
                        {row.strategyName || "—"}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-border p-0">
                    {row.editableStrategy ? (
                      <EditableCell
                        value={row.strategyDescription}
                        onChange={(value) =>
                          updateField(row.rowId, row.strategyId, "description", value)
                        }
                        onBlur={commitRows}
                      />
                    ) : (
                      <div className="px-2 py-1.5 text-muted-foreground">
                        {row.strategyDescription || "—"}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-border p-0">
                    <EditableCell
                      value={row.lead}
                      onChange={(value) => updateField(row.rowId, row.strategyId, "lead", value)}
                      onBlur={commitRows}
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <EditableCell
                      value={row.timeframe}
                      onChange={(value) =>
                        updateField(row.rowId, row.strategyId, "timeframe", value)
                      }
                      onBlur={commitRows}
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <EditableCell
                      value={row.implementationIndicators}
                      onChange={(value) =>
                        updateField(row.rowId, row.strategyId, "implementationIndicators", value)
                      }
                      onBlur={commitRows}
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <EditableCell
                      value={row.monitor}
                      onChange={(value) =>
                        updateField(row.rowId, row.strategyId, "monitor", value)
                      }
                      onBlur={commitRows}
                    />
                  </td>
                  <td className="p-0 text-center">
                    {row.strategyId === null && (
                      <button
                        type="button"
                        aria-label="Remove row"
                        onClick={() => removeRow(row.rowId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="mx-auto size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} className="p-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addExtraRow}
                    className="flex w-full items-center justify-start gap-1.5 rounded-none text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    Add solution strategy
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
    </div>
  );
}

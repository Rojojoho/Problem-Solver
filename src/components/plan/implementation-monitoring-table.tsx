"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveImplementationRows } from "@/app/plans/[id]/actions";
import type { ImplementationRow, SolutionStrategyRow } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";

interface ImplementationMonitoringTableProps {
  planId: string;
  strategyRows: SolutionStrategyRow[];
  initialRows: ImplementationRow[];
}

const EMPTY_EXTRA: Omit<ImplementationRow, "strategyId"> = {
  lead: "",
  timeframe: "",
  implementationIndicators: "",
  monitor: "",
};

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
  strategyRows,
  initialRows,
}: ImplementationMonitoringTableProps) {
  const [extras, setExtras] = useState<ImplementationRow[]>(initialRows);
  const [, startTransition] = useTransition();
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:implementation-monitoring",
    COLUMN_WIDTHS
  );

  function persist(nextExtras: ImplementationRow[]) {
    setExtras(nextExtras);
    startTransition(async () => {
      try {
        await saveImplementationRows(planId, nextExtras);
      } catch {
        toast.error("Couldn't save the implementation & monitoring table.");
      }
    });
  }

  function updateExtra(
    strategyId: string,
    key: keyof Omit<ImplementationRow, "strategyId">,
    value: string
  ) {
    setExtras((prev) => {
      const existing = prev.find((e) => e.strategyId === strategyId);
      if (existing) {
        return prev.map((e) =>
          e.strategyId === strategyId ? { ...e, [key]: value } : e
        );
      }
      return [...prev, { strategyId, ...EMPTY_EXTRA, [key]: value }];
    });
  }

  function commitExtras() {
    persist(extras);
  }

  if (strategyRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add solution strategies on Stage 3B first — this table mirrors them.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: widths.strategy }} />
          <col style={{ width: widths.description }} />
          <col style={{ width: widths.lead }} />
          <col style={{ width: widths.timeframe }} />
          <col style={{ width: widths.indicators }} />
          <col style={{ width: widths.monitor }} />
        </colgroup>
        <thead>
          <tr className="bg-muted/50">
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
              className="border-r-0"
            >
              Monitor
            </ResizableTh>
          </tr>
        </thead>
        <tbody>
          {strategyRows.map((strategy) => {
            const extra = extras.find((e) => e.strategyId === strategy.id);
            return (
              <tr key={strategy.id} className="border-b border-border last:border-b-0">
                <td className="border-r border-border px-2 py-1.5 text-muted-foreground">
                  {strategy.strategy || "—"}
                </td>
                <td className="border-r border-border px-2 py-1.5 text-muted-foreground">
                  {strategy.description || "—"}
                </td>
                <td className="border-r border-border p-0">
                  <EditableCell
                    value={extra?.lead ?? ""}
                    onChange={(value) => updateExtra(strategy.id, "lead", value)}
                    onBlur={commitExtras}
                  />
                </td>
                <td className="border-r border-border p-0">
                  <EditableCell
                    value={extra?.timeframe ?? ""}
                    onChange={(value) => updateExtra(strategy.id, "timeframe", value)}
                    onBlur={commitExtras}
                  />
                </td>
                <td className="border-r border-border p-0">
                  <EditableCell
                    value={extra?.implementationIndicators ?? ""}
                    onChange={(value) =>
                      updateExtra(strategy.id, "implementationIndicators", value)
                    }
                    onBlur={commitExtras}
                  />
                </td>
                <td className="p-0">
                  <EditableCell
                    value={extra?.monitor ?? ""}
                    onChange={(value) => updateExtra(strategy.id, "monitor", value)}
                    onBlur={commitExtras}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSolutionStrategyRows } from "@/app/plans/[id]/actions";
import type { LabeledOption, SolutionStrategyRow } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";

interface SolutionStrategiesTableProps {
  planId: string;
  initialRows: SolutionStrategyRow[];
  strategyStatuses: LabeledOption[];
}

const NONE = "__none__";

const EMPTY_ROW: Omit<SolutionStrategyRow, "id"> = {
  strategy: "",
  description: "",
  theoryOfAction: "",
  status: null,
};

const COLUMN_WIDTHS = [
  { key: "strategy", defaultWidth: 220 },
  { key: "description", defaultWidth: 260 },
  { key: "theoryOfAction", defaultWidth: 260 },
  { key: "status", defaultWidth: 140 },
];

export function SolutionStrategiesTable({
  planId,
  initialRows,
  strategyStatuses,
}: SolutionStrategiesTableProps) {
  const [rows, setRows] = useState<SolutionStrategyRow[]>(initialRows);
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur/onValueChange handlers always read the truly-latest
  // rows even if they fire before React has re-rendered with a fresh
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<SolutionStrategyRow[]>(rows);
  const [, startTransition] = useTransition();
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:solution-strategies",
    COLUMN_WIDTHS
  );

  function persist(nextRows: SolutionStrategyRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    startTransition(async () => {
      try {
        await saveSolutionStrategyRows(planId, nextRows);
      } catch {
        toast.error("Couldn't save the solution strategies table.");
      }
    });
  }

  function updateCell(
    index: number,
    key: "strategy" | "description" | "theoryOfAction",
    value: string
  ) {
    setRows((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, [key]: value } : row));
      rowsRef.current = next;
      return next;
    });
  }

  function commitRows() {
    persist(rowsRef.current);
  }

  function addRow() {
    persist([...rowsRef.current, { ...EMPTY_ROW, id: crypto.randomUUID() }]);
  }

  function removeRow(index: number) {
    persist(rowsRef.current.filter((_, i) => i !== index));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: widths.strategy }} />
          <col style={{ width: widths.description }} />
          <col style={{ width: widths.theoryOfAction }} />
          <col style={{ width: widths.status }} />
          <col style={{ width: 32 }} />
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
              isDragging={draggingKey === "theoryOfAction"}
              onPointerDown={handlePointerDown("theoryOfAction", 140)}
            >
              Theory of Action
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "status"}
              onPointerDown={handlePointerDown("status", 100)}
            >
              Status
            </ResizableTh>
            <th className="w-8 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-b border-border align-top last:border-b-0">
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.strategy}
                  onChange={(value) => updateCell(i, "strategy", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.description}
                  onChange={(value) => updateCell(i, "description", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.theoryOfAction}
                  onChange={(value) => updateCell(i, "theoryOfAction", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-1">
                <Select
                  value={row.status ?? NONE}
                  onValueChange={(v: string | null) =>
                    persist(
                      rowsRef.current.map((r, idx) =>
                        idx === i ? { ...r, status: v === NONE ? null : v } : r
                      )
                    )
                  }
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue>{(v: string) => (v === NONE ? "—" : v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {strategyStatuses.map((option) => (
                      <SelectItem key={option.id} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-0 text-center">
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => removeRow(i)}
                  className="mt-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="mx-auto size-3.5" />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} className="p-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRow}
                className="flex w-full items-center justify-start gap-1.5 rounded-none text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
                New solution strategy
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

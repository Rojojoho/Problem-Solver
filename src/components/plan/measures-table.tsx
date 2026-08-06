"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { saveMeasureRows } from "@/app/plans/[id]/actions";
import type { MeasureRow } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";

interface MeasuresTableProps {
  planId: string;
  initialRows: MeasureRow[];
}

const EMPTY_ROW: MeasureRow = { measure: "", baseline: "", target: "", notes: "" };

const COLUMNS: { key: keyof MeasureRow; label: string }[] = [
  { key: "measure", label: "Measure" },
  { key: "baseline", label: "Baseline" },
  { key: "target", label: "Target" },
  { key: "notes", label: "Notes" },
];

export function MeasuresTable({ planId, initialRows }: MeasuresTableProps) {
  const [rows, setRows] = useState<MeasureRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  function persist(nextRows: MeasureRow[]) {
    setRows(nextRows);
    startTransition(async () => {
      try {
        await saveMeasureRows(planId, nextRows);
      } catch {
        toast.error("Couldn't save the measures table.");
      }
    });
  }

  function updateCell(index: number, key: keyof MeasureRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function commitRows() {
    persist(rows);
  }

  function addRow() {
    persist([...rows, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    persist(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="border-b border-r border-border px-2 py-1.5 text-left font-semibold last:border-r-0"
              >
                {col.label}
              </th>
            ))}
            <th className="w-8 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-b-0">
              {COLUMNS.map((col) => (
                <td key={col.key} className="border-r border-border p-0 last:border-r-0">
                  <input
                    value={row[col.key]}
                    onChange={(e) => updateCell(i, col.key, e.target.value)}
                    onBlur={commitRows}
                    className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
                  />
                </td>
              ))}
              <td className="p-0 text-center">
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => removeRow(i)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="mx-auto size-3.5" />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={COLUMNS.length + 1} className="p-0">
              <button
                type="button"
                onClick={addRow}
                disabled={isPending}
                className={cn(
                  "flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground",
                  "hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Plus className="size-3.5" />
                New measure
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

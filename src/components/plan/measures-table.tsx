"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { saveMeasureRows } from "@/app/(app)/plans/[id]/actions";
import type { MeasureRow } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { useSerializedSave } from "@/components/plan/use-serialized-save";

interface MeasuresTableProps {
  planId: string;
  initialRows: MeasureRow[];
}

const EMPTY_ROW: MeasureRow = { measure: "", baseline: "", target: "", notes: "" };

const COLUMNS: { key: keyof MeasureRow; label: string; defaultWidth: number }[] = [
  { key: "measure", label: "Measure", defaultWidth: 220 },
  { key: "baseline", label: "Baseline", defaultWidth: 140 },
  { key: "target", label: "Target", defaultWidth: 140 },
  { key: "notes", label: "Notes", defaultWidth: 220 },
];

export function MeasuresTable({ planId, initialRows }: MeasuresTableProps) {
  const [rows, setRows] = useState<MeasureRow[]>(initialRows);
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur handlers always read the truly-latest rows even if
  // the blur fires before React has re-rendered with a fresh `commitRows`
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<MeasureRow[]>(rows);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:measures",
    COLUMNS.map(({ key, defaultWidth }) => ({ key, defaultWidth }))
  );
  const save = useSerializedSave<MeasureRow[]>(
    (nextRows) => saveMeasureRows(planId, nextRows),
    () => toast.error("Couldn't save the measures table.")
  );

  function persist(nextRows: MeasureRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    save(nextRows);
  }

  function updateCell(index: number, key: keyof MeasureRow, value: string) {
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
    persist([...rowsRef.current, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    persist(rowsRef.current.filter((_, i) => i !== index));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.key} style={{ width: widths[col.key] }} />
          ))}
          <col style={{ width: 32 }} />
        </colgroup>
        <thead>
          <tr className="bg-muted/50">
            {COLUMNS.map((col) => (
              <ResizableTh
                key={col.key}
                isDragging={draggingKey === col.key}
                onPointerDown={handlePointerDown(col.key, 80)}
              >
                {col.label}
              </ResizableTh>
            ))}
            <th className="border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-b-0">
              {COLUMNS.map((col) => (
                <td key={col.key} className="border-r border-border p-0 last:border-r-0">
                  <EditableCell
                    value={row[col.key]}
                    onChange={(value) => updateCell(i, col.key, value)}
                    onBlur={commitRows}
                  />
                </td>
              ))}
              <td className="p-0 text-center">
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => removeRow(i)}
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

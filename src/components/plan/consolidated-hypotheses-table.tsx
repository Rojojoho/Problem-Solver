"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveConsolidatedHypothesisRows } from "@/app/plans/[id]/actions";
import type { ConsolidatedHypothesisRow } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";

interface ConsolidatedHypothesesTableProps {
  planId: string;
  initialRows: ConsolidatedHypothesisRow[];
}

const EMPTY_ROW: ConsolidatedHypothesisRow = {
  id: "",
  hypothesis: "",
  validityTest: "",
  confirmed: null,
  notes: "",
};

const COLUMN_WIDTHS = [
  { key: "hypothesis", defaultWidth: 280 },
  { key: "validityTest", defaultWidth: 240 },
  { key: "result", defaultWidth: 220 },
];

export function ConsolidatedHypothesesTable({
  planId,
  initialRows,
}: ConsolidatedHypothesesTableProps) {
  const [rows, setRows] = useState<ConsolidatedHypothesisRow[]>(initialRows);
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur handlers always read the truly-latest rows even if
  // the blur fires before React has re-rendered with a fresh `commitRows`
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<ConsolidatedHypothesisRow[]>(rows);
  const [, startTransition] = useTransition();
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:consolidated-hypotheses",
    COLUMN_WIDTHS
  );

  function persist(nextRows: ConsolidatedHypothesisRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    startTransition(async () => {
      try {
        await saveConsolidatedHypothesisRows(planId, nextRows);
      } catch {
        toast.error("Couldn't save the consolidated hypotheses table.");
      }
    });
  }

  function updateCell(
    index: number,
    key: "hypothesis" | "validityTest" | "notes",
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

  function setConfirmed(index: number, confirmed: boolean) {
    persist(
      rowsRef.current.map((row, i) =>
        i === index
          ? { ...row, confirmed: row.confirmed === confirmed ? null : confirmed }
          : row
      )
    );
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
          <col style={{ width: widths.hypothesis }} />
          <col style={{ width: widths.validityTest }} />
          <col style={{ width: widths.result }} />
          <col style={{ width: 32 }} />
        </colgroup>
        <thead>
          <tr className="bg-muted/50">
            <ResizableTh
              isDragging={draggingKey === "hypothesis"}
              onPointerDown={handlePointerDown("hypothesis", 140)}
            >
              Causal hypothesis
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "validityTest"}
              onPointerDown={handlePointerDown("validityTest", 140)}
            >
              Validity test
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "result"}
              onPointerDown={handlePointerDown("result", 140)}
            >
              Result
            </ResizableTh>
            <th className="w-8 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.hypothesis}
                  onChange={(value) => updateCell(i, "hypothesis", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.validityTest}
                  onChange={(value) => updateCell(i, "validityTest", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmed(i, true)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                      row.confirmed === true
                        ? "border-success bg-success/15 text-success"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmed(i, false)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                      row.confirmed === false
                        ? "border-destructive bg-destructive/15 text-destructive"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Not confirmed
                  </button>
                </div>
                <EditableCell
                  value={row.notes}
                  onChange={(value) => updateCell(i, "notes", value)}
                  onBlur={commitRows}
                  placeholder="Notes…"
                  className="mt-1.5 px-1 py-1 text-xs"
                />
              </td>
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
            <td colSpan={4} className="p-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRow}
                className="flex w-full items-center justify-start gap-1.5 rounded-none text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
                New hypothesis
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

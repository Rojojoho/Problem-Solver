"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveConsolidatedHypothesisRows } from "@/app/plans/[id]/actions";
import type { ConsolidatedHypothesisRow } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";

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

export function ConsolidatedHypothesesTable({
  planId,
  initialRows,
}: ConsolidatedHypothesesTableProps) {
  const [rows, setRows] = useState<ConsolidatedHypothesisRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  function persist(nextRows: ConsolidatedHypothesisRow[]) {
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
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  function commitRows() {
    persist(rows);
  }

  function setConfirmed(index: number, confirmed: boolean) {
    persist(
      rows.map((row, i) =>
        i === index
          ? { ...row, confirmed: row.confirmed === confirmed ? null : confirmed }
          : row
      )
    );
  }

  function addRow() {
    persist([...rows, { ...EMPTY_ROW, id: crypto.randomUUID() }]);
  }

  function removeRow(index: number) {
    persist(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              Causal hypothesis
            </th>
            <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              Validity test
            </th>
            <th className="border-b border-border px-2 py-1.5 text-left font-semibold">
              Result
            </th>
            <th className="w-8 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="border-r border-border p-0">
                <input
                  value={row.hypothesis}
                  onChange={(e) => updateCell(i, "hypothesis", e.target.value)}
                  onBlur={commitRows}
                  className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
                />
              </td>
              <td className="border-r border-border p-0">
                <input
                  value={row.validityTest}
                  onChange={(e) => updateCell(i, "validityTest", e.target.value)}
                  onBlur={commitRows}
                  className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
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
                <input
                  value={row.notes}
                  onChange={(e) => updateCell(i, "notes", e.target.value)}
                  onBlur={commitRows}
                  placeholder="Notes…"
                  className="mt-1.5 w-full bg-transparent px-1 py-1 text-xs outline-none focus:bg-muted/30"
                />
              </td>
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
            <td colSpan={4} className="p-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRow}
                disabled={isPending}
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

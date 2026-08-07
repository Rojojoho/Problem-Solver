"use client";

import { useState, useTransition } from "react";
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

export function SolutionStrategiesTable({
  planId,
  initialRows,
  strategyStatuses,
}: SolutionStrategiesTableProps) {
  const [rows, setRows] = useState<SolutionStrategyRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  function persist(nextRows: SolutionStrategyRow[]) {
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
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  function commitRows() {
    persist(rows);
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
              Solution strategy
            </th>
            <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              Description
            </th>
            <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              Theory of Action
            </th>
            <th className="w-32 border-b border-border px-2 py-1.5 text-left font-semibold">
              Status
            </th>
            <th className="w-8 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-b border-border align-top last:border-b-0">
              <td className="border-r border-border p-0">
                <input
                  value={row.strategy}
                  onChange={(e) => updateCell(i, "strategy", e.target.value)}
                  onBlur={commitRows}
                  className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
                />
              </td>
              <td className="border-r border-border p-0">
                <input
                  value={row.description}
                  onChange={(e) => updateCell(i, "description", e.target.value)}
                  onBlur={commitRows}
                  className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
                />
              </td>
              <td className="border-r border-border p-0">
                <input
                  value={row.theoryOfAction}
                  onChange={(e) => updateCell(i, "theoryOfAction", e.target.value)}
                  onBlur={commitRows}
                  className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
                />
              </td>
              <td className="border-r border-border p-1">
                <Select
                  value={row.status ?? NONE}
                  onValueChange={(v: string | null) =>
                    persist(
                      rows.map((r, idx) =>
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
                  disabled={isPending}
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
                disabled={isPending}
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

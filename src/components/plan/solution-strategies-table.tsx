"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getSolutionRequirementShortIds,
  saveSolutionStrategyRows,
} from "@/app/plans/[id]/actions";
import type { SolutionStrategyRow } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";

interface SolutionStrategiesTableProps {
  planId: string;
  initialRows: SolutionStrategyRow[];
}

const EMPTY_ROW: Omit<SolutionStrategyRow, "id"> = {
  strategy: "",
  description: "",
  theoryOfAction: "",
  links: [],
};

const COLUMN_WIDTHS = [
  { key: "strategy", defaultWidth: 200 },
  { key: "description", defaultWidth: 240 },
  { key: "theoryOfAction", defaultWidth: 240 },
  { key: "link", defaultWidth: 180 },
];

// Old rows lack `links` (added after Status was removed) — default it on read.
function normalizeRows(rows: SolutionStrategyRow[]): SolutionStrategyRow[] {
  return rows.map((row) => ({ ...row, links: row.links ?? [] }));
}

export function SolutionStrategiesTable({
  planId,
  initialRows,
}: SolutionStrategiesTableProps) {
  const [rows, setRows] = useState<SolutionStrategyRow[]>(() => normalizeRows(initialRows));
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

  function toggleLink(id: string, link: string, checked: boolean) {
    persist(
      rowsRef.current.map((r) => {
        if (r.id !== id) return r;
        const has = r.links.includes(link);
        if (checked === has) return r;
        return { ...r, links: checked ? [...r.links, link] : r.links.filter((l) => l !== link) };
      })
    );
  }

  function removeLink(id: string, link: string) {
    persist(
      rowsRef.current.map((r) =>
        r.id === id ? { ...r, links: r.links.filter((l) => l !== link) } : r
      )
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: widths.strategy }} />
          <col style={{ width: widths.description }} />
          <col style={{ width: widths.theoryOfAction }} />
          <col style={{ width: widths.link }} />
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
              isDragging={draggingKey === "link"}
              onPointerDown={handlePointerDown("link", 110)}
            >
              Link
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
              <td className="border-r border-border p-1.5">
                <LinkPicker
                  planId={planId}
                  row={row}
                  onToggle={(link, checked) => toggleLink(row.id, link, checked)}
                  onRemove={(link) => removeLink(row.id, link)}
                />
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

function LinkPicker({
  planId,
  row,
  onToggle,
  onRemove,
}: {
  planId: string;
  row: SolutionStrategyRow;
  onToggle: (link: string, checked: boolean) => void;
  onRemove: (link: string) => void;
}) {
  // 3A's short IDs are fetched live every time the dropdown opens rather
  // than through a cached bundle prop — a cached list would go stale the
  // moment 3A adds/renames a requirement after this stage was visited (same
  // reasoning as 3A's own cause/measure suggestion picker).
  const [shortIds, setShortIds] = useState<string[]>([]);

  return (
    <div className="space-y-1.5">
      {row.links.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.links.map((link) => (
            <Badge key={link} variant="outline" className="gap-1">
              {link}
              <button
                type="button"
                aria-label={`Remove ${link} link`}
                onClick={() => onRemove(link)}
                className="ml-0.5 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) return;
          getSolutionRequirementShortIds(planId)
            .then(setShortIds)
            .catch(() => {
              // Keep showing whatever we already had.
            });
        }}
      >
        <DropdownMenuTrigger
          render={
            <Button type="button" size="xs" variant="outline" className="w-full">
              Link to requirement…
            </Button>
          }
        />
        <DropdownMenuContent>
          {shortIds.length ? (
            shortIds.map((id) => (
              <DropdownMenuCheckboxItem
                key={id}
                checked={row.links.includes(id)}
                onCheckedChange={(checked) => onToggle(id, checked === true)}
              >
                {id}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <DropdownMenuItem disabled>No 3A requirements yet</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

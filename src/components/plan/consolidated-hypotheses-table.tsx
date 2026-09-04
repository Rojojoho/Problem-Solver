"use client";

import { useRef, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
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
  getKnowledgeLinkOptions,
  saveConsolidatedHypothesisRows,
} from "@/app/(app)/plans/[id]/actions";
import type { ConsolidatedHypothesisRow, KnowledgeLinkOption } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { useSerializedSave } from "@/components/plan/use-serialized-save";

interface ConsolidatedHypothesesTableProps {
  planId: string;
  initialRows: ConsolidatedHypothesisRow[];
  onDataChanged?: () => void;
}

const EMPTY_ROW: ConsolidatedHypothesisRow = {
  id: "",
  hypothesis: "",
  description: "",
  validityTest: "",
  confirmed: null,
  notes: "",
  knowledgeLinks: [],
};

const COLUMN_WIDTHS = [
  { key: "hypothesis", defaultWidth: 220 },
  { key: "description", defaultWidth: 320 },
  { key: "validityTest", defaultWidth: 200 },
  { key: "result", defaultWidth: 200 },
];

export function ConsolidatedHypothesesTable({
  planId,
  initialRows,
  onDataChanged,
}: ConsolidatedHypothesesTableProps) {
  const [rows, setRows] = useState<ConsolidatedHypothesisRow[]>(() =>
    initialRows.map((row) => ({
      ...row,
      description: row.description ?? "",
      knowledgeLinks: row.knowledgeLinks ?? [],
    }))
  );
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur handlers always read the truly-latest rows even if
  // the blur fires before React has re-rendered with a fresh `commitRows`
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<ConsolidatedHypothesisRow[]>(rows);
  const dragIndexRef = useRef<number | null>(null);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:consolidated-hypotheses",
    COLUMN_WIDTHS
  );
  const save = useSerializedSave<ConsolidatedHypothesisRow[]>(
    async (nextRows) => {
      await saveConsolidatedHypothesisRows(planId, nextRows);
      onDataChanged?.();
    },
    () => toast.error("Couldn't save the consolidated hypotheses table.")
  );

  function persist(nextRows: ConsolidatedHypothesisRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    save(nextRows);
  }

  function updateCell(
    index: number,
    key: "hypothesis" | "description" | "validityTest" | "notes",
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

  function toggleKnowledgeLink(index: number, knowledgeId: string, checked: boolean) {
    persist(
      rowsRef.current.map((row, i) => {
        if (i !== index) return row;
        const has = row.knowledgeLinks.includes(knowledgeId);
        if (checked === has) return row;
        return {
          ...row,
          knowledgeLinks: checked
            ? [...row.knowledgeLinks, knowledgeId]
            : row.knowledgeLinks.filter((id) => id !== knowledgeId),
        };
      })
    );
  }

  function addRow() {
    persist([...rowsRef.current, { ...EMPTY_ROW, id: crypto.randomUUID() }]);
  }

  function removeRow(index: number) {
    persist(rowsRef.current.filter((_, i) => i !== index));
  }

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
      const next = [...rowsRef.current];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      persist(next);
    };
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: 28 }} />
          <col style={{ width: widths.hypothesis }} />
          <col style={{ width: widths.description }} />
          <col style={{ width: widths.validityTest }} />
          <col style={{ width: widths.result }} />
          <col style={{ width: 32 }} />
        </colgroup>
        <thead>
          <tr className="bg-muted/50">
            <th className="border-b border-border" />
            <ResizableTh
              isDragging={draggingKey === "hypothesis"}
              onPointerDown={handlePointerDown("hypothesis", 140)}
            >
              Causal hypothesis
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "description"}
              onPointerDown={handlePointerDown("description", 140)}
            >
              Description
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
            <tr
              key={row.id}
              className="border-b border-border last:border-b-0"
              onDragOver={handleDragOver}
              onDrop={handleDrop(i)}
            >
              <td className="p-0 text-center align-top">
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
              <td className="border-r border-border p-0 align-top">
                <EditableCell
                  value={row.hypothesis}
                  onChange={(value) => updateCell(i, "hypothesis", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-0 align-top">
                <EditableCell
                  value={row.description}
                  onChange={(value) => updateCell(i, "description", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-0 align-top">
                <EditableCell
                  value={row.validityTest}
                  onChange={(value) => updateCell(i, "validityTest", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-1.5 align-top">
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
                    Disconfirmed
                  </button>
                </div>
                <EditableCell
                  value={row.notes}
                  onChange={(value) => updateCell(i, "notes", value)}
                  onBlur={commitRows}
                  placeholder="Notes…"
                  className="mt-1.5 px-1 py-1 text-xs"
                />
                <KnowledgeLinksCell
                  planId={planId}
                  knowledgeLinks={row.knowledgeLinks}
                  onToggle={(knowledgeId, checked) =>
                    toggleKnowledgeLink(i, knowledgeId, checked)
                  }
                />
              </td>
              <td className="p-1 text-center align-top">
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
            <td colSpan={6} className="p-0">
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

// Evidence (or any other Knowledge item) backing this row's
// Confirmed/Disconfirmed call — a plain id list into the same school-wide
// pool as 3A/3B's Link columns, rendered as a small badge row under Notes.
function KnowledgeLinksCell({
  planId,
  knowledgeLinks,
  onToggle,
}: {
  planId: string;
  knowledgeLinks: string[];
  onToggle: (knowledgeId: string, checked: boolean) => void;
}) {
  const [options, setOptions] = useState<KnowledgeLinkOption[]>([]);
  const optionById = new Map(options.map((o) => [o.id, o]));

  return (
    <div className="mt-1.5 space-y-1">
      {knowledgeLinks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {knowledgeLinks.map((id) => {
            const option = optionById.get(id);
            return (
              <Badge
                key={id}
                variant="outline"
                className="h-auto max-w-full items-start gap-1 py-0.5 text-xs whitespace-normal break-words"
              >
                <span className={cn("min-w-0", !option && "text-muted-foreground italic")}>
                  {option?.title ?? "Deleted item"}
                </span>
                <button
                  type="button"
                  aria-label="Remove knowledge link"
                  onClick={() => onToggle(id, false)}
                  className="ml-0.5 shrink-0 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) return;
          getKnowledgeLinkOptions(planId)
            .then(setOptions)
            .catch(() => {
              // Keep showing whatever we already had.
            });
        }}
      >
        <DropdownMenuTrigger
          render={
            <Button type="button" size="xs" variant="ghost" className="h-6 px-1.5 text-xs">
              <Plus className="size-3" />
              Knowledge
            </Button>
          }
        />
        <DropdownMenuContent className="text-xs">
          {options.length ? (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                className="text-xs"
                checked={knowledgeLinks.includes(option.id)}
                onCheckedChange={(checked) => onToggle(option.id, checked === true)}
              >
                {option.title}
                {option.sourcePlanName && ` (${option.sourcePlanName})`}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs">
              No knowledge yet
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

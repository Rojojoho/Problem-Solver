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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getKnowledgeLinkOptions,
  getSolutionRequirementOptions,
  saveSolutionStrategyRows,
} from "@/app/(app)/plans/[id]/actions";
import type { KnowledgeLinkOption, LinkRef, SolutionStrategyRow } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { StrategyTraceabilityDialog } from "@/components/plan/strategy-traceability-dialog";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { useSerializedSave } from "@/components/plan/use-serialized-save";
import { cn } from "@/lib/utils";

interface SolutionStrategiesTableProps {
  planId: string;
  initialRows: SolutionStrategyRow[];
  requirementOptions: { id: string; label: string }[];
}

const EMPTY_ROW: Omit<SolutionStrategyRow, "id"> = {
  strategy: "",
  description: "",
  links: [],
};

const COLUMN_WIDTHS = [
  { key: "strategy", defaultWidth: 220 },
  { key: "description", defaultWidth: 300 },
  { key: "link", defaultWidth: 220 },
];

// Old rows lack `links`, or have it as plain strings from before ref/text
// links existed — normalize both on read. A legacy plain string becomes a
// dangling ref-less "text" link so nothing silently disappears; going
// forward 3B only ever produces `ref` links (its dropdown is picks-only).
function normalizeRows(rows: SolutionStrategyRow[]): SolutionStrategyRow[] {
  return rows.map((row) => ({
    ...row,
    links: (row.links ?? []).map((link) =>
      typeof link === "string" ? { type: "text", value: link } : link
    ),
  }));
}

export function SolutionStrategiesTable({
  planId,
  initialRows,
  requirementOptions,
}: SolutionStrategiesTableProps) {
  const [rows, setRows] = useState<SolutionStrategyRow[]>(() => normalizeRows(initialRows));
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur/onValueChange handlers always read the truly-latest
  // rows even if they fire before React has re-rendered with a fresh
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<SolutionStrategyRow[]>(rows);
  const dragIndexRef = useRef<number | null>(null);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:solution-strategies",
    COLUMN_WIDTHS
  );
  const save = useSerializedSave<SolutionStrategyRow[]>(
    (nextRows) => saveSolutionStrategyRows(planId, nextRows),
    () => toast.error("Couldn't save the solution strategies table.")
  );

  function persist(nextRows: SolutionStrategyRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    save(nextRows);
  }

  function updateCell(index: number, key: "strategy" | "description", value: string) {
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

  function linkMatches(l: LinkRef, link: LinkRef): boolean {
    return (
      (l.type === "ref" && link.type === "ref" && l.targetId === link.targetId) ||
      (l.type === "knowledge" && link.type === "knowledge" && l.knowledgeId === link.knowledgeId)
    );
  }

  function toggleLink(id: string, link: LinkRef, checked: boolean) {
    persist(
      rowsRef.current.map((r) => {
        if (r.id !== id) return r;
        const has = r.links.some((l) => linkMatches(l, link));
        if (checked === has) return r;
        return {
          ...r,
          links: checked ? [...r.links, link] : r.links.filter((l) => !linkMatches(l, link)),
        };
      })
    );
  }

  function removeLink(id: string, index: number) {
    persist(
      rowsRef.current.map((r) =>
        r.id === id ? { ...r, links: r.links.filter((_, i) => i !== index) } : r
      )
    );
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
          <col style={{ width: widths.strategy }} />
          <col style={{ width: widths.description }} />
          <col style={{ width: widths.link }} />
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
            <tr
              key={row.id}
              className="border-b border-border align-top last:border-b-0"
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
              <td className="relative border-r border-border p-0">
                <EditableCell
                  value={row.strategy}
                  onChange={(value) => updateCell(i, "strategy", value)}
                  onBlur={commitRows}
                  className="pr-7"
                />
                <div className="absolute top-1 right-1">
                  <StrategyTraceabilityDialog
                    planId={planId}
                    strategyId={row.id}
                    strategyLabel={row.strategy}
                  />
                </div>
              </td>
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.description}
                  onChange={(value) => updateCell(i, "description", value)}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-1.5">
                <LinkPicker
                  planId={planId}
                  row={row}
                  requirementOptions={requirementOptions}
                  onToggle={(link, checked) => toggleLink(row.id, link, checked)}
                  onRemove={(index) => removeLink(row.id, index)}
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
  requirementOptions,
  onToggle,
  onRemove,
}: {
  planId: string;
  row: SolutionStrategyRow;
  requirementOptions: { id: string; label: string }[];
  onToggle: (link: LinkRef, checked: boolean) => void;
  onRemove: (index: number) => void;
}) {
  // 3A's current requirements are fetched live every time the dropdown
  // opens rather than trusting a cached bundle prop — a cached list would
  // go stale the moment 3A adds/renames/removes a requirement after this
  // stage was visited. Starts from the SSR-provided prop so already-linked
  // badges below can resolve their current label even before the dropdown
  // has ever been opened.
  const [liveOptions, setLiveOptions] = useState<{ id: string; label: string }[] | null>(
    null
  );
  const options = liveOptions ?? requirementOptions;
  const labelById = new Map(options.map((o) => [o.id, o.label]));
  // The Knowledge pool has no SSR-provided prop to seed from — it starts
  // empty and is only populated once the dropdown is opened.
  const [knowledgeOptions, setKnowledgeOptions] = useState<KnowledgeLinkOption[]>([]);
  const knowledgeById = new Map(knowledgeOptions.map((k) => [k.id, k]));

  // Measured from the cell itself rather than the column's nominal width —
  // table-fixed still stretches columns proportionally to fill any extra
  // table width beyond the colgroup's specified totals, so the rendered
  // cell is usually wider than the raw column-width value.
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuWidth, setMenuWidth] = useState<number | null>(null);

  return (
    <div ref={containerRef} className="space-y-1.5">
      {row.links.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.links.map((link, index) => {
            const knowledge = link.type === "knowledge" ? knowledgeById.get(link.knowledgeId) : null;
            const label =
              link.type === "ref"
                ? (labelById.get(link.targetId) ?? null)
                : link.type === "knowledge"
                  ? (knowledge?.title ?? null)
                  : link.value;
            const isDangling = (link.type === "ref" || link.type === "knowledge") && label === null;
            return (
              <Badge
                key={
                  link.type === "ref"
                    ? `ref:${link.targetId}`
                    : link.type === "knowledge"
                      ? `knowledge:${link.knowledgeId}`
                      : `text:${index}:${link.value}`
                }
                variant="outline"
                className="h-auto max-w-full items-start gap-1 py-1 whitespace-normal break-words"
              >
                <span className={cn(isDangling && "text-muted-foreground italic")}>
                  {isDangling ? "Deleted item" : label}
                </span>
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => onRemove(index)}
                  className="ml-0.5 hover:text-destructive"
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
          setMenuWidth(containerRef.current?.getBoundingClientRect().width ?? null);
          getSolutionRequirementOptions(planId)
            .then(setLiveOptions)
            .catch(() => {
              // Keep showing whatever we already had.
            });
          getKnowledgeLinkOptions(planId)
            .then(setKnowledgeOptions)
            .catch(() => {
              // Keep showing whatever we already had.
            });
        }}
      >
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              aria-label="Link to requirement or knowledge"
            >
              <Plus className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent
          style={menuWidth ? { width: menuWidth, minWidth: menuWidth } : undefined}
          className="text-xs"
        >
          {options.length ? (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                className="text-xs"
                checked={row.links.some(
                  (l) => l.type === "ref" && l.targetId === option.id
                )}
                onCheckedChange={(checked) =>
                  onToggle({ type: "ref", targetId: option.id }, checked === true)
                }
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs">
              No 3A requirements yet
            </DropdownMenuItem>
          )}
          {knowledgeOptions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Knowledge</DropdownMenuLabel>
                {knowledgeOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.id}
                    className="text-xs"
                    checked={row.links.some(
                      (l) => l.type === "knowledge" && l.knowledgeId === option.id
                    )}
                    onCheckedChange={(checked) =>
                      onToggle({ type: "knowledge", knowledgeId: option.id }, checked === true)
                    }
                  >
                    {option.title}
                    {option.sourcePlanName && ` (${option.sourcePlanName})`}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxPopup,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSolutionRequirementSuggestions,
  saveSolutionRequirementRows,
} from "@/app/plans/[id]/actions";
import type {
  LabeledOption,
  LinkRef,
  SolutionRequirementRow,
} from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { cn } from "@/lib/utils";

interface SolutionRequirementsTableProps {
  planId: string;
  initialRows: SolutionRequirementRow[];
  requirementTypes: LabeledOption[];
  causeOptions: { id: string; label: string }[];
  measureSuggestions: string[];
  onDataChanged?: () => void;
}

const NONE = "__none__";

function blankRow(shortId: string): SolutionRequirementRow {
  return { id: crypto.randomUUID(), shortId, requirement: "", links: [], type: null };
}

// Old rows lack `shortId` (added after the fact) — default it the same way a
// freshly-added row would get one, keyed off its position among the rows
// being normalized so existing plans don't all collapse to "Requirement 1".
// Links used to be plain strings (before ref/text links existed) — treat any
// of those as a `text` link so nothing silently disappears.
function normalizeRows(rows: SolutionRequirementRow[]): SolutionRequirementRow[] {
  return rows.map((row, i) => ({
    ...row,
    shortId: row.shortId || `Requirement ${i + 1}`,
    links: (row.links ?? []).map((link) =>
      typeof link === "string" ? { type: "text", value: link } : link
    ),
  }));
}

const COLUMN_WIDTHS = [
  { key: "shortId", defaultWidth: 110 },
  { key: "requirement", defaultWidth: 260 },
  { key: "link", defaultWidth: 260 },
  { key: "type", defaultWidth: 116 },
];

export function SolutionRequirementsTable({
  planId,
  initialRows,
  requirementTypes,
  causeOptions,
  measureSuggestions,
  onDataChanged,
}: SolutionRequirementsTableProps) {
  const [rows, setRows] = useState<SolutionRequirementRow[]>(() =>
    normalizeRows(initialRows)
  );
  // Mirrors `rows` synchronously (updated inside every setter below, not via
  // an effect) so onBlur/onValueChange handlers always read the truly-latest
  // rows even if they fire before React has re-rendered with a fresh
  // closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<SolutionRequirementRow[]>(rows);
  const dragIndexRef = useRef<number | null>(null);
  const [, startTransition] = useTransition();
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:solution-requirements",
    COLUMN_WIDTHS
  );

  function persist(nextRows: SolutionRequirementRow[]) {
    rowsRef.current = nextRows;
    setRows(nextRows);
    startTransition(async () => {
      try {
        await saveSolutionRequirementRows(planId, nextRows);
        onDataChanged?.();
      } catch {
        toast.error("Couldn't save the solution requirements table.");
      }
    });
  }

  function updateRow(id: string, updates: Partial<SolutionRequirementRow>) {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      rowsRef.current = next;
      return next;
    });
  }

  function commitRows() {
    persist(rowsRef.current);
  }

  function addRow() {
    persist([...rowsRef.current, blankRow(`Requirement ${rowsRef.current.length + 1}`)]);
  }

  function removeRow(id: string) {
    persist(rowsRef.current.filter((r) => r.id !== id));
  }

  function addLink(id: string, link: LinkRef) {
    persist(
      rowsRef.current.map((r) => {
        if (r.id !== id) return r;
        const exists = r.links.some(
          (l) =>
            (l.type === "ref" && link.type === "ref" && l.targetId === link.targetId) ||
            (l.type === "text" && link.type === "text" && l.value === link.value)
        );
        return exists ? r : { ...r, links: [...r.links, link] };
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
          <col style={{ width: widths.shortId }} />
          <col style={{ width: widths.requirement }} />
          <col style={{ width: widths.link }} />
          <col style={{ width: widths.type }} />
          <col style={{ width: 32 }} />
        </colgroup>
        <thead>
          <tr className="bg-muted/50">
            <th className="border-b border-border" />
            <ResizableTh
              isDragging={draggingKey === "shortId"}
              onPointerDown={handlePointerDown("shortId", 70)}
            >
              ID
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "requirement"}
              onPointerDown={handlePointerDown("requirement", 140)}
            >
              Requirement
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "link"}
              onPointerDown={handlePointerDown("link", 140)}
            >
              Link to Gap or cause
            </ResizableTh>
            <ResizableTh
              isDragging={draggingKey === "type"}
              onPointerDown={handlePointerDown("type", 90)}
            >
              Type
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
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.shortId}
                  onChange={(value) => updateRow(row.id, { shortId: value })}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-0">
                <EditableCell
                  value={row.requirement}
                  onChange={(value) => updateRow(row.id, { requirement: value })}
                  onBlur={commitRows}
                />
              </td>
              <td className="border-r border-border p-1.5">
                <LinkCell
                  planId={planId}
                  row={row}
                  causeOptions={causeOptions}
                  measureSuggestions={measureSuggestions}
                  onAdd={(link) => addLink(row.id, link)}
                  onRemove={(index) => removeLink(row.id, index)}
                />
              </td>
              <td className="border-r border-border p-1">
                <Select
                  value={row.type ?? NONE}
                  onValueChange={(v) =>
                    persist(
                      rowsRef.current.map((r) =>
                        r.id === row.id ? { ...r, type: v === NONE ? null : v } : r
                      )
                    )
                  }
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue>{(v: string) => (v === NONE ? "—" : v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {requirementTypes.map((option) => (
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
                  onClick={() => removeRow(row.id)}
                  className="mt-2 text-muted-foreground hover:text-destructive"
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
                New requirement
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LinkCell({
  planId,
  row,
  causeOptions,
  measureSuggestions,
  onAdd,
  onRemove,
}: {
  planId: string;
  row: SolutionRequirementRow;
  causeOptions: { id: string; label: string }[];
  measureSuggestions: string[];
  onAdd: (link: LinkRef) => void;
  onRemove: (index: number) => void;
}) {
  const [text, setText] = useState("");
  // The options/suggestions go stale the moment 2B/1.2 are edited after this
  // stage's bundle was fetched — fetch the current truth every time the
  // combobox opens instead of trusting a cached prop (see actions.ts). Starts
  // from the SSR-provided props so the first open isn't empty, and so
  // already-added ref badges below can resolve their current label even
  // before the combobox has ever been opened.
  const [liveOptions, setLiveOptions] = useState<{
    causeOptions: { id: string; label: string }[];
    measureSuggestions: string[];
  } | null>(null);
  const options = liveOptions ?? { causeOptions, measureSuggestions };
  const causeLabelById = new Map(options.causeOptions.map((c) => [c.id, c.label]));

  const query = text.trim().toLowerCase();
  const filteredCauses = query
    ? options.causeOptions.filter((c) => c.label.toLowerCase().includes(query))
    : options.causeOptions;
  const filteredMeasures = query
    ? options.measureSuggestions.filter((m) => m.toLowerCase().includes(query))
    : options.measureSuggestions;

  function commitText() {
    if (!text.trim()) return;
    onAdd({ type: "text", value: text.trim() });
    setText("");
  }

  return (
    <div className="space-y-1.5">
      {row.links.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.links.map((link, index) => {
            const label =
              link.type === "ref"
                ? (causeLabelById.get(link.targetId) ?? null)
                : link.value;
            const isDangling = link.type === "ref" && label === null;
            return (
              <Badge
                key={link.type === "ref" ? `ref:${link.targetId}` : `text:${index}:${link.value}`}
                variant="outline"
                className="h-auto max-w-full items-start gap-1 py-1 whitespace-normal break-words"
              >
                <span className={cn("min-w-0", isDangling && "text-muted-foreground italic")}>
                  {isDangling ? "Deleted item" : label}
                </span>
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => onRemove(index)}
                  className="ml-0.5 shrink-0 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <Combobox
        inputValue={text}
        onInputValueChange={(value) => setText(value)}
        onValueChange={(value) => {
          if (typeof value !== "string" || !value) return;
          if (value.startsWith("cause:")) {
            onAdd({ type: "ref", targetId: value.slice("cause:".length) });
          } else if (value.startsWith("measure:")) {
            onAdd({ type: "text", value: value.slice("measure:".length) });
          }
          setText("");
        }}
        onOpenChange={(open) => {
          if (!open) return;
          getSolutionRequirementSuggestions(planId)
            .then(setLiveOptions)
            .catch(() => {
              // Keep showing whatever options we already had.
            });
        }}
      >
        <ComboboxInputGroup>
          <ComboboxInput
            placeholder="Type or select…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
              }
            }}
          />
          <Button type="button" size="xs" variant="outline" onClick={commitText}>
            Add
          </Button>
        </ComboboxInputGroup>
        <ComboboxPopup>
          <ComboboxEmpty>No matches — press Enter to add it as free text.</ComboboxEmpty>
          {filteredCauses.length > 0 && (
            <ComboboxGroup>
              <ComboboxGroupLabel>Validated causes (2.3)</ComboboxGroupLabel>
              {filteredCauses.map((cause) => (
                <ComboboxItem key={cause.id} value={`cause:${cause.id}`}>
                  {cause.label}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          )}
          {filteredMeasures.length > 0 && (
            <ComboboxGroup>
              <ComboboxGroupLabel>Measures (1.2)</ComboboxGroupLabel>
              {filteredMeasures.map((measure) => (
                <ComboboxItem key={measure} value={`measure:${measure}`}>
                  {measure}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          )}
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}

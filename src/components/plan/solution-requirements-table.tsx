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
import type { LabeledOption, SolutionRequirementRow } from "@/lib/ccps/types";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";

interface SolutionRequirementsTableProps {
  planId: string;
  initialRows: SolutionRequirementRow[];
  requirementTypes: LabeledOption[];
  causeSuggestions: string[];
  measureSuggestions: string[];
}

const NONE = "__none__";

function blankRow(shortId: string): SolutionRequirementRow {
  return { id: crypto.randomUUID(), shortId, requirement: "", links: [], type: null };
}

// Old rows lack `shortId` (added after the fact) — default it the same way a
// freshly-added row would get one, keyed off its position among the rows
// being normalized so existing plans don't all collapse to "Requirement 1".
function normalizeRows(rows: SolutionRequirementRow[]): SolutionRequirementRow[] {
  return rows.map((row, i) => ({ ...row, shortId: row.shortId || `Requirement ${i + 1}` }));
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
  causeSuggestions,
  measureSuggestions,
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

  function addLink(id: string, link: string) {
    const trimmed = link.trim();
    if (!trimmed) return;
    persist(
      rowsRef.current.map((r) =>
        r.id === id && !r.links.includes(trimmed)
          ? { ...r, links: [...r.links, trimmed] }
          : r
      )
    );
  }

  function removeLink(id: string, link: string) {
    persist(
      rowsRef.current.map((r) =>
        r.id === id ? { ...r, links: r.links.filter((l) => l !== link) } : r
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
                  causeSuggestions={causeSuggestions}
                  measureSuggestions={measureSuggestions}
                  onAdd={(link) => addLink(row.id, link)}
                  onRemove={(link) => removeLink(row.id, link)}
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
  causeSuggestions,
  measureSuggestions,
  onAdd,
  onRemove,
}: {
  planId: string;
  row: SolutionRequirementRow;
  causeSuggestions: string[];
  measureSuggestions: string[];
  onAdd: (link: string) => void;
  onRemove: (link: string) => void;
}) {
  const [text, setText] = useState("");
  // The suggestion list goes stale the moment 2B/1.2 are edited after this
  // stage's bundle was fetched — fetch the current truth every time the
  // combobox opens instead of trusting a cached prop (see actions.ts). Starts
  // from the SSR-provided props so the first open isn't empty.
  const [liveSuggestions, setLiveSuggestions] = useState<{
    causeSuggestions: string[];
    measureSuggestions: string[];
  } | null>(null);
  const suggestions = liveSuggestions ?? { causeSuggestions, measureSuggestions };

  const query = text.trim().toLowerCase();
  const filteredCauses = query
    ? suggestions.causeSuggestions.filter((c) => c.toLowerCase().includes(query))
    : suggestions.causeSuggestions;
  const filteredMeasures = query
    ? suggestions.measureSuggestions.filter((m) => m.toLowerCase().includes(query))
    : suggestions.measureSuggestions;

  function commitText() {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  }

  return (
    <div className="space-y-1.5">
      {row.links.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.links.map((link) => (
            <Badge
              key={link}
              variant="outline"
              className="h-auto max-w-full items-start gap-1 py-1 whitespace-normal break-words"
            >
              <span className="min-w-0">{link}</span>
              <button
                type="button"
                aria-label={`Remove ${link} link`}
                onClick={() => onRemove(link)}
                className="ml-0.5 shrink-0 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Combobox
        inputValue={text}
        onInputValueChange={(value) => setText(value)}
        onValueChange={(value) => {
          if (typeof value === "string" && value) {
            onAdd(value);
            setText("");
          }
        }}
        onOpenChange={(open) => {
          if (!open) return;
          getSolutionRequirementSuggestions(planId)
            .then(setLiveSuggestions)
            .catch(() => {
              // Keep showing whatever suggestions we already had.
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
                <ComboboxItem key={cause} value={cause}>
                  {cause}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          )}
          {filteredMeasures.length > 0 && (
            <ComboboxGroup>
              <ComboboxGroupLabel>Measures (1.2)</ComboboxGroupLabel>
              {filteredMeasures.map((measure) => (
                <ComboboxItem key={measure} value={measure}>
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

"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSolutionRequirementRows } from "@/app/plans/[id]/actions";
import type { LabeledOption, SolutionRequirementRow } from "@/lib/ccps/types";

interface SolutionRequirementsTableProps {
  planId: string;
  initialRows: SolutionRequirementRow[];
  moscowOptions: LabeledOption[];
  requirementTypes: LabeledOption[];
  causeSuggestions: string[];
  measureSuggestions: string[];
}

const NONE = "__none__";

const EMPTY_ROW: Omit<SolutionRequirementRow, "id"> = {
  moscow: null,
  requirement: "",
  links: [],
  type: null,
};

export function SolutionRequirementsTable({
  planId,
  initialRows,
  moscowOptions,
  requirementTypes,
  causeSuggestions,
  measureSuggestions,
}: SolutionRequirementsTableProps) {
  const [rows, setRows] = useState<SolutionRequirementRow[]>(initialRows);
  const [, startTransition] = useTransition();

  function persist(nextRows: SolutionRequirementRow[]) {
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
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function commitRows() {
    persist(rows);
  }

  function addRow() {
    persist([...rows, { ...EMPTY_ROW, id: crypto.randomUUID() }]);
  }

  function removeRow(id: string) {
    persist(rows.filter((r) => r.id !== id));
  }

  function addLink(id: string, link: string) {
    const trimmed = link.trim();
    if (!trimmed) return;
    persist(
      rows.map((r) =>
        r.id === id && !r.links.includes(trimmed)
          ? { ...r, links: [...r.links, trimmed] }
          : r
      )
    );
  }

  function removeLink(id: string, link: string) {
    persist(
      rows.map((r) =>
        r.id === id ? { ...r, links: r.links.filter((l) => l !== link) } : r
      )
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-32 border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              A solution…
            </th>
            <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              Requirement
            </th>
            <th className="w-64 border-b border-r border-border px-2 py-1.5 text-left font-semibold">
              Link to Gap or cause
            </th>
            <th className="w-32 border-b border-border px-2 py-1.5 text-left font-semibold">
              Type
            </th>
            <th className="w-8 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border align-top last:border-b-0">
              <td className="border-r border-border p-1">
                <Select
                  value={row.moscow ?? NONE}
                  onValueChange={(v) =>
                    persist(
                      rows.map((r) =>
                        r.id === row.id ? { ...r, moscow: v === NONE ? null : v } : r
                      )
                    )
                  }
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue>{(v: string) => (v === NONE ? "—" : v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {moscowOptions.map((option) => (
                      <SelectItem key={option.id} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="border-r border-border p-0">
                <input
                  value={row.requirement}
                  onChange={(e) => updateRow(row.id, { requirement: e.target.value })}
                  onBlur={commitRows}
                  className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30"
                />
              </td>
              <td className="border-r border-border p-1.5">
                <LinkCell
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
                      rows.map((r) =>
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
            <td colSpan={5} className="p-0">
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

const INSERT_PLACEHOLDER = "__insert__";

function LinkCell({
  row,
  causeSuggestions,
  measureSuggestions,
  onAdd,
  onRemove,
}: {
  row: SolutionRequirementRow;
  causeSuggestions: string[];
  measureSuggestions: string[];
  onAdd: (link: string) => void;
  onRemove: (link: string) => void;
}) {
  const [textInput, setTextInput] = useState("");
  const [pickerKey, setPickerKey] = useState(0);

  function handleAddText(e: React.FormEvent) {
    e.preventDefault();
    onAdd(textInput);
    setTextInput("");
  }

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
      <form onSubmit={handleAddText} className="flex items-center gap-1">
        <Input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type or select…"
          className="h-7 flex-1 text-xs"
        />
        <Button type="submit" size="xs" variant="outline">
          Add
        </Button>
      </form>
      {(causeSuggestions.length > 0 || measureSuggestions.length > 0) && (
        <Select
          key={pickerKey}
          onValueChange={(v: string | null) => {
            if (v && v !== INSERT_PLACEHOLDER) onAdd(v);
            setPickerKey((k) => k + 1);
          }}
        >
          <SelectTrigger className="h-7 w-full text-xs" size="sm">
            <SelectValue placeholder="Insert suggestion…" />
          </SelectTrigger>
          <SelectContent>
            {causeSuggestions.length > 0 && (
              <SelectGroup>
                <SelectLabel>Validated causes (2.3)</SelectLabel>
                {causeSuggestions.map((cause) => (
                  <SelectItem key={cause} value={cause}>
                    {cause}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {measureSuggestions.length > 0 && (
              <SelectGroup>
                <SelectLabel>Measures (1.2)</SelectLabel>
                {measureSuggestions.map((measure) => (
                  <SelectItem key={measure} value={measure}>
                    {measure}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

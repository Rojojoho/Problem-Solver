"use client";

import { memo, useCallback, useRef, useState } from "react";
import { ArrowUpDown, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  consolidateCausalHypotheses,
  saveCausalHypothesisCategories,
  saveCausalHypothesisRows,
} from "@/app/(app)/plans/[id]/actions";
import type { HypothesisRow, ValidationOption } from "@/lib/ccps/types";
import { PARKED_VALIDATION_LABEL } from "@/lib/ccps/constants";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/plan/editable-cell";
import { ResizableTh, useColumnWidths } from "@/components/plan/use-column-widths";
import { useSerializedSave } from "@/components/plan/use-serialized-save";

interface HypothesesTableProps {
  planId: string;
  initialRows: HypothesisRow[];
  initialCategories: string[];
  validationOptions: ValidationOption[];
  onConsolidated?: () => void;
}

const NONE = "__none__";
const PARKED = PARKED_VALIDATION_LABEL;
type SortKey = "validation";
type SortDir = "asc" | "desc";

const COLUMN_WIDTHS = [
  { key: "hypothesis", defaultWidth: 300 },
  { key: "tags", defaultWidth: 180 },
  { key: "validation", defaultWidth: 160 },
];

// Old rows stored a single `category` string and a manually-toggled `struck`
// flag; both are gone (categories are now multi-tag, struck is derived from
// `validation === "Parked"`) — normalize whatever shape is in storage.
function normalizeRow(row: HypothesisRow & { category?: string | null }): HypothesisRow {
  return {
    id: row.id,
    text: row.text ?? "",
    categories: Array.isArray(row.categories)
      ? row.categories
      : row.category
        ? [row.category]
        : [],
    validation: row.validation ?? null,
  };
}

export function HypothesesTable({
  planId,
  initialRows,
  initialCategories,
  validationOptions,
  onConsolidated,
}: HypothesesTableProps) {
  const [rows, setRows] = useState<HypothesisRow[]>(() => initialRows.map(normalizeRow));
  const [categories, setCategories] = useState<string[]>(initialCategories);
  // Mirror `rows`/`categories` synchronously (updated inside every setter
  // below, not via an effect) so onBlur/onValueChange handlers always read
  // the truly-latest state even if they fire before React has re-rendered
  // with a fresh closure — e.g. switching tabs right after an edit.
  const rowsRef = useRef<HypothesisRow[]>(rows);
  const categoriesRef = useRef<string[]>(categories);
  const [categoryInput, setCategoryInput] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isConsolidating, setIsConsolidating] = useState(false);
  const { widths, draggingKey, handlePointerDown } = useColumnWidths(
    "ccps:col-widths:hypotheses",
    COLUMN_WIDTHS
  );
  const saveRows = useSerializedSave<HypothesisRow[]>(
    (nextRows) => saveCausalHypothesisRows(planId, nextRows),
    () => toast.error("Couldn't save the causal hypotheses table.")
  );
  const saveCategories = useSerializedSave<string[]>(
    (nextCategories) => saveCausalHypothesisCategories(planId, nextCategories),
    () => toast.error("Couldn't save categories.")
  );

  const persistRows = useCallback(
    (nextRows: HypothesisRow[]) => {
      rowsRef.current = nextRows;
      setRows(nextRows);
      saveRows(nextRows);
    },
    [saveRows]
  );

  function persistCategories(nextCategories: string[]) {
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
    saveCategories(nextCategories);
  }

  // Stable (useCallback) so the memoized row component below only
  // re-renders the one row actually being edited, not every row in the
  // table, on each keystroke — see HypothesisRowView.
  const updateRow = useCallback((id: string, updates: Partial<HypothesisRow>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      rowsRef.current = next;
      return next;
    });
  }, []);

  const commitRows = useCallback(() => {
    persistRows(rowsRef.current);
  }, [persistRows]);

  const removeRow = useCallback(
    (id: string) => {
      persistRows(rowsRef.current.filter((r) => r.id !== id));
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [persistRows]
  );

  const toggleRowTag = useCallback(
    (id: string, tag: string, checked: boolean) => {
      persistRows(
        rowsRef.current.map((r) => {
          if (r.id !== id) return r;
          const has = r.categories.includes(tag);
          if (checked === has) return r;
          return {
            ...r,
            categories: checked ? [...r.categories, tag] : r.categories.filter((c) => c !== tag),
          };
        })
      );
    },
    [persistRows]
  );

  const updateRowValidation = useCallback(
    (id: string, next: string | null) => {
      persistRows(rowsRef.current.map((r) => (r.id === id ? { ...r, validation: next } : r)));
    },
    [persistRows]
  );

  function addBulkHypotheses() {
    const lines = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      setBulkOpen(false);
      return;
    }
    const newRows: HypothesisRow[] = lines.map((text) => ({
      id: crypto.randomUUID(),
      text,
      categories: [],
      validation: null,
    }));
    persistRows([...rowsRef.current, ...newRows]);
    setBulkText("");
    setBulkOpen(false);
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const category = categoryInput.trim();
    if (!category || categoriesRef.current.includes(category)) return;
    persistCategories([...categoriesRef.current, category]);
    setCategoryInput("");
  }

  function handleRemoveCategory(category: string) {
    persistCategories(categoriesRef.current.filter((c) => c !== category));
    persistRows(
      rowsRef.current.map((r) =>
        r.categories.includes(category)
          ? { ...r, categories: r.categories.filter((c) => c !== category) }
          : r
      )
    );
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function bulkAddTag(tag: string) {
    persistRows(
      rowsRef.current.map((r) =>
        selected.has(r.id) && !r.categories.includes(tag)
          ? { ...r, categories: [...r.categories, tag] }
          : r
      )
    );
  }

  function bulkMarkParked() {
    persistRows(
      rowsRef.current.map((r) => (selected.has(r.id) ? { ...r, validation: PARKED } : r))
    );
  }

  function bulkDelete() {
    if (
      !window.confirm(
        `Delete ${selected.size} hypothes${selected.size === 1 ? "is" : "es"}? This can't be undone.`
      )
    ) {
      return;
    }
    persistRows(rowsRef.current.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  }

  async function handleConsolidate() {
    if (
      !window.confirm(
        "Consolidate will overwrite all rows in the Consolidated Hypotheses table (2B) — one row per tag, built from the causes here that aren't Parked. Are you sure?"
      )
    ) {
      return;
    }
    setIsConsolidating(true);
    try {
      await consolidateCausalHypotheses(planId);
      toast.success("Consolidated hypotheses (2B) updated.");
      onConsolidated?.();
    } catch {
      toast.error("Couldn't consolidate hypotheses.");
    } finally {
      setIsConsolidating(false);
    }
  }

  const displayRows = [...rows];
  if (sort) {
    const dir = sort.dir === "asc" ? 1 : -1;
    displayRows.sort((a, b) => {
      const av = (a[sort.key] ?? "").toString();
      const bv = (b[sort.key] ?? "").toString();
      return av.localeCompare(bv) * dir;
    });
  }

  const allSelected = selected.size > 0 && selected.size === rows.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="mr-1">Tags</Label>
          {categories.map((category) => (
            <Badge key={category} variant="outline" className="gap-1">
              {category}
              <button
                type="button"
                aria-label={`Remove ${category} tag`}
                onClick={() => handleRemoveCategory(category)}
                className="ml-0.5 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
          <form onSubmit={handleAddCategory} className="flex items-center gap-1">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="Add tag…"
              className="h-7 w-36 text-xs"
            />
            <Button type="submit" size="xs" variant="outline">
              Add
            </Button>
          </form>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleConsolidate}
          disabled={isConsolidating}
        >
          <Sparkles className="size-3.5" />
          Consolidate
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" size="xs" variant="outline">
                  Assign tag
                </Button>
              }
            />
            <DropdownMenuContent>
              {categories.length ? (
                categories.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => bulkAddTag(c)}>
                    {c}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" size="xs" variant="outline" onClick={bulkMarkParked}>
            Mark as Parked
          </Button>
          <Button type="button" size="xs" variant="outline-destructive" onClick={bulkDelete}>
            Delete selected
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: 32 }} />
            <col style={{ width: widths.hypothesis }} />
            <col style={{ width: widths.tags }} />
            <col style={{ width: widths.validation }} />
            <col style={{ width: 64 }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/50">
              <th className="border-b border-border p-1 text-center">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all hypotheses"
                />
              </th>
              <ResizableTh
                isDragging={draggingKey === "hypothesis"}
                onPointerDown={handlePointerDown("hypothesis", 160)}
              >
                Hypothesis
              </ResizableTh>
              <ResizableTh
                isDragging={draggingKey === "tags"}
                onPointerDown={handlePointerDown("tags", 100)}
              >
                Tags
              </ResizableTh>
              <ResizableTh
                isDragging={draggingKey === "validation"}
                onPointerDown={handlePointerDown("validation", 100)}
              >
                <button
                  type="button"
                  onClick={() => toggleSort("validation")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Initial Validation
                  <ArrowUpDown className="size-3" />
                </button>
              </ResizableTh>
              <th className="border-b border-border" />
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <HypothesisRowView
                key={row.id}
                row={row}
                isSelected={selected.has(row.id)}
                categories={categories}
                validationOptions={validationOptions}
                onToggleSelected={toggleSelected}
                onChangeText={updateRow}
                onCommitRows={commitRows}
                onToggleTag={toggleRowTag}
                onChangeValidation={updateRowValidation}
                onRemove={removeRow}
              />
            ))}
            <tr>
              <td colSpan={5} className="p-0">
                <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                  <DialogTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground",
                          "hover:bg-muted/50 hover:text-foreground"
                        )}
                      />
                    }
                  >
                    <Plus className="size-3.5" />
                    Add causal hypotheses
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add causal hypotheses</DialogTitle>
                      <DialogDescription>
                        Type or paste a list — one hypothesis per line.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={
                        "A possible cause of [the student outcome problem] is …"
                      }
                      rows={6}
                      autoFocus
                    />
                    <DialogFooter>
                      <Button type="button" onClick={addBulkHypotheses}>
                        Add
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface HypothesisRowViewProps {
  row: HypothesisRow;
  isSelected: boolean;
  categories: string[];
  validationOptions: ValidationOption[];
  onToggleSelected: (id: string) => void;
  onChangeText: (id: string, updates: Partial<HypothesisRow>) => void;
  onCommitRows: () => void;
  onToggleTag: (id: string, tag: string, checked: boolean) => void;
  onChangeValidation: (id: string, next: string | null) => void;
  onRemove: (id: string) => void;
}

// Memoized so editing one row (which only replaces that row's object in
// the parent's `rows` array — see updateRow) doesn't force every other
// row's Select/DropdownMenu/EditableCell to re-render on each keystroke.
// Every prop here must stay referentially stable across unrelated parent
// re-renders for that to actually pay off — see the useCallback-wrapped
// handlers above and useSerializedSave's stabilized `save`.
const HypothesisRowView = memo(function HypothesisRowView({
  row,
  isSelected,
  categories,
  validationOptions,
  onToggleSelected,
  onChangeText,
  onCommitRows,
  onToggleTag,
  onChangeValidation,
  onRemove,
}: HypothesisRowViewProps) {
  const isParked = row.validation === PARKED;

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="border-r border-border p-1 text-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelected(row.id)}
          aria-label={`Select ${row.text || "hypothesis"}`}
        />
      </td>
      <td className="border-r border-border p-0">
        <EditableCell
          value={row.text}
          onChange={(value) => onChangeText(row.id, { text: value })}
          onBlur={onCommitRows}
          className={cn(isParked && "text-muted-foreground line-through")}
        />
      </td>
      <td className="border-r border-border p-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex min-h-7 w-full flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted/50"
              />
            }
          >
            {row.categories.length ? (
              row.categories.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {categories.length ? (
              categories.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={row.categories.includes(c)}
                  onCheckedChange={(checked) => onToggleTag(row.id, c, checked === true)}
                >
                  {c}
                </DropdownMenuCheckboxItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="border-r border-border p-1">
        <Select
          value={row.validation ?? NONE}
          onValueChange={(v) => onChangeValidation(row.id, v === NONE ? null : v)}
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue>{(v: string) => (v === NONE ? "—" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {validationOptions.map((option) => (
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
          aria-label="Delete hypothesis"
          onClick={() => onRemove(row.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="mx-auto size-3.5" />
        </button>
      </td>
    </tr>
  );
});

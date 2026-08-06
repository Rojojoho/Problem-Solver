"use client";

import { useState, useTransition } from "react";
import { ArrowUpDown, Plus, Strikethrough, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  saveCausalHypothesisCategories,
  saveCausalHypothesisRows,
} from "@/app/plans/[id]/actions";
import type { HypothesisRow, ValidationOption } from "@/lib/ccps/types";
import { cn } from "@/lib/utils";

interface HypothesesTableProps {
  planId: string;
  initialRows: HypothesisRow[];
  initialCategories: string[];
  validationOptions: ValidationOption[];
}

const NONE = "__none__";
type SortKey = "category" | "validation";
type SortDir = "asc" | "desc";

export function HypothesesTable({
  planId,
  initialRows,
  initialCategories,
  validationOptions,
}: HypothesesTableProps) {
  const [rows, setRows] = useState<HypothesisRow[]>(initialRows);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [categoryInput, setCategoryInput] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [, startTransition] = useTransition();

  function persistRows(nextRows: HypothesisRow[]) {
    setRows(nextRows);
    startTransition(async () => {
      try {
        await saveCausalHypothesisRows(planId, nextRows);
      } catch {
        toast.error("Couldn't save the causal hypotheses table.");
      }
    });
  }

  function persistCategories(nextCategories: string[]) {
    setCategories(nextCategories);
    startTransition(async () => {
      try {
        await saveCausalHypothesisCategories(planId, nextCategories);
      } catch {
        toast.error("Couldn't save categories.");
      }
    });
  }

  function updateRow(id: string, updates: Partial<HypothesisRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function commitRows() {
    persistRows(rows);
  }

  function removeRow(id: string) {
    persistRows(rows.filter((r) => r.id !== id));
  }

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
      category: null,
      validation: null,
      struck: false,
    }));
    persistRows([...rows, ...newRows]);
    setBulkText("");
    setBulkOpen(false);
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const category = categoryInput.trim();
    if (!category || categories.includes(category)) return;
    persistCategories([...categories, category]);
    setCategoryInput("");
  }

  function handleRemoveCategory(category: string) {
    persistCategories(categories.filter((c) => c !== category));
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Label className="mr-1">Categories</Label>
        {categories.map((category) => (
          <Badge key={category} variant="outline" className="gap-1">
            {category}
            <button
              type="button"
              aria-label={`Remove ${category} category`}
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
            placeholder="Add category…"
            className="h-7 w-36 text-xs"
          />
          <Button type="submit" size="xs" variant="outline">
            Add
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
                Hypothesis
              </th>
              <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
                <button
                  type="button"
                  onClick={() => toggleSort("category")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Category
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold">
                <button
                  type="button"
                  onClick={() => toggleSort("validation")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Initial Validation
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="w-16 border-b border-border" />
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="border-r border-border p-0">
                  <input
                    value={row.text}
                    onChange={(e) => updateRow(row.id, { text: e.target.value })}
                    onBlur={commitRows}
                    className={cn(
                      "w-full bg-transparent px-2 py-1.5 outline-none focus:bg-muted/30",
                      row.struck && "text-muted-foreground line-through"
                    )}
                  />
                </td>
                <td className="border-r border-border p-1">
                  <Select
                    value={row.category ?? NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? null : v;
                      persistRows(
                        rows.map((r) =>
                          r.id === row.id ? { ...r, category: next } : r
                        )
                      );
                    }}
                  >
                    <SelectTrigger className="w-full" size="sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-border p-1">
                  <Select
                    value={row.validation ?? NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? null : v;
                      persistRows(
                        rows.map((r) =>
                          r.id === row.id ? { ...r, validation: next } : r
                        )
                      );
                    }}
                  >
                    <SelectTrigger className="w-full" size="sm">
                      <SelectValue placeholder="—" />
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
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      aria-label={row.struck ? "Unstrike hypothesis" : "Strike through hypothesis"}
                      aria-pressed={row.struck}
                      onClick={() =>
                        persistRows(
                          rows.map((r) =>
                            r.id === row.id ? { ...r, struck: !r.struck } : r
                          )
                        )
                      }
                      className={cn(
                        "text-muted-foreground hover:text-foreground",
                        row.struck && "text-foreground"
                      )}
                    >
                      <Strikethrough className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete hypothesis"
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="p-0">
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

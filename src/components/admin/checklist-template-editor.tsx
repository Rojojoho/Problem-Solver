"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import { NewChecklistItemDialog } from "@/components/admin/new-checklist-item-dialog";
import {
  updateChecklistTemplateItem,
  deleteChecklistTemplateItem,
} from "@/app/admin/settings/checklists/actions";

interface TemplateItem {
  id: string;
  item_key: string;
  stage: CcpsStage;
  label: string;
  sort_order: number;
}

export function ChecklistTemplateEditor({
  itemsByStage,
}: {
  itemsByStage: Record<string, TemplateItem[]>;
}) {
  return (
    <Tabs defaultValue={STAGES[0].key}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {STAGES.map((s) => (
          <TabsTrigger key={s.key} value={s.key} className="whitespace-nowrap">
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {STAGES.map((s) => (
        <TabsContent key={s.key} value={s.key} className="mt-4 space-y-3">
          {(itemsByStage[s.key] ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No checklist items for this stage yet.
            </p>
          ) : (
            (itemsByStage[s.key] ?? []).map((item) => (
              <ChecklistItemRow key={item.id} item={item} />
            ))
          )}
          <NewChecklistItemDialog stage={s.key} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ChecklistItemRow({ item }: { item: TemplateItem }) {
  const [label, setLabel] = useState(item.label);
  const [sortOrder, setSortOrder] = useState(item.sort_order);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateChecklistTemplateItem(item.id, label, sortOrder);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that item.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${item.label}"?`)) return;
    startTransition(async () => {
      try {
        await deleteChecklistTemplateItem(item.id);
        toast.success("Deleted.");
      } catch {
        toast.error("Couldn't delete that item.");
      }
    });
  }

  return (
    <div className="flex items-start gap-2 border-b border-border py-2.5 last:border-b-0">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
        className="w-20"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Save
      </Button>
      <Button
        size="sm"
        variant="outline-destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        Delete
      </Button>
    </div>
  );
}

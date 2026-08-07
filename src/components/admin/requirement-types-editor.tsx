"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LabeledOption } from "@/lib/ccps/types";
import {
  createRequirementType,
  updateRequirementType,
  deleteRequirementType,
} from "@/app/admin/settings/requirement-types/actions";

export function RequirementTypesEditor({
  options,
}: {
  options: LabeledOption[];
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("label", label);
      await createRequirementType(formData);
      toast.success("Requirement type added.");
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that type.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requirement types yet.</p>
      ) : (
        options.map((option) => (
          <RequirementTypeRow key={option.id} option={option} />
        ))
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. Resource"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add type
        </Button>
      </form>
    </div>
  );
}

function RequirementTypeRow({ option }: { option: LabeledOption }) {
  const [label, setLabel] = useState(option.label);
  const [sortOrder, setSortOrder] = useState(option.sort_order);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateRequirementType(option.id, label, sortOrder);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that type.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${option.label}"?`)) return;
    startTransition(async () => {
      try {
        await deleteRequirementType(option.id);
        toast.success("Deleted.");
      } catch {
        toast.error("Couldn't delete that type.");
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

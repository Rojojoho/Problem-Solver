"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ValidationOption } from "@/lib/ccps/types";
import {
  createValidationOption,
  updateValidationOption,
  deleteValidationOption,
} from "@/app/admin/settings/validation-options/actions";

export function ValidationOptionsEditor({
  options,
}: {
  options: ValidationOption[];
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
      await createValidationOption(formData);
      toast.success("Validation option added.");
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that option.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No validation options yet.</p>
      ) : (
        options.map((option) => (
          <ValidationOptionRow key={option.id} option={option} />
        ))
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. Possible"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add option
        </Button>
      </form>
    </div>
  );
}

function ValidationOptionRow({ option }: { option: ValidationOption }) {
  const [label, setLabel] = useState(option.label);
  const [sortOrder, setSortOrder] = useState(option.sort_order);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateValidationOption(option.id, label, sortOrder);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that option.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${option.label}"?`)) return;
    startTransition(async () => {
      try {
        await deleteValidationOption(option.id);
        toast.success("Deleted.");
      } catch {
        toast.error("Couldn't delete that option.");
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

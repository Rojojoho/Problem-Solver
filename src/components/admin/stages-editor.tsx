"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StageData } from "@/lib/ccps/types";
import { createStage, updateStage } from "@/app/admin/settings/stages/actions";

export function StagesEditor({ stages }: { stages: StageData[] }) {
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
      await createStage(formData);
      toast.success("Stage added.");
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that stage.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      {[...stages]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((stage) => (
          <StageRow key={stage.key} stage={stage} />
        ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. 6 Sustain"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add stage
        </Button>
      </form>
    </div>
  );
}

function StageRow({ stage }: { stage: StageData }) {
  const [label, setLabel] = useState(stage.label);
  const [sortOrder, setSortOrder] = useState(stage.sort_order);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateStage(stage.key, label, sortOrder);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that stage.");
      }
    });
  }

  return (
    <div className="flex items-start gap-2 border-b border-border py-2.5 last:border-b-0">
      <span className="mt-2 w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {stage.key}
      </span>
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
    </div>
  );
}

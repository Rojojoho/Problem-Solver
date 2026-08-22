"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DiagramHeadings } from "@/lib/ccps/types";
import { updateDiagramHeadings } from "@/app/admin/settings/diagram-headings/actions";

const FIELDS: { key: keyof DiagramHeadings; label: string }[] = [
  { key: "problem", label: "Problem column (1.1)" },
  { key: "causes", label: "Causes column (2.3)" },
  { key: "requirements", label: "Requirements column (3.1)" },
  { key: "strategy", label: "Strategy column (3.2)" },
];

export function DiagramHeadingsEditor({ headings }: { headings: DiagramHeadings }) {
  const [values, setValues] = useState(headings);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateDiagramHeadings(values);
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save these headings.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            value={values[field.key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
          />
        </div>
      ))}
      <Button onClick={handleSave} disabled={isPending}>
        Save
      </Button>
    </div>
  );
}

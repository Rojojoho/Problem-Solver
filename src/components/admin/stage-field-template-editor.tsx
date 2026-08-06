"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/lib/ccps/constants";
import { updateStageField } from "@/app/admin/settings/fields/actions";
import type { StageFieldSummary } from "@/lib/ccps/types";

type TemplateField = StageFieldSummary;

export function StageFieldTemplateEditor({
  fieldsByStage,
}: {
  fieldsByStage: Record<string, TemplateField[]>;
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
          {(fieldsByStage[s.key] ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No fields for this stage yet.
            </p>
          ) : (
            (fieldsByStage[s.key] ?? []).map((field) => (
              <StageFieldRow key={field.field_key} field={field} />
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function StageFieldRow({ field }: { field: TemplateField }) {
  const [shortName, setShortName] = useState(field.short_name);
  const [fullPrompt, setFullPrompt] = useState(field.full_prompt);
  const [helperText, setHelperText] = useState(field.helper_text ?? "");
  const [sortOrder, setSortOrder] = useState(field.sort_order);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateStageField(
          field.field_key,
          shortName,
          fullPrompt,
          helperText,
          sortOrder
        );
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that field.");
      }
    });
  }

  return (
    <div className="space-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{field.internal_id}</span>
        <span>·</span>
        <span className="font-mono">{field.field_key}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <div>
          <Label className="text-xs">Short name</Label>
          <Input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Full prompt</Label>
          <Textarea
            value={fullPrompt}
            onChange={(e) => setFullPrompt(e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Sort order</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="mt-1 w-20"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Helper text</Label>
        <Input
          value={helperText}
          onChange={(e) => setHelperText(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}

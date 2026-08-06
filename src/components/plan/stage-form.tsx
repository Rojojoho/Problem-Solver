"use client";

import { useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/tiptap-editor";
import { MeasuresTable } from "@/components/plan/measures-table";
import { EMPTY_DOC, MEASURES_FIELD_KEY, STAGES } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { MeasureRow, StageFieldSummary } from "@/lib/ccps/types";
import { saveStageResponse } from "@/app/plans/[id]/actions";

interface StageFormProps {
  planId: string;
  stage: CcpsStage;
  fields: StageFieldSummary[];
  initialResponses: Record<string, JSONContent>;
}

export function StageForm({
  planId,
  stage,
  fields,
  initialResponses,
}: StageFormProps) {
  const [isPending, startTransition] = useTransition();
  const stageNumber = STAGES.findIndex((s) => s.key === stage) + 1;
  const stageLabel = STAGES.find((s) => s.key === stage)?.label ?? stage;

  function handleSave(fieldKey: string, content: JSONContent) {
    startTransition(async () => {
      try {
        await saveStageResponse(planId, stage, fieldKey, content);
      } catch {
        toast.error("Couldn't save your changes. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {stageNumber}. {stageLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isPending ? "Saving…" : "Changes save automatically when you click away from a field."}
        </p>
      </div>

      {[...fields]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((field) => (
          <div key={field.field_key} className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {field.internal_id}
              </span>
              {field.full_prompt}
            </Label>
            {field.helper_text && (
              <p className="text-xs text-muted-foreground">{field.helper_text}</p>
            )}
            <TiptapEditor
              content={initialResponses[field.field_key] ?? EMPTY_DOC}
              onBlurSave={(content) => handleSave(field.field_key, content)}
            />
            {field.field_key === "pi_outcome_data" && (
              <MeasuresTable
                planId={planId}
                initialRows={
                  (initialResponses[MEASURES_FIELD_KEY] as unknown as MeasureRow[]) ?? []
                }
              />
            )}
          </div>
        ))}
    </div>
  );
}

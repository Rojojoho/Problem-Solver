"use client";

import { useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/tiptap-editor";
import { MeasuresTable } from "@/components/plan/measures-table";
import { HypothesesTable } from "@/components/plan/hypotheses-table";
import { ConsolidatedHypothesesTable } from "@/components/plan/consolidated-hypotheses-table";
import {
  CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY,
  CAUSAL_HYPOTHESES_FIELD_KEY,
  CONSOLIDATED_HYPOTHESES_FIELD_KEY,
  EMPTY_DOC,
  MEASURES_FIELD_KEY,
} from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ConsolidatedHypothesisRow,
  HypothesisRow,
  MeasureRow,
  StageFieldSummary,
  ValidationOption,
} from "@/lib/ccps/types";
import { saveStageResponse } from "@/app/plans/[id]/actions";

interface StageFormProps {
  planId: string;
  stage: CcpsStage;
  stageLabel: string;
  fields: StageFieldSummary[];
  initialResponses: Record<string, JSONContent>;
  validationOptions: ValidationOption[];
}

export function StageForm({
  planId,
  stage,
  stageLabel,
  fields,
  initialResponses,
  validationOptions,
}: StageFormProps) {
  const [isPending, startTransition] = useTransition();

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
        <h2 className="text-xl font-bold tracking-tight">{stageLabel}</h2>
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
            {field.field_key === CAUSAL_HYPOTHESES_FIELD_KEY ? (
              <HypothesesTable
                planId={planId}
                initialRows={
                  (initialResponses[
                    CAUSAL_HYPOTHESES_FIELD_KEY
                  ] as unknown as HypothesisRow[]) ?? []
                }
                initialCategories={
                  (initialResponses[
                    CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY
                  ] as unknown as string[]) ?? []
                }
                validationOptions={validationOptions}
              />
            ) : field.field_key === CONSOLIDATED_HYPOTHESES_FIELD_KEY ? (
              <ConsolidatedHypothesesTable
                planId={planId}
                initialRows={
                  (initialResponses[
                    CONSOLIDATED_HYPOTHESES_FIELD_KEY
                  ] as unknown as ConsolidatedHypothesisRow[]) ?? []
                }
              />
            ) : (
              <TiptapEditor
                content={
                  initialResponses[field.field_key] ?? field.default_content ?? EMPTY_DOC
                }
                onBlurSave={(content) => handleSave(field.field_key, content)}
              />
            )}
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

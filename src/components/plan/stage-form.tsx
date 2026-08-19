"use client";

import { useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/tiptap-editor";
import { MeasuresTable } from "@/components/plan/measures-table";
import { HypothesesTable } from "@/components/plan/hypotheses-table";
import { ConsolidatedHypothesesTable } from "@/components/plan/consolidated-hypotheses-table";
import { SolutionRequirementsTable } from "@/components/plan/solution-requirements-table";
import { SolutionStrategiesTable } from "@/components/plan/solution-strategies-table";
import { ImplementationMonitoringTable } from "@/components/plan/implementation-monitoring-table";
import {
  asRowArray,
  CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY,
  CAUSAL_HYPOTHESES_FIELD_KEY,
  CONSOLIDATED_HYPOTHESES_FIELD_KEY,
  EMPTY_DOC,
  IMPLEMENTATION_MONITORING_FIELD_KEY,
  MEASURES_FIELD_KEY,
  SOLUTION_REQUIREMENTS_FIELD_KEY,
  SOLUTION_STRATEGIES_FIELD_KEY,
} from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ConsolidatedHypothesisRow,
  HypothesisRow,
  ImplementationRow,
  LabeledOption,
  MeasureRow,
  SolutionRequirementRow,
  SolutionStrategyRow,
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
  requirementTypes: LabeledOption[];
  causeOptions: { id: string; label: string }[];
  measureSuggestions: string[];
  requirementOptions: { id: string; label: string }[];
  strategyRows: SolutionStrategyRow[];
  onStageDataChanged?: (stage: CcpsStage) => void;
}

export function StageForm({
  planId,
  stage,
  stageLabel,
  fields,
  initialResponses,
  validationOptions,
  requirementTypes,
  causeOptions,
  measureSuggestions,
  requirementOptions,
  strategyRows,
  onStageDataChanged,
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
        {isPending && <p className="text-sm text-muted-foreground">Saving…</p>}
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
                initialRows={asRowArray<HypothesisRow>(
                  initialResponses[CAUSAL_HYPOTHESES_FIELD_KEY]
                )}
                initialCategories={asRowArray<string>(
                  initialResponses[CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY]
                )}
                validationOptions={asRowArray<ValidationOption>(validationOptions)}
                onConsolidated={() => onStageDataChanged?.("CV")}
              />
            ) : field.field_key === CONSOLIDATED_HYPOTHESES_FIELD_KEY ? (
              <ConsolidatedHypothesesTable
                planId={planId}
                initialRows={asRowArray<ConsolidatedHypothesisRow>(
                  initialResponses[CONSOLIDATED_HYPOTHESES_FIELD_KEY]
                )}
                onDataChanged={() => onStageDataChanged?.("SR")}
              />
            ) : field.field_key === SOLUTION_REQUIREMENTS_FIELD_KEY ? (
              <SolutionRequirementsTable
                planId={planId}
                initialRows={asRowArray<SolutionRequirementRow>(
                  initialResponses[SOLUTION_REQUIREMENTS_FIELD_KEY]
                )}
                requirementTypes={asRowArray<LabeledOption>(requirementTypes)}
                causeOptions={causeOptions}
                measureSuggestions={asRowArray<string>(measureSuggestions)}
                onDataChanged={() => onStageDataChanged?.("SS")}
              />
            ) : field.field_key === SOLUTION_STRATEGIES_FIELD_KEY ? (
              <SolutionStrategiesTable
                planId={planId}
                initialRows={asRowArray<SolutionStrategyRow>(
                  initialResponses[SOLUTION_STRATEGIES_FIELD_KEY]
                )}
                requirementOptions={requirementOptions}
              />
            ) : field.field_key === IMPLEMENTATION_MONITORING_FIELD_KEY ? (
              <ImplementationMonitoringTable
                planId={planId}
                initialStrategyRows={asRowArray<SolutionStrategyRow>(strategyRows)}
                initialRows={asRowArray<ImplementationRow>(
                  initialResponses[IMPLEMENTATION_MONITORING_FIELD_KEY]
                )}
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
                initialRows={asRowArray<MeasureRow>(
                  initialResponses[MEASURES_FIELD_KEY]
                )}
              />
            )}
          </div>
        ))}
    </div>
  );
}

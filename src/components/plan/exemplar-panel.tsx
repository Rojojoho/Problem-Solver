"use client";

import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ReadOnlyFieldContent,
  buildFieldRenderContext,
} from "@/components/plan/read-only-field-content";
import type { DiagramHeadings, ExemplarData, PublicPlanBundle, StageFieldSummary } from "@/lib/ccps/types";
import type { PanelStage } from "@/components/plan/side-panel";

export const EXEMPLAR_NONE = "__none__";

interface ExemplarPanelProps {
  stage: PanelStage;
  exemplars: ExemplarData[];
  fields: StageFieldSummary[];
  headings: DiagramHeadings;
  // Selection + fetched bundles are owned by SidePanel, not this component
  // — see the comment on SidePanel's exemplar state for why.
  selectedId: string;
  onSelect: (id: string) => void;
  detail: PublicPlanBundle | null;
  isLoading: boolean;
}

export function ExemplarPanel({
  stage,
  exemplars,
  fields,
  headings,
  selectedId,
  onSelect,
  detail,
  isLoading,
}: ExemplarPanelProps) {
  const stageBundle = detail?.stages.find((s) => s.key === stage);
  const fieldCtx = detail ? buildFieldRenderContext(detail, headings) : null;

  return (
    <div className="space-y-4">
      <Select value={selectedId} onValueChange={(value) => onSelect(value ?? selectedId)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose an exemplar">
            {(v: string) => (v === EXEMPLAR_NONE ? "None" : (exemplars.find((e) => e.id === v)?.name ?? v))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EXEMPLAR_NONE}>None</SelectItem>
          {exemplars.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedId !== EXEMPLAR_NONE &&
        (isLoading && !detail ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (
          stageBundle &&
          fieldCtx && (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.field_key} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {field.full_prompt}
                  </p>
                  <ReadOnlyFieldContent
                    fieldKey={field.field_key}
                    responses={stageBundle.responses}
                    ctx={fieldCtx}
                  />
                </div>
              ))}
            </div>
          )
        ))}
    </div>
  );
}

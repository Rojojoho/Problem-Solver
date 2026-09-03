"use client";

import { useState, useTransition } from "react";
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
import { getExemplarBundle } from "@/app/(app)/plans/[id]/actions";
import type { DiagramHeadings, ExemplarData, PublicPlanBundle, StageFieldSummary } from "@/lib/ccps/types";
import type { PanelStage } from "@/components/plan/side-panel";

interface ExemplarPanelProps {
  stage: PanelStage;
  exemplars: ExemplarData[];
  fields: StageFieldSummary[];
  headings: DiagramHeadings;
}

const NONE = "__none__";

export function ExemplarPanel({ stage, exemplars, fields, headings }: ExemplarPanelProps) {
  const [selectedId, setSelectedId] = useState(NONE);
  // Caches every exemplar's full bundle once fetched — only fetch again
  // (below) when a different, not-yet-fetched exemplar is selected.
  const [bundles, setBundles] = useState<Record<string, PublicPlanBundle>>({});
  const [isPending, startTransition] = useTransition();

  function handleSelect(value: string | null) {
    const next = value ?? NONE;
    setSelectedId(next);
    if (next === NONE || bundles[next]) return;

    startTransition(async () => {
      const bundle = await getExemplarBundle(next);
      if (bundle) setBundles((prev) => ({ ...prev, [next]: bundle }));
    });
  }

  const detail = selectedId === NONE ? null : bundles[selectedId];
  const stageBundle = detail?.stages.find((s) => s.key === stage);
  const fieldCtx = detail ? buildFieldRenderContext(detail, headings) : null;

  return (
    <div className="space-y-4">
      <Select value={selectedId} onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose an exemplar">
            {(v: string) => (v === NONE ? "None" : (exemplars.find((e) => e.id === v)?.name ?? v))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {exemplars.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedId !== NONE &&
        (isPending && !detail ? (
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

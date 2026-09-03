"use client";

import { TiptapEditor } from "@/components/tiptap-editor";
import type { PlanSummaryData } from "@/app/(app)/plans/[id]/actions";

export function SummaryTab({ fields, requirements, strategies }: PlanSummaryData) {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.fieldKey} className="space-y-1.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="font-mono text-xs text-muted-foreground">
              {field.internalId}
            </span>
            {field.label}
          </h3>
          <TiptapEditor content={field.content} editable={false} />
        </div>
      ))}

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold">
          Solutions will need to meet the following requirements:
        </h3>
        {requirements.length ? (
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {requirements.map((requirement, i) => (
              <li key={i}>{requirement}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            No solution requirements added yet.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold">Proposed solution strategies:</h3>
        {strategies.length ? (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {strategies.map((s, i) => (
              <li key={i}>
                {s.strategy}
                {s.description ? `: ${s.description}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No solution strategies added yet.
          </p>
        )}
      </div>
    </div>
  );
}

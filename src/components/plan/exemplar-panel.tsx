"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { docToParagraphs } from "@/lib/ccps/doc-to-text";
import type { ExemplarData, StageFieldSummary } from "@/lib/ccps/types";
import type { PanelStage } from "@/components/plan/side-panel";

interface ExemplarPanelProps {
  stage: PanelStage;
  exemplars: ExemplarData[];
  fields: StageFieldSummary[];
}

export function ExemplarPanel({ exemplars, fields }: ExemplarPanelProps) {
  const [selectedId, setSelectedId] = useState(exemplars[0]?.id ?? "");
  const selected = exemplars.find((e) => e.id === selectedId);

  if (!exemplars.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No exemplars have been added for this stage yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        value={selectedId}
        onValueChange={(value) => setSelectedId(value ?? "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose an exemplar" />
        </SelectTrigger>
        <SelectContent>
          {exemplars.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <div className="space-y-4">
          {selected.description && (
            <p className="text-xs text-muted-foreground">
              {selected.description}
            </p>
          )}
          {fields.map((field) => {
            const paragraphs = docToParagraphs(selected.fields[field.field_key]);
            if (!paragraphs.length) return null;
            return (
              <div key={field.field_key} className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {field.full_prompt}
                </p>
                <div className="space-y-1 text-sm">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

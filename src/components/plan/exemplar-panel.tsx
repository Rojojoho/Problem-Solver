"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PI_FIELDS } from "@/lib/ccps/constants";
import { docToParagraphs } from "@/lib/ccps/doc-to-text";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { ExemplarData } from "@/lib/ccps/types";

interface ExemplarPanelProps {
  stage: CcpsStage;
  exemplars: ExemplarData[];
}

export function ExemplarPanel({ exemplars }: ExemplarPanelProps) {
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
          {PI_FIELDS.map((field) => {
            const paragraphs = docToParagraphs(selected.fields[field.key]);
            if (!paragraphs.length) return null;
            return (
              <div key={field.key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {field.label}
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

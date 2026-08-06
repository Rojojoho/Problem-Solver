import type { CcpsStage } from "@/lib/supabase/database.types";
import type { JSONContent } from "@tiptap/react";

export const STAGES: { key: CcpsStage; label: string }[] = [
  { key: "PI", label: "Problem Identification" },
  { key: "PC", label: "Inquire into Causes" },
  { key: "SR", label: "Solution Requirements" },
  { key: "SS", label: "Solution Strategies" },
  { key: "EI", label: "Evaluate Impact" },
];

export const STAGE_LABELS: Record<CcpsStage, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label])
) as Record<CcpsStage, string>;

export function paragraphDoc(...lines: string[]): JSONContent {
  return {
    type: "doc",
    content: lines.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// Synthetic field_key storing the Measure/Baseline/Target/Notes table
// attached to the "Student Data" (pi_outcome_data) field — reuses the same
// plan_stage_responses row-per-field storage as every other stage field, just
// with a JSON array of rows instead of Tiptap doc content.
export const MEASURES_FIELD_KEY = "pi_outcome_data_measures";

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

const AGREEMENT_SCRIPT_DEFAULT: JSONContent = paragraphDoc(
  "1. State the purpose of the meeting as seeking agreement about the first stage of CCPS (PI).",
  "2. PI Advocacy – Present your own PI priority, supported by evidence and an educational argument.",
  "3. PI Inquiry - Inquire for staff reaction to your suggested PI priority and inquire about any alternatives.",
  "4. Check for agreement about the priority.",
  "5. Signal the next steps in the CCPS process."
);

export interface StageFieldDef {
  key: string;
  label: string;
  helperText?: string;
  defaultContent?: JSONContent;
}

export const PI_FIELDS: StageFieldDef[] = [
  {
    key: "pi_problem_description",
    label: "Describe the student outcome problem",
    helperText: "Be as precise as you can.",
  },
  {
    key: "pi_outcome_data",
    label: "Insert the student outcome data",
    helperText: "The data that tells you that this is a problem.",
  },
  {
    key: "pi_educational_argument",
    label: "Make an educational argument",
    helperText: "Why is this problem the priority?",
  },
  {
    key: "pi_agreement_script",
    label: "Describe/script what you might say to check for Stage 1 agreement",
    defaultContent: AGREEMENT_SCRIPT_DEFAULT,
  },
];

export const STAGE_FIELDS: Partial<Record<CcpsStage, StageFieldDef[]>> = {
  PI: PI_FIELDS,
};

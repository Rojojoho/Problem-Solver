import type { JSONContent } from "@tiptap/react";
import type { StageData } from "@/lib/ccps/types";

// Stage identity/order/labels are data-driven (see the `stages` table,
// fetched via `listStages()`) rather than a static constant, so stages can
// be renamed/reordered/added from admin settings without a code change.
export function stageLabelMap(stages: StageData[]): Record<string, string> {
  return Object.fromEntries(stages.map((s) => [s.key, s.label]));
}

// Table fields (Measures, Causal Hypotheses, etc.) store their rows as a
// JSON array under a synthetic field_key in plan_stage_responses, whose
// `content` column defaults to `{}` (an object) until something is
// explicitly saved. A plain `?? []` only catches null/undefined, not that
// object default, so every table's initialRows is coerced through this
// instead of trusting the stored shape — an empty/malformed value quietly
// becomes an empty table rather than crashing the whole page on `.map()`.
export function asRowArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

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

// The "Causal Hypotheses" field (2.2) renders a structured table instead of
// a Tiptap editor (see stage-form.tsx) — its rows and the per-plan category
// list are stored the same way, as JSON under synthetic field_keys.
export const CAUSAL_HYPOTHESES_FIELD_KEY = "pc_causal_hypotheses";
export const CAUSAL_HYPOTHESES_CATEGORIES_FIELD_KEY =
  "pc_causal_hypotheses_categories";

// Stage 2B (2.3): also a structured table rendered instead of a Tiptap
// editor — see stage-form.tsx.
export const CONSOLIDATED_HYPOTHESES_FIELD_KEY = "cv_consolidated_hypotheses";

// Stage 3A (3.1): also a structured table rendered instead of a Tiptap
// editor — see stage-form.tsx.
export const SOLUTION_REQUIREMENTS_FIELD_KEY = "sr_solution_requirements";

// Stage 3B (3.2): also a structured table rendered instead of a Tiptap
// editor — see stage-form.tsx.
export const SOLUTION_STRATEGIES_FIELD_KEY = "ss_solution_strategies";

// Stage 4 (4.1): also a structured table rendered instead of a Tiptap
// editor — see stage-form.tsx. Its rows mirror Stage 3B's solution
// strategies live (see implementation-monitoring-table.tsx); only the
// extra columns (Lead/Timeframe/Implementation indicators/Monitor) are
// stored here, keyed by the 3B row's id.
export const IMPLEMENTATION_MONITORING_FIELD_KEY = "im_implementation_monitoring";

// Stage 4's rows are a mix of ones mirrored live from Stage 3B (no stable
// storage of their own until touched) and standalone extra rows — neither
// array alone captures a user-chosen display order across both, so the
// order the user drags rows into is persisted separately here as a flat
// list of row ids.
export const IMPLEMENTATION_ROW_ORDER_FIELD_KEY = "im_implementation_row_order";

// Stage 5 (5.1): also a structured table rendered instead of a Tiptap
// editor — see stage-form.tsx. Rows are pulled in from Stage 1's Measures
// table on demand (an explicit "Import" button, not a live mirror) and can
// be clustered into outcome groups, stored separately under their own key.
export const IMPACT_MEASURES_FIELD_KEY = "ei_impact_measures";
export const IMPACT_OUTCOME_GROUPS_FIELD_KEY = "ei_impact_outcome_groups";

// Fixed set of fields the Summary tab surfaces, independent of whichever
// stage tabs the user has actually visited this session. Lives here (not in
// plans/[id]/actions.ts) because that file has a top-level "use server"
// directive, and Next.js requires every export from such a file to be an
// async function — a plain constant isn't allowed there. Used by both the
// in-app getPlanSummary and the public (no-login) viewer, which builds the
// same summary shape from its own already-fetched bundle instead of
// re-fetching via the authenticated-only getPlanSummary.
export const SUMMARY_FIELD_KEYS = [
  "pi_problem_description", // 1.1
  "pi_educational_argument", // 1.3
  "cv_validated_causal_story", // 2.4
] as const;

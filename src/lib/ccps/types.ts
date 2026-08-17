import type { JSONContent } from "@tiptap/react";
import type {
  CcpsStage,
  KbStatus,
  PublishedStatus,
} from "@/lib/supabase/database.types";

export interface ChecklistItemData {
  item_key: string;
  label: string;
  checked: boolean;
}

export interface FeedbackItemData {
  id: string;
  stage: CcpsStage;
  author_name: string;
  body: string;
  created_at: string;
  resolved: boolean;
}

export interface ExemplarData {
  id: string;
  name: string;
  description: string | null;
  fields: Record<string, JSONContent>;
}

export interface MeasureRow {
  measure: string;
  baseline: string;
  target: string;
  notes: string;
}

export interface StageFieldSummary {
  field_key: string;
  internal_id: string;
  short_name: string;
  full_prompt: string;
  helper_text: string | null;
  default_content: JSONContent | null;
  sort_order: number;
}

export interface StageData {
  key: string;
  label: string;
  sort_order: number;
}

export interface ConsolidatedHypothesisRow {
  id: string;
  hypothesis: string;
  // The list of causal-hypothesis rows folded into this tag by "Consolidate"
  // — a one-off copy, not a live link, so it stays editable afterward.
  description: string;
  validityTest: string;
  confirmed: boolean | null;
  notes: string;
}

export interface ValidationOption {
  id: string;
  label: string;
  sort_order: number;
}

export interface HypothesisRow {
  id: string;
  text: string;
  // A cause can carry multiple tags (rendered like multi-select tags, not a
  // single category). "Parked" is driven entirely by `validation` — there's
  // no separate stored strike flag.
  categories: string[];
  validation: string | null;
}

// Same shape as ValidationOption — reused for the requirement-type option
// list rather than duplicating the interface.
export type LabeledOption = ValidationOption;

export interface SolutionRequirementRow {
  id: string;
  // Visible, editable short label ("Requirement 1" by default) — the
  // human-readable identity 3B's Link column tags reference, same free-text
  // model as 2B's Causal hypothesis cell.
  shortId: string;
  requirement: string;
  links: string[];
  type: string | null;
}

export interface SolutionStrategyRow {
  id: string;
  strategy: string;
  description: string;
  theoryOfAction: string;
  // The 3A `shortId`s this strategy addresses — a plain tag list (like 2A's
  // categories), not a live join, so a later 3A rename won't retroactively
  // update it.
  links: string[];
}

export interface ImplementationRow {
  id: string;
  // Links this row to a live Stage 3B strategy by id — the Strategy/
  // Description columns are then read from that 3B row (refreshed via the
  // "Refresh strategies" button) rather than stored here. `null` means this
  // is a standalone row added directly on Stage 4, with its own editable
  // `strategy`/`description`.
  strategyId: string | null;
  strategy: string;
  description: string;
  lead: string;
  timeframe: string;
  implementationIndicators: string;
  monitor: string;
}

export interface StageBundle {
  fields: StageFieldSummary[];
  responses: Record<string, JSONContent>;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  validationOptions: ValidationOption[];
  requirementTypes: LabeledOption[];
  causeSuggestions: string[];
  measureSuggestions: string[];
  strategyRows: SolutionStrategyRow[];
}

export interface TagData {
  id: string;
  name: string;
}

export interface PublishedPlanSummary {
  id: string;
  sourceOrgName: string | null;
  snapshotName: string;
  snapshotCurrentStage: CcpsStage;
  status: PublishedStatus;
  createdAt: string;
  reviewNote: string | null;
  tags: TagData[];
}

export interface KbArticleSummary {
  id: string;
  title: string;
  stage: CcpsStage | null;
  status: KbStatus;
  updatedAt: string;
}

export interface KbArticleData extends KbArticleSummary {
  body: JSONContent;
}

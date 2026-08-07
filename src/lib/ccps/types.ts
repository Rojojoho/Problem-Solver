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
  category: string | null;
  validation: string | null;
  struck: boolean;
}

// Same shape as ValidationOption — reused for the requirement-type and
// MoSCoW option lists rather than duplicating the interface.
export type LabeledOption = ValidationOption;

export interface SolutionRequirementRow {
  id: string;
  moscow: string | null;
  requirement: string;
  links: string[];
  type: string | null;
}

export interface SolutionStrategyRow {
  id: string;
  strategy: string;
  description: string;
  theoryOfAction: string;
  status: string | null;
}

export interface ImplementationRow {
  strategyId: string;
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
  moscowOptions: LabeledOption[];
  causeSuggestions: string[];
  measureSuggestions: string[];
  strategyStatuses: LabeledOption[];
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

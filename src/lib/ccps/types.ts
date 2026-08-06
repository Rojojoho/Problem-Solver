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
  sort_order: number;
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

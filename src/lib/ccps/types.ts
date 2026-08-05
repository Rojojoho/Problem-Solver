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
}

export interface ExemplarData {
  id: string;
  name: string;
  description: string | null;
  fields: Record<string, JSONContent>;
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

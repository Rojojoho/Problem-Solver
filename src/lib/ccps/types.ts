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
  // null = general feedback, not tied to one stage (e.g. left from the
  // Summary tab, which rolls up several stages rather than being one).
  stage: CcpsStage | null;
  author_name: string;
  body: string;
  created_at: string;
  resolved: boolean;
}

export interface ExemplarData {
  id: string;
  name: string;
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
  // Only ever true when fetched with includeHidden — the plan-rendering
  // call sites already exclude hidden fields at the query level, so this
  // flag is really only meaningful in the admin fields editor.
  hidden?: boolean;
}

// The sort position of the "Plan Details" and "Summary" tabs, admin-edited
// independently of the `stages` table (see 0023_workspace_tab_positions.sql
// for why they aren't just rows in that table).
// The sort position, tab name, full name, and description of the "Plan
// Details"/"Summary" synthetic tabs — see 0023_workspace_tab_positions.sql
// for why these live separately from `stages`.
export interface WorkspaceTabPosition {
  sortOrder: number;
  label: string;
  fullName: string;
  description: string;
}

export type WorkspaceTabPositions = Record<"details" | "summary", WorkspaceTabPosition>;

// Everything the public, no-login plan viewer needs — assembled once (either
// by the `get_public_plan_bundle` Postgres function or its DEV_MOCK
// equivalent), deliberately excluding anything side-panel-only (feedback,
// checklist state, exemplars) since that view never shows the side panel.
export interface PublicStageBundle {
  key: string;
  label: string;
  full_name: string;
  description: string;
  sort_order: number;
  fields: {
    field_key: string;
    internal_id: string;
    full_prompt: string;
    helper_text: string | null;
    default_content: JSONContent | null;
    sort_order: number;
  }[];
  responses: Record<string, JSONContent>;
}

export interface PublicPlanBundle {
  id: string;
  name: string;
  background: JSONContent;
  tags: string[];
  stages: PublicStageBundle[];
}

export interface StageData {
  key: string;
  label: string;
  full_name: string;
  description: string;
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
  // Knowledge items (e.g. Evidence) backing this row's Confirmed/Disconfirmed
  // call — ids only, resolved live against the same school-wide pool as
  // 3A/3B's Link columns (see KnowledgeLinkOption).
  knowledgeLinks: string[];
}

// Admin-configurable column headings for the 3.2 "Connections" traceability
// diagram popup — a single set of labels for the whole app, not a per-item
// list, so this is one object rather than a list-with-ids like the option
// tables below.
export interface DiagramHeadings {
  problem: string;
  causes: string;
  requirements: string;
  strategy: string;
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

// A link is either a live reference to another row (resolved to that row's
// *current* label wherever it's displayed — rename the source and every
// place linking to it updates automatically) or a plain string with nothing
// backing it. Both can appear side by side in the same links list.
export type LinkRef =
  | { type: "ref"; targetId: string }
  | { type: "text"; value: string }
  | { type: "knowledge"; knowledgeId: string };

export interface SolutionRequirementRow {
  id: string;
  // Visible, editable short label ("Requirement 1" by default) — the
  // human-readable identity 3B's Link column refs resolve to, same
  // free-text-identity model as 2B's Causal hypothesis cell.
  shortId: string;
  requirement: string;
  // Refs point at a 2B ConsolidatedHypothesisRow's id.
  links: LinkRef[];
  // Multiple requirement types can apply to the same requirement.
  types: string[];
}

export interface SolutionStrategyRow {
  id: string;
  strategy: string;
  description: string;
  // Refs point at a SolutionRequirementRow's id (this stage's own 3A rows).
  links: LinkRef[];
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

export interface OutcomeGroup {
  id: string;
  name: string;
  description: string;
}

export interface ImpactMeasureRow {
  id: string;
  // null = ungrouped (rendered in the table's final unlabeled section).
  groupId: string | null;
  measure: string;
  baseline: string;
  target: string;
  timeframe: string;
  type: string | null;
  actual: string;
  notes: string;
}

export interface StageBundle {
  fields: StageFieldSummary[];
  responses: Record<string, JSONContent>;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  validationOptions: ValidationOption[];
  requirementTypes: LabeledOption[];
  causeOptions: { id: string; label: string }[];
  measureSuggestions: string[];
  requirementOptions: { id: string; label: string }[];
  strategyRows: SolutionStrategyRow[];
  impactMeasureTypes: LabeledOption[];
}

export interface TagData {
  id: string;
  name: string;
}

export interface SchoolSummary {
  id: string;
  name: string;
  joinCode: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  accountsEmail: string | null;
  adminUserCode: string | null;
  // ISO date (yyyy-mm-dd), not a full timestamp — subscriptions are tracked
  // by calendar day, not time of day.
  subscriptionUntil: string | null;
  yearlyCharge: number | null;
  salesContact: string | null;
  notes: string | null;
}

export interface OrgMemberSummary {
  userId: string;
  role: "owner" | "contributor";
  displayName: string;
  email: string;
  nickname: string | null;
}

// An allow-list entry created by a school (or site) admin — a Google
// sign-in only succeeds once a matching pending_invites row exists (see
// 0030_invite_only_signup.sql). No email is sent; the admin tells the
// invited person out-of-band to sign in with this exact address.
export interface PendingInvite {
  id: string;
  email: string;
  fullName: string | null;
  nickname: string | null;
  role: "owner" | "contributor";
  createdAt: string;
}

export interface PublishedPlanSummary {
  id: string;
  sourceOrgName: string | null;
  snapshotName: string;
  snapshotCurrentStage: CcpsStage;
  status: PublishedStatus;
  createdAt: string;
  reviewNote: string | null;
  isExemplar: boolean;
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

// Reused for the knowledge-type option list — same shape as
// ValidationOption/requirement types.
export type KnowledgeTypeOption = LabeledOption;

export interface KnowledgeItemData {
  id: string;
  // null = owned by the school itself (created from School > Knowledge
  // Base), not any one plan.
  planId: string | null;
  title: string;
  description: JSONContent;
  typeId: string | null;
  typeLabel: string | null;
  sharedToSchool: boolean;
  createdByName: string;
  updatedByName: string;
  createdAt: string;
}

// The pool a 3A/3B/2.3 table-cell "Knowledge" picker selects from: this
// plan's own items only — cross-plan reuse happens explicitly via the
// Knowledge tab's "From school library" browser (copying a shared item
// into this plan first), not by linking directly into another plan's items
// from inside a table cell.
export interface KnowledgeLinkOption {
  id: string;
  title: string;
}

// The richer shape shown in the Knowledge tab's "From school library"
// browser (unlike KnowledgeLinkOption, this never includes the current
// plan's own items — see listSharedKnowledgeItems). sourcePlanId/Name are
// null when the item is owned by the school itself.
export interface SharedKnowledgeItemData {
  id: string;
  title: string;
  description: JSONContent;
  typeLabel: string | null;
  sourcePlanId: string | null;
  sourcePlanName: string;
}

// Admin-configurable menu title / screen title / description for a fixed
// set of school-facing sections — managed from
// Admin > Global Settings > Pages (web/src/components/admin/pages-settings-editor.tsx).
// Site-wide, not per-org: one shared row per key, read by TopNav and each
// section's own page.
export type PageKey = "knowledge_base" | "guide" | "users" | "school_settings";

export interface PageSettings {
  pageKey: PageKey;
  menuTitle: string;
  screenTitle: string;
  description: string;
}

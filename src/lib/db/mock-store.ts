import type { JSONContent } from "@tiptap/react";
import { paragraphDoc, EMPTY_DOC } from "@/lib/ccps/constants";
import type {
  CcpsStage,
  KbStatus,
  PublishedStatus,
} from "@/lib/supabase/database.types";
import type {
  KbArticleData,
  KbArticleSummary,
  PublishedPlanSummary,
  TagData,
} from "@/lib/ccps/types";

export const MOCK_USER_ID = "dev-user";
export const MOCK_ORG_ID = "dev-org";

// The dev-mock user is always an admin so the admin area is click-throughable
// without needing a second flag.
const admins = new Set<string>([MOCK_USER_ID]);

export function mockIsAdmin(userId: string) {
  return admins.has(userId);
}

interface MockPlan {
  id: string;
  org_id: string;
  name: string;
  current_stage: CcpsStage;
  created_at: string;
  updated_at: string;
}

interface MockFeedback {
  id: string;
  plan_id: string;
  stage: CcpsStage;
  author_name: string;
  body: string;
  created_at: string;
}

const plans = new Map<string, MockPlan>();
// key: `${planId}:${stage}:${fieldKey}`
const stageResponses = new Map<string, JSONContent>();
// key: `${planId}:${itemKey}`
const checklistState = new Map<string, boolean>();
const feedback: MockFeedback[] = [];

interface MockChecklistTemplateItem {
  id: string;
  item_key: string;
  stage: CcpsStage;
  label: string;
  sort_order: number;
}

// The mock stand-in for the global, admin-editable `checklist_items` table.
let checklistTemplate: MockChecklistTemplateItem[] = [
  { id: crypto.randomUUID(), item_key: "pi_who", stage: "PI", label: "Specifies the students (who)", sort_order: 1 },
  {
    id: crypto.randomUUID(),
    item_key: "pi_what",
    stage: "PI",
    label:
      "Specifies the precise aspect of a learning area, a behaviour, or focus of wellbeing which is problematic (what)",
    sort_order: 2,
  },
  { id: crypto.randomUUID(), item_key: "pi_gap", stage: "PI", label: "Specifies the gap", sort_order: 3 },
  {
    id: crypto.randomUUID(),
    item_key: "pi_data_source",
    stage: "PI",
    label: "Specifies the data source(s)",
    sort_order: 4,
  },
];

// The mock stand-in for `plan_checklist_items` — each plan's frozen snapshot
// of the template, taken at creation time.
const planChecklistItems = new Map<string, MockChecklistTemplateItem[]>();

export const EXEMPLARS: {
  id: string;
  name: string;
  description: string | null;
  fields: Partial<Record<CcpsStage, Record<string, JSONContent>>>;
}[] = [
  {
    id: "exemplar-cabramatta",
    name: "Cabramatta — Julie Straub (Reading)",
    description:
      "A worked example from Learn of Me (Cabramatta) tackling a Year 3-5 reading growth problem.",
    fields: {
      PI: {
        pi_problem_description: paragraphDoc(
          "Year 4 and Year 5 Reading data indicates that up to 40% of students do not make expected growth or achieve PAT-R targets.",
          "Year 3 reading data indicates that 27% of students did not reach proficient bands in Reading (NAPLAN 2025)."
        ),
        pi_outcome_data: paragraphDoc(
          "Year 3 PAT-R 2024: 33% of students did not make expected growth -> Year 4 PAT-R 2025: 42% did not make expected growth.",
          "Year 4 PAT-R 2024: 35% did not make expected growth -> Year 5 PAT-R 2025: 19% did not make expected growth.",
          "PAT Vocabulary Skills - Year 5: 35% of cohort below the mean. Year 4: 62.5% below the mean. Year 3: 55.5% below the mean."
        ),
        pi_educational_argument: paragraphDoc(
          "Fisher, Frey, Hattie, and Thayre (2017) note that while primary school students are taught basic reading and writing skills, by middle school they must navigate complex, discipline-specific texts to build knowledge. Without strong foundational reading skills, students struggle to access content across subjects, widening learning gaps and limiting academic success."
        ),
        pi_agreement_script: paragraphDoc(
          '1. State the purpose of the meeting: "The purpose of this meeting is to introduce you to a process where we will work together to review an identified problem of practice in the reading data for students in Years 3, 4, and 5."',
          '2. PI Advocacy: "Based on our most recent PAT-R data, a significant number of students across Years 3, 4, and 5 are not demonstrating expected growth in reading."',
          '3. PI Inquiry: "What do you believe this data tells us about our students’ current reading needs?"',
          '4. Check for agreement: "Do we agree that this is a priority problem in Year 3, Year 4 and Year 5?"',
          '5. Signal next steps: "We are going to find out if our hypothesis is correct, following some testing."'
        ),
      },
    },
  },
];

function now() {
  return new Date().toISOString();
}

export function mockListPlans(orgId: string) {
  return Array.from(plans.values())
    .filter((p) => p.org_id === orgId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function mockCreatePlan(orgId: string, name: string) {
  const id = crypto.randomUUID();
  const timestamp = now();
  plans.set(id, {
    id,
    org_id: orgId,
    name,
    current_stage: "PI",
    created_at: timestamp,
    updated_at: timestamp,
  });
  // Snapshot the current template, same as the real createPlanRecord does.
  planChecklistItems.set(id, checklistTemplate.map((item) => ({ ...item })));
  return { id };
}

export function mockGetPlan(id: string) {
  return plans.get(id) ?? null;
}

export function mockRenamePlan(id: string, name: string) {
  const plan = plans.get(id);
  if (!plan) return;
  plan.name = name;
  plan.updated_at = now();
}

export function mockGetStageResponses(planId: string, stage: CcpsStage) {
  const result: Record<string, JSONContent> = {};
  for (const [key, value] of stageResponses) {
    const [pId, s, fieldKey] = key.split(":");
    if (pId === planId && s === stage) {
      result[fieldKey] = value;
    }
  }
  return result;
}

export function mockSaveStageResponse(
  planId: string,
  stage: CcpsStage,
  fieldKey: string,
  content: JSONContent
) {
  stageResponses.set(`${planId}:${stage}:${fieldKey}`, content);
  const plan = plans.get(planId);
  if (plan) plan.updated_at = now();
}

export function mockGetChecklistState(planId: string) {
  const result: Record<string, boolean> = {};
  for (const [key, checked] of checklistState) {
    const [pId, itemKey] = key.split(":");
    if (pId === planId) result[itemKey] = checked;
  }
  return result;
}

export function mockToggleChecklistItem(
  planId: string,
  itemKey: string,
  checked: boolean
) {
  checklistState.set(`${planId}:${itemKey}`, checked);
}

export function mockGetPlanChecklistItems(planId: string, stage: CcpsStage) {
  return (planChecklistItems.get(planId) ?? [])
    .filter((item) => item.stage === stage)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ item_key, label, sort_order }) => ({ item_key, label, sort_order }));
}

export function mockListChecklistTemplateItems(stage: CcpsStage) {
  return checklistTemplate
    .filter((item) => item.stage === stage)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function mockCreateChecklistTemplateItem(
  stage: CcpsStage,
  itemKey: string,
  label: string,
  sortOrder: number
) {
  const id = crypto.randomUUID();
  checklistTemplate = [
    ...checklistTemplate,
    { id, item_key: itemKey, stage, label, sort_order: sortOrder },
  ];
  return { id };
}

export function mockUpdateChecklistTemplateItem(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  const item = checklistTemplate.find((i) => i.id === id);
  if (!item) return;
  if (updates.label !== undefined) item.label = updates.label;
  if (updates.sortOrder !== undefined) item.sort_order = updates.sortOrder;
}

export function mockDeleteChecklistTemplateItem(id: string) {
  checklistTemplate = checklistTemplate.filter((i) => i.id !== id);
}

export function mockGetFeedback(planId: string) {
  return feedback
    .filter((f) => f.plan_id === planId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function mockAddFeedback(
  planId: string,
  stage: CcpsStage,
  body: string
) {
  feedback.push({
    id: crypto.randomUUID(),
    plan_id: planId,
    stage,
    author_name: "Dev User (mock)",
    body,
    created_at: now(),
  });
}

// ---------------------------------------------------------------------------
// Publishing + tags
// ---------------------------------------------------------------------------

interface MockPublishedPlan {
  id: string;
  sourcePlanId: string;
  sourceOrgId: string;
  publishedBy: string;
  snapshotName: string;
  snapshotCurrentStage: CcpsStage;
  status: PublishedStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const publishedPlans = new Map<string, MockPublishedPlan>();
// key: `${publishedPlanId}:${stage}:${fieldKey}`
const publishedPlanFields = new Map<string, JSONContent>();
const tags = new Map<string, TagData>();
// key: publishedPlanId -> Set<tagId>
const publishedPlanTags = new Map<string, Set<string>>();

export function mockPublishPlan(
  planId: string,
  orgId: string,
  userId: string,
  name: string,
  currentStage: CcpsStage,
  stageFields: { stage: CcpsStage; fields: Record<string, JSONContent> }[],
  checklistState: Record<string, boolean>
) {
  const id = crypto.randomUUID();
  publishedPlans.set(id, {
    id,
    sourcePlanId: planId,
    sourceOrgId: orgId,
    publishedBy: userId,
    snapshotName: name,
    snapshotCurrentStage: currentStage,
    status: "pending",
    reviewedBy: null,
    reviewNote: null,
    createdAt: now(),
  });

  for (const { stage, fields } of stageFields) {
    for (const [fieldKey, content] of Object.entries(fields)) {
      publishedPlanFields.set(`${id}:${stage}:${fieldKey}`, content);
    }
  }
  // Checklist state isn't currently surfaced in the admin review UI, but is
  // captured here to match the real schema's snapshot shape.
  void checklistState;

  return { id };
}

export function mockGetLatestPublishedPlanForSource(planId: string) {
  const matches = Array.from(publishedPlans.values())
    .filter((p) => p.sourcePlanId === planId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = matches[0];
  return latest ? { id: latest.id, status: latest.status } : null;
}

export function mockListPublishedPlansForAdmin(
  status?: PublishedStatus
): PublishedPlanSummary[] {
  return Array.from(publishedPlans.values())
    .filter((p) => !status || p.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      id: p.id,
      sourceOrgName: p.sourceOrgId === MOCK_ORG_ID ? "Dev Organisation (mock)" : null,
      snapshotName: p.snapshotName,
      snapshotCurrentStage: p.snapshotCurrentStage,
      status: p.status,
      createdAt: p.createdAt,
      reviewNote: p.reviewNote,
      tags: Array.from(publishedPlanTags.get(p.id) ?? [])
        .map((tagId) => tags.get(tagId))
        .filter((t): t is TagData => Boolean(t)),
    }));
}

export function mockSetPublishedPlanStatus(
  id: string,
  status: PublishedStatus,
  adminUserId: string,
  note: string | null
) {
  const plan = publishedPlans.get(id);
  if (!plan) return;
  plan.status = status;
  plan.reviewedBy = adminUserId;
  plan.reviewNote = note;
}

export function mockPromoteToExemplar(
  publishedPlanId: string,
  name: string,
  description: string | null
) {
  const fields: Partial<Record<CcpsStage, Record<string, JSONContent>>> = {};
  for (const [key, content] of publishedPlanFields) {
    const [pId, stage, fieldKey] = key.split(":");
    if (pId !== publishedPlanId) continue;
    const s = stage as CcpsStage;
    fields[s] = { ...(fields[s] ?? {}), [fieldKey]: content };
  }

  const id = crypto.randomUUID();
  EXEMPLARS.push({ id, name, description, fields });
  return { id };
}

export function mockListTags(): TagData[] {
  return Array.from(tags.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function mockCreateTag(name: string): TagData {
  const existing = Array.from(tags.values()).find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const tag: TagData = { id: crypto.randomUUID(), name };
  tags.set(tag.id, tag);
  return tag;
}

export function mockTagPublishedPlan(publishedPlanId: string, tagId: string) {
  const set = publishedPlanTags.get(publishedPlanId) ?? new Set<string>();
  set.add(tagId);
  publishedPlanTags.set(publishedPlanId, set);
}

export function mockUntagPublishedPlan(publishedPlanId: string, tagId: string) {
  publishedPlanTags.get(publishedPlanId)?.delete(tagId);
}

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

interface MockKbArticle {
  id: string;
  title: string;
  body: JSONContent;
  stage: CcpsStage | null;
  status: KbStatus;
  updatedAt: string;
}

const kbArticles = new Map<string, MockKbArticle>();

export function mockListKbArticles(publishedOnly: boolean): KbArticleSummary[] {
  return Array.from(kbArticles.values())
    .filter((a) => !publishedOnly || a.status === "published")
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(({ id, title, stage, status, updatedAt }) => ({
      id,
      title,
      stage,
      status,
      updatedAt,
    }));
}

export function mockGetKbArticle(id: string): KbArticleData | null {
  const article = kbArticles.get(id);
  return article ? { ...article } : null;
}

export function mockCreateKbArticle(title: string, authorId: string | null) {
  void authorId;
  const id = crypto.randomUUID();
  kbArticles.set(id, {
    id,
    title,
    body: EMPTY_DOC,
    stage: null,
    status: "draft",
    updatedAt: now(),
  });
  return { id };
}

export function mockUpdateKbArticle(
  id: string,
  updates: {
    title?: string;
    body?: JSONContent;
    stage?: CcpsStage | null;
    status?: KbStatus;
  }
) {
  const article = kbArticles.get(id);
  if (!article) return;
  Object.assign(article, updates, { updatedAt: now() });
}

export function mockDeleteKbArticle(id: string) {
  kbArticles.delete(id);
}

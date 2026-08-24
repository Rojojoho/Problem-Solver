import type { JSONContent } from "@tiptap/react";
import { paragraphDoc, EMPTY_DOC } from "@/lib/ccps/constants";
import type {
  CcpsStage,
  KbStatus,
  PublishedStatus,
} from "@/lib/supabase/database.types";
import type {
  DiagramHeadings,
  KbArticleData,
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

interface MockOrg {
  id: string;
  name: string;
  created_at: string;
  join_code: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  accounts_email: string | null;
  admin_user_code: string | null;
  subscription_until: string | null;
  yearly_charge: number | null;
  sales_contact: string | null;
  notes: string | null;
}

interface MockOrgMember {
  org_id: string;
  user_id: string;
  role: "owner" | "contributor";
  // DEV_MOCK only ever really drives `MOCK_USER_ID` through the UI, so
  // these extra rows exist purely so the "Schools" admin/members pages
  // have something to list — not full multi-user simulation.
  display_name: string;
  email: string;
}

const organisations = new Map<string, MockOrg>([
  [
    MOCK_ORG_ID,
    {
      id: MOCK_ORG_ID,
      name: "Dev Organisation (mock)",
      created_at: new Date().toISOString(),
      join_code: "DEVMOCK1",
      primary_contact_name: null,
      primary_contact_email: null,
      accounts_email: null,
      admin_user_code: null,
      subscription_until: null,
      yearly_charge: null,
      sales_contact: null,
      notes: null,
    },
  ],
]);

const orgMembers: MockOrgMember[] = [
  {
    org_id: MOCK_ORG_ID,
    user_id: MOCK_USER_ID,
    role: "owner",
    display_name: "Dev User",
    email: "dev@example.com",
  },
];

export function mockListSchools() {
  return Array.from(organisations.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function mockCreateSchool(input: {
  name: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  accountsEmail: string | null;
  adminUserCode: string | null;
  subscriptionUntil: string | null;
  yearlyCharge: number | null;
  salesContact: string | null;
  notes: string | null;
}) {
  const id = `org-${Math.random().toString(36).slice(2, 10)}`;
  const org: MockOrg = {
    id,
    name: input.name,
    created_at: new Date().toISOString(),
    join_code: Math.random().toString(36).slice(2, 10).toUpperCase(),
    primary_contact_name: input.primaryContactName,
    primary_contact_email: input.primaryContactEmail,
    accounts_email: input.accountsEmail,
    admin_user_code: input.adminUserCode,
    subscription_until: input.subscriptionUntil,
    yearly_charge: input.yearlyCharge,
    sales_contact: input.salesContact,
    notes: input.notes,
  };
  organisations.set(id, org);
  return org;
}

export function mockUpdateSchool(
  orgId: string,
  updates: Partial<
    Pick<
      MockOrg,
      | "name"
      | "primary_contact_name"
      | "primary_contact_email"
      | "accounts_email"
      | "admin_user_code"
      | "subscription_until"
      | "yearly_charge"
      | "sales_contact"
      | "notes"
    >
  >
) {
  const org = organisations.get(orgId);
  if (!org) return;
  Object.assign(org, updates);
}

export function mockGetOrg(orgId: string) {
  return organisations.get(orgId) ?? null;
}

export function mockRegenerateJoinCode(orgId: string) {
  const org = organisations.get(orgId);
  if (!org) throw new Error("Organisation not found.");
  org.join_code = Math.random().toString(36).slice(2, 10).toUpperCase();
  return org.join_code;
}

export function mockListOrgMembers(orgId: string) {
  return orgMembers.filter((m) => m.org_id === orgId);
}

export function mockRemoveOrgMember(orgId: string, userId: string) {
  const idx = orgMembers.findIndex((m) => m.org_id === orgId && m.user_id === userId);
  if (idx !== -1) orgMembers.splice(idx, 1);
}

export function mockJoinOrgByCode(code: string, userId: string) {
  const org = Array.from(organisations.values()).find(
    (o) => o.join_code === code.trim().toUpperCase()
  );
  if (!org) throw new Error("No school found for that code.");

  const alreadyMember = orgMembers.some((m) => m.org_id === org.id && m.user_id === userId);
  const oldMembership = orgMembers.find((m) => m.user_id === userId);

  if (!alreadyMember) {
    orgMembers.push({
      org_id: org.id,
      user_id: userId,
      role: "contributor",
      display_name: "Dev User",
      email: "dev@example.com",
    });
  }

  // Mirrors join_org_by_code() in 0025_school_crm_and_join_codes.sql: leave
  // the org the user was in before, and delete it too if that won't
  // destroy anyone's real work.
  if (oldMembership && oldMembership.org_id !== org.id) {
    const oldOrgId = oldMembership.org_id;
    const oldOrgPlanCount = Array.from(plans.values()).filter((p) => p.org_id === oldOrgId).length;
    const oldOrgMemberCount = orgMembers.filter((m) => m.org_id === oldOrgId).length;

    const idx = orgMembers.findIndex((m) => m.org_id === oldOrgId && m.user_id === userId);
    if (idx !== -1) orgMembers.splice(idx, 1);

    if (oldOrgPlanCount === 0 && oldOrgMemberCount === 1) {
      organisations.delete(oldOrgId);
    }
  }

  return { orgId: org.id, orgName: org.name };
}

export function mockGetCurrentOrgForUser(userId: string) {
  const membership = orgMembers.find((m) => m.user_id === userId);
  if (!membership) return null;
  const org = organisations.get(membership.org_id);
  if (!org) return null;
  return { orgId: org.id, orgName: org.name, role: membership.role, joinCode: org.join_code };
}

interface MockPlan {
  id: string;
  org_id: string;
  name: string;
  current_stage: CcpsStage;
  background: JSONContent | null;
  created_at: string;
  updated_at: string;
  share_token: string | null;
  share_enabled: boolean;
}

interface MockFeedback {
  id: string;
  plan_id: string;
  stage: CcpsStage | null;
  author_name: string;
  body: string;
  created_at: string;
  resolved: boolean;
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

interface MockStageField {
  field_key: string;
  internal_id: string;
  stage: CcpsStage;
  short_name: string;
  full_prompt: string;
  helper_text: string | null;
  default_content: JSONContent | null;
  sort_order: number;
  hidden: boolean;
}

// The mock stand-in for the global `stage_fields` reference table — a fixed
// set of fields (matching the real migration seed), with admin-editable
// display text. Not a per-plan snapshot.
const stageFields: MockStageField[] = (
  [
  {
    field_key: "pi_problem_description",
    internal_id: "1.1",
    stage: "PI",
    short_name: "Problem Description",
    full_prompt: "Describe the student outcome problem",
    helper_text: "Be as precise as you can.",
    default_content: null,
    sort_order: 1,
  },
  {
    field_key: "pi_outcome_data",
    internal_id: "1.2",
    stage: "PI",
    short_name: "Student Data",
    full_prompt: "Insert the student outcome data",
    helper_text: "The data that tells you that this is a problem.",
    default_content: null,
    sort_order: 2,
  },
  {
    field_key: "pi_educational_argument",
    internal_id: "1.3",
    stage: "PI",
    short_name: "Educational Argument",
    full_prompt: "Make an educational argument",
    helper_text: "Why is this problem the priority?",
    default_content: null,
    sort_order: 3,
  },
  {
    field_key: "pi_agreement_script",
    internal_id: "1.4",
    stage: "PI",
    short_name: "Agreement Script",
    full_prompt:
      "Describe/script what you might say to check for Stage 1 agreement",
    helper_text: null,
    default_content: paragraphDoc(
      "1. State the purpose of the meeting as seeking agreement about the problem or challenge to be addressed",
      "2. Present your own priority, supported by evidence and an educational argument (as outlined above)",
      "3. Inquire for staff reaction to your suggested priority and inquire about any alternatives.",
      "4. Check for agreement about the priority.",
      "5. Signal the next steps in the process."
    ),
    sort_order: 4,
  },
  {
    field_key: "pc_meeting_plan",
    internal_id: "2.1",
    stage: "PC",
    short_name: "Meeting Plan",
    full_prompt:
      "Plan the meetings that will be required in order to inquire into causal hypotheses",
    helper_text: null,
    default_content: null,
    sort_order: 1,
  },
  {
    field_key: "pc_causal_hypotheses",
    internal_id: "2.2",
    stage: "PC",
    short_name: "Causal Hypotheses",
    full_prompt: "Add Causal hypothesis gathered",
    helper_text:
      'List all causal hypotheses gathered. Use the sentence stem "A possible cause of [the student outcome problem] is …"',
    default_content: null,
    sort_order: 2,
  },
  {
    field_key: "cv_consolidated_hypotheses",
    internal_id: "2.3",
    stage: "CV",
    short_name: "Consolidated Hypotheses",
    full_prompt:
      "Consolidate and reduce your causal hypotheses to capture the main themes in your original list.",
    helper_text: null,
    default_content: null,
    sort_order: 1,
  },
  {
    field_key: "cv_validated_causal_story",
    internal_id: "2.4",
    stage: "CV",
    short_name: "Validated Causal Story",
    full_prompt:
      "Use your validated causal hypotheses to write a causal story that explains your PI.",
    helper_text: "The problem of…is explained by…and…and…",
    default_content: null,
    sort_order: 2,
  },
  {
    field_key: "sr_solution_requirements",
    internal_id: "3.1",
    stage: "SR",
    short_name: "Solution Requirements",
    full_prompt:
      "Solution requirements are an interacting set of conditions your solution strategies must satisfy.",
    helper_text: null,
    default_content: null,
    sort_order: 1,
  },
  {
    field_key: "ss_solution_strategies",
    internal_id: "3.2",
    stage: "SS",
    short_name: "Solution Strategies",
    full_prompt:
      "Identify possible solution strategies (initiatives) to meet your agreed solution requirements.",
    helper_text: null,
    default_content: null,
    sort_order: 1,
  },
  {
    field_key: "im_implementation_monitoring",
    internal_id: "4.1",
    stage: "IM",
    short_name: "Implement & Monitor",
    full_prompt: "Implement and monitor your solution strategies.",
    helper_text: null,
    default_content: null,
    sort_order: 1,
  },
  {
    field_key: "im_reflections",
    internal_id: "4.2",
    stage: "IM",
    short_name: "Reflections",
    full_prompt:
      "What have you learnt about what works and what does not work in implementation? What might you need to do differently next term?",
    helper_text: null,
    default_content: null,
    sort_order: 2,
  },
  {
    field_key: "im_next_term_plan",
    internal_id: "4.3",
    stage: "IM",
    short_name: "Next Term Plan",
    full_prompt: "Write your implementation plan for the following term.",
    helper_text: null,
    default_content: null,
    sort_order: 3,
  },
  {
    field_key: "ei_impact_measures",
    internal_id: "5.1",
    stage: "EI",
    short_name: "Impact Measures",
    full_prompt: "Track each measure against its target to evaluate impact.",
    helper_text: null,
    default_content: null,
    sort_order: 1,
  },
  ] as Omit<MockStageField, "hidden">[]
).map((f) => ({ ...f, hidden: false }));

interface MockStage {
  key: string;
  label: string;
  sort_order: number;
}

// The mock stand-in for the global, admin-editable `stages` table.
let stages: MockStage[] = [
  { key: "PI", label: "1 Improvement", sort_order: 1 },
  { key: "PC", label: "2A Causes", sort_order: 2 },
  { key: "CV", label: "2B Validated Causes", sort_order: 3 },
  { key: "SR", label: "3A Requirements", sort_order: 4 },
  { key: "SS", label: "3B Solutions", sort_order: 5 },
  { key: "IM", label: "4 Implement", sort_order: 6 },
  { key: "EI", label: "5 Impact", sort_order: 7 },
];

export function mockListStages() {
  return stages.slice().sort((a, b) => a.sort_order - b.sort_order);
}

export function mockCreateStage(key: string, label: string, sortOrder: number) {
  stages = [...stages, { key, label, sort_order: sortOrder }];
  return { key };
}

export function mockUpdateStage(
  key: string,
  updates: { label?: string; sortOrder?: number }
) {
  const stage = stages.find((s) => s.key === key);
  if (!stage) return;
  if (updates.label !== undefined) stage.label = updates.label;
  if (updates.sortOrder !== undefined) stage.sort_order = updates.sortOrder;
}

// The mock stand-in for the `workspace_tab_positions` table — kept
// separate from `stages` (see 0023_workspace_tab_positions.sql) so
// "Plan Details"/"Summary" don't leak into the places that assume
// `stages` is exactly the 7 real content stages.
const workspaceTabPositions: { details: number; summary: number } = {
  details: -2,
  summary: -1,
};

export function mockGetWorkspaceTabPositions() {
  return { ...workspaceTabPositions };
}

export function mockUpdateWorkspaceTabPosition(
  key: "details" | "summary",
  sortOrder: number
) {
  workspaceTabPositions[key] = sortOrder;
}

interface MockValidationOption {
  id: string;
  label: string;
  sort_order: number;
}

// The mock stand-in for the global, admin-editable `validation_options` table.
let validationOptions: MockValidationOption[] = [
  { id: crypto.randomUUID(), label: "Possible", sort_order: 1 },
  { id: crypto.randomUUID(), label: "Parked", sort_order: 2 },
];

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
    background: null,
    created_at: timestamp,
    updated_at: timestamp,
    share_token: null,
    share_enabled: false,
  });
  // Snapshot the current checklist template, same as the real createPlanRecord does.
  planChecklistItems.set(id, checklistTemplate.map((item) => ({ ...item })));
  return { id };
}

export function mockGetPlan(id: string) {
  return plans.get(id) ?? null;
}

export function mockEnablePlanShare(id: string): string | null {
  const plan = plans.get(id);
  if (!plan) return null;
  const token = crypto.randomUUID();
  plan.share_token = token;
  plan.share_enabled = true;
  return token;
}

export function mockDisablePlanShare(id: string) {
  const plan = plans.get(id);
  if (!plan) return;
  plan.share_enabled = false;
  plan.share_token = null;
}

export function mockGetPublicPlanBundle(token: string) {
  const plan = Array.from(plans.values()).find(
    (p) => p.share_token === token && p.share_enabled
  );
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    background: plan.background ?? { type: "doc", content: [] },
    tags: mockGetPlanTags(plan.id),
    stages: mockListStages().map((s) => ({
      key: s.key,
      label: s.label,
      sort_order: s.sort_order,
      fields: mockGetStageFields(s.key as CcpsStage),
      responses: mockGetStageResponses(plan.id, s.key as CcpsStage),
    })),
  };
}

export function mockRenamePlan(id: string, name: string) {
  const plan = plans.get(id);
  if (!plan) return;
  plan.name = name;
  plan.updated_at = now();
}

export function mockDeletePlan(id: string) {
  plans.delete(id);
  planChecklistItems.delete(id);
  planTags.delete(id);

  for (const key of stageResponses.keys()) {
    if (key.startsWith(`${id}:`)) stageResponses.delete(key);
  }
  for (const key of checklistState.keys()) {
    if (key.startsWith(`${id}:`)) checklistState.delete(key);
  }
  for (let i = feedback.length - 1; i >= 0; i--) {
    if (feedback[i].plan_id === id) feedback.splice(i, 1);
  }
}

export function mockSaveBackground(id: string, content: JSONContent) {
  const plan = plans.get(id);
  if (!plan) return;
  plan.background = content;
  plan.updated_at = now();
}

const planTags = new Map<string, Set<string>>();

export function mockGetPlanTags(planId: string): string[] {
  return Array.from(planTags.get(planId) ?? []);
}

export function mockAddPlanTag(planId: string, tag: string) {
  const set = planTags.get(planId) ?? new Set<string>();
  set.add(tag);
  planTags.set(planId, set);
}

export function mockRemovePlanTag(planId: string, tag: string) {
  planTags.get(planId)?.delete(tag);
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

export function mockGetStageFields(
  stage: CcpsStage,
  { includeHidden = false }: { includeHidden?: boolean } = {}
) {
  return stageFields
    .filter((field) => field.stage === stage && (includeHidden || !field.hidden))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      ({
        field_key,
        internal_id,
        short_name,
        full_prompt,
        helper_text,
        default_content,
        sort_order,
        hidden,
      }) => ({
        field_key,
        internal_id,
        short_name,
        full_prompt,
        helper_text,
        default_content,
        sort_order,
        hidden,
      })
    );
}

export function mockUpdateStageField(
  fieldKey: string,
  updates: {
    shortName?: string;
    fullPrompt?: string;
    helperText?: string | null;
    defaultContent?: JSONContent | null;
    sortOrder?: number;
    hidden?: boolean;
  }
) {
  const field = stageFields.find((f) => f.field_key === fieldKey);
  if (!field) return;
  if (updates.shortName !== undefined) field.short_name = updates.shortName;
  if (updates.fullPrompt !== undefined) field.full_prompt = updates.fullPrompt;
  if (updates.helperText !== undefined) field.helper_text = updates.helperText;
  if (updates.defaultContent !== undefined) field.default_content = updates.defaultContent;
  if (updates.sortOrder !== undefined) field.sort_order = updates.sortOrder;
  if (updates.hidden !== undefined) field.hidden = updates.hidden;
}

export function mockListValidationOptions() {
  return validationOptions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, label, sort_order }) => ({ id, label, sort_order }));
}

export function mockCreateValidationOption(label: string, sortOrder: number) {
  const id = crypto.randomUUID();
  validationOptions = [
    ...validationOptions,
    { id, label, sort_order: sortOrder },
  ];
  return { id };
}

export function mockUpdateValidationOption(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  const option = validationOptions.find((o) => o.id === id);
  if (!option) return;
  if (updates.label !== undefined) option.label = updates.label;
  if (updates.sortOrder !== undefined) option.sort_order = updates.sortOrder;
}

export function mockDeleteValidationOption(id: string) {
  validationOptions = validationOptions.filter((o) => o.id !== id);
}

interface MockLabeledOption {
  id: string;
  label: string;
  sort_order: number;
}

// The mock stand-in for the global, admin-editable singleton
// `diagram_settings` row.
let diagramHeadings: DiagramHeadings = {
  problem: "The problem to be solved is",
  causes: "The agreed causes that contribute to this problem are",
  requirements: "A solution will need to meet the following requirements",
  strategy: "A solution strategy is",
};

export function mockGetDiagramHeadings(): DiagramHeadings {
  return { ...diagramHeadings };
}

export function mockUpdateDiagramHeadings(updates: Partial<DiagramHeadings>) {
  diagramHeadings = { ...diagramHeadings, ...updates };
}

// The mock stand-in for the global, admin-editable `requirement_types` table.
let requirementTypes: MockLabeledOption[] = [
  { id: crypto.randomUUID(), label: "Resource", sort_order: 1 },
  { id: crypto.randomUUID(), label: "Improvement", sort_order: 2 },
  { id: crypto.randomUUID(), label: "Learning", sort_order: 3 },
  { id: crypto.randomUUID(), label: "Accountability", sort_order: 4 },
];

export function mockListRequirementTypes() {
  return requirementTypes
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, label, sort_order }) => ({ id, label, sort_order }));
}

export function mockCreateRequirementType(label: string, sortOrder: number) {
  const id = crypto.randomUUID();
  requirementTypes = [...requirementTypes, { id, label, sort_order: sortOrder }];
  return { id };
}

export function mockUpdateRequirementType(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  const option = requirementTypes.find((o) => o.id === id);
  if (!option) return;
  if (updates.label !== undefined) option.label = updates.label;
  if (updates.sortOrder !== undefined) option.sort_order = updates.sortOrder;
}

export function mockDeleteRequirementType(id: string) {
  requirementTypes = requirementTypes.filter((o) => o.id !== id);
}

// The mock stand-in for the global, admin-editable `impact_measure_types` table.
let impactMeasureTypes: MockLabeledOption[] = [
  { id: crypto.randomUUID(), label: "Short term", sort_order: 1 },
  { id: crypto.randomUUID(), label: "Long term", sort_order: 2 },
];

export function mockListImpactMeasureTypes() {
  return impactMeasureTypes
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, label, sort_order }) => ({ id, label, sort_order }));
}

export function mockCreateImpactMeasureType(label: string, sortOrder: number) {
  const id = crypto.randomUUID();
  impactMeasureTypes = [...impactMeasureTypes, { id, label, sort_order: sortOrder }];
  return { id };
}

export function mockUpdateImpactMeasureType(
  id: string,
  updates: { label?: string; sortOrder?: number }
) {
  const option = impactMeasureTypes.find((o) => o.id === id);
  if (!option) return;
  if (updates.label !== undefined) option.label = updates.label;
  if (updates.sortOrder !== undefined) option.sort_order = updates.sortOrder;
}

export function mockDeleteImpactMeasureType(id: string) {
  impactMeasureTypes = impactMeasureTypes.filter((o) => o.id !== id);
}

export function mockGetFeedback(planId: string) {
  return feedback
    .filter((f) => f.plan_id === planId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function mockAddFeedback(
  planId: string,
  stage: CcpsStage | null,
  body: string
) {
  feedback.push({
    id: crypto.randomUUID(),
    plan_id: planId,
    stage,
    author_name: "Dev User (mock)",
    body,
    created_at: now(),
    resolved: false,
  });
}

export function mockToggleFeedbackResolved(
  feedbackId: string,
  resolved: boolean,
  userId: string | null
) {
  void userId;
  const item = feedback.find((f) => f.id === feedbackId);
  if (item) item.resolved = resolved;
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

export function mockListKbArticles(publishedOnly: boolean): KbArticleData[] {
  return Array.from(kbArticles.values())
    .filter((a) => !publishedOnly || a.status === "published")
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((a) => ({ ...a }));
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

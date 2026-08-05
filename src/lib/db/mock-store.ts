import type { JSONContent } from "@tiptap/react";
import { paragraphDoc } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";

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

export const CHECKLIST_ITEMS: Record<
  CcpsStage,
  { item_key: string; label: string; sort_order: number }[]
> = {
  PI: [
    { item_key: "pi_who", label: "Specifies the students (who)", sort_order: 1 },
    {
      item_key: "pi_what",
      label:
        "Specifies the precise aspect of a learning area, a behaviour, or focus of wellbeing which is problematic (what)",
      sort_order: 2,
    },
    { item_key: "pi_gap", label: "Specifies the gap", sort_order: 3 },
    {
      item_key: "pi_data_source",
      label: "Specifies the data source(s)",
      sort_order: 4,
    },
  ],
  PC: [],
  SR: [],
  SS: [],
  EI: [],
};

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

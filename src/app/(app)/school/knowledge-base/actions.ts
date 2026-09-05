"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/org";
import {
  createKnowledgeItemRecord,
  updateKnowledgeItemRecord,
  deleteKnowledgeItemRecord,
  getKnowledgeItemPlanId,
  type KnowledgeItemInput,
} from "@/lib/db";

export async function createSchoolKnowledgeItem(input: KnowledgeItemInput) {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const { orgId } = await getCurrentOrg();
  await createKnowledgeItemRecord(null, orgId, { ...input, title });
  revalidatePath("/school/knowledge-base");
}

// Only items owned by the school itself (plan_id null) are editable from
// this page — a plan-owned item stays editable only from that plan's own
// Knowledge tab (see requireOwnedKnowledgeItem in plans/[id]/actions.ts).
async function requireSchoolOwnedKnowledgeItem(id: string) {
  const ownerPlanId = await getKnowledgeItemPlanId(id);
  if (ownerPlanId !== null) {
    throw new Error("This knowledge item isn't editable from here.");
  }
}

export async function updateSchoolKnowledgeItem(
  id: string,
  updates: Partial<KnowledgeItemInput>
) {
  await requireSchoolOwnedKnowledgeItem(id);
  await updateKnowledgeItemRecord(id, updates);
  revalidatePath("/school/knowledge-base");
}

export async function deleteSchoolKnowledgeItem(id: string) {
  await requireSchoolOwnedKnowledgeItem(id);
  await deleteKnowledgeItemRecord(id);
  revalidatePath("/school/knowledge-base");
}

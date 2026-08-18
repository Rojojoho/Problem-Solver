"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import {
  createPlanRecord,
  deletePlanRecord,
  deletePlanRecords,
  saveBackgroundRecord,
  addPlanTagRecord,
  saveStageResponseRecord,
} from "@/lib/db";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { PlanExport } from "@/app/plans/[id]/actions";

export async function createPlan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Plan name is required.");
  }

  const { orgId, userId } = await getCurrentOrg();
  const { id } = await createPlanRecord(orgId, userId, name);

  revalidatePath("/plans");
  redirect(`/plans/${id}`);
}

export async function deletePlan(planId: string) {
  await deletePlanRecord(planId);
  revalidatePath("/plans");
}

export async function deletePlans(planIds: string[]) {
  if (!planIds.length) return;
  await deletePlanRecords(planIds);
  revalidatePath("/plans");
}

// Counterpart to exportPlan (plans/[id]/actions.ts) — takes an exported
// plan's JSON file and recreates it as a brand-new plan in the current
// org. Meant for quickly moving a plan between two environments that
// don't share a database (e.g. local dev vs. the Vercel-deployed app),
// not as a general backup/restore tool.
export async function importPlan(formData: FormData): Promise<{ id: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Choose an exported plan file first.");
  }

  let data: PlanExport;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (typeof data?.name !== "string" || typeof data?.responses !== "object") {
    throw new Error("That doesn't look like an exported plan file.");
  }

  const { orgId, userId } = await getCurrentOrg();
  const { id } = await createPlanRecord(orgId, userId, data.name);

  await saveBackgroundRecord(id, data.background ?? { type: "doc", content: [] });
  await Promise.all((data.tags ?? []).map((tag) => addPlanTagRecord(id, tag)));

  const writes: Promise<void>[] = [];
  for (const [stage, fields] of Object.entries(data.responses ?? {})) {
    for (const [fieldKey, content] of Object.entries(fields)) {
      writes.push(
        saveStageResponseRecord(id, stage as CcpsStage, fieldKey, content, userId)
      );
    }
  }
  await Promise.all(writes);

  revalidatePath("/plans");
  return { id };
}

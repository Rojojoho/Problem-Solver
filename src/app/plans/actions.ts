"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import { createPlanRecord } from "@/lib/db";

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

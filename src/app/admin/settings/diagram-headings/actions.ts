"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { updateDiagramHeadingsRecord } from "@/lib/db";
import type { DiagramHeadings } from "@/lib/ccps/types";

export async function updateDiagramHeadings(headings: DiagramHeadings) {
  await requireAdmin();

  const trimmed: DiagramHeadings = {
    problem: headings.problem.trim(),
    causes: headings.causes.trim(),
    requirements: headings.requirements.trim(),
    strategy: headings.strategy.trim(),
  };
  if (!trimmed.problem || !trimmed.causes || !trimmed.requirements || !trimmed.strategy) {
    throw new Error("All four headings are required.");
  }

  await updateDiagramHeadingsRecord(trimmed);
  revalidatePath("/admin/settings/diagram-headings");
}

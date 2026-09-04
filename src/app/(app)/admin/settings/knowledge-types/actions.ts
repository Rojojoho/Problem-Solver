"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listKnowledgeTypes,
  createKnowledgeTypeRecord,
  updateKnowledgeTypeRecord,
  deleteKnowledgeTypeRecord,
} from "@/lib/db";

export async function createKnowledgeType(formData: FormData) {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Label is required.");

  const existing = await listKnowledgeTypes();
  const nextSortOrder = Math.max(0, ...existing.map((o) => o.sort_order)) + 1;

  await createKnowledgeTypeRecord(label, nextSortOrder);
  revalidatePath("/admin/settings/knowledge-types");
}

export async function updateKnowledgeType(
  id: string,
  label: string,
  sortOrder: number
) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");

  await updateKnowledgeTypeRecord(id, { label: trimmed, sortOrder });
  revalidatePath("/admin/settings/knowledge-types");
}

export async function deleteKnowledgeType(id: string) {
  await requireAdmin();
  await deleteKnowledgeTypeRecord(id);
  revalidatePath("/admin/settings/knowledge-types");
}

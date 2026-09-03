"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  approvePublishedPlanRecord,
  rejectPublishedPlanRecord,
  setPublishedPlanExemplarRecord,
  createTagRecord,
  tagPublishedPlanRecord,
  untagPublishedPlanRecord,
} from "@/lib/db";

export async function approvePublishedPlan(id: string) {
  const adminUserId = await requireAdmin();
  await approvePublishedPlanRecord(id, adminUserId);
  revalidatePath("/admin/review");
}

export async function rejectPublishedPlan(id: string, note: string) {
  const adminUserId = await requireAdmin();
  await rejectPublishedPlanRecord(id, adminUserId, note.trim() || null);
  revalidatePath("/admin/review");
}

export async function setExemplarStatus(
  publishedPlanId: string,
  isExemplar: boolean
) {
  await requireAdmin();
  await setPublishedPlanExemplarRecord(publishedPlanId, isExemplar);
  revalidatePath("/admin/review");
}

export async function tagPublishedPlan(publishedPlanId: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return;

  const tag = await createTagRecord(trimmed);
  await tagPublishedPlanRecord(publishedPlanId, tag.id);
  revalidatePath("/admin/review");
}

export async function untagPublishedPlan(
  publishedPlanId: string,
  tagId: string
) {
  await requireAdmin();
  await untagPublishedPlanRecord(publishedPlanId, tagId);
  revalidatePath("/admin/review");
}

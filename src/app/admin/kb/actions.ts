"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { requireAdmin } from "@/lib/admin";
import type { CcpsStage, KbStatus } from "@/lib/supabase/database.types";
import {
  createKbArticleRecord,
  updateKbArticleRecord,
  deleteKbArticleRecord,
} from "@/lib/db";

export async function createKbArticle(formData: FormData) {
  const userId = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const { id } = await createKbArticleRecord(title, userId);
  revalidatePath("/admin/kb");
  redirect(`/admin/kb/${id}`);
}

export async function updateKbArticleBody(id: string, body: JSONContent) {
  await requireAdmin();
  await updateKbArticleRecord(id, { body });
  revalidatePath(`/admin/kb/${id}`);
}

export async function updateKbArticleMeta(
  id: string,
  title: string,
  stage: CcpsStage | null
) {
  await requireAdmin();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required.");

  await updateKbArticleRecord(id, { title: trimmed, stage });
  revalidatePath(`/admin/kb/${id}`);
  revalidatePath("/admin/kb");
}

export async function setKbArticleStatus(id: string, status: KbStatus) {
  await requireAdmin();
  await updateKbArticleRecord(id, { status });
  revalidatePath(`/admin/kb/${id}`);
  revalidatePath("/admin/kb");
  revalidatePath("/kb");
}

export async function deleteKbArticle(id: string) {
  await requireAdmin();
  await deleteKbArticleRecord(id);
  revalidatePath("/admin/kb");
  redirect("/admin/kb");
}

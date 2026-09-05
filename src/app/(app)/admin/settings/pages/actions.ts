"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { updatePageSettingRecord } from "@/lib/db";
import type { PageKey } from "@/lib/ccps/types";

export async function updatePageSetting(
  pageKey: PageKey,
  updates: { menuTitle: string; screenTitle: string; description: string }
) {
  await requireAdmin();

  const menuTitle = updates.menuTitle.trim();
  const screenTitle = updates.screenTitle.trim();
  if (!menuTitle) throw new Error("Menu title is required.");
  if (!screenTitle) throw new Error("Screen title is required.");

  await updatePageSettingRecord(pageKey, {
    menuTitle,
    screenTitle,
    description: updates.description.trim(),
  });

  // This data feeds TopNav, which renders on every authenticated page via
  // (app)/layout.tsx — a single revalidatePath wouldn't reach the rest of
  // the tree, so bust the whole layout instead of just this route.
  revalidatePath("/", "layout");
}

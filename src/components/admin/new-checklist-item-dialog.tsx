"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/ccps/slugify";
import type { CcpsStage } from "@/lib/supabase/database.types";
import { createChecklistTemplateItem } from "@/app/(app)/admin/settings/checklists/actions";

export function NewChecklistItemDialog({ stage }: { stage: CcpsStage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState("");

  const previewKey = label ? `${stage.toLowerCase()}_${slugify(label)}` : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setLabel("");
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Add item</DialogTrigger>
      <DialogContent>
        <form
          action={async (formData) => {
            setPending(true);
            try {
              await createChecklistTemplateItem(formData);
              toast.success("Checklist item added.");
              setOpen(false);
              setLabel("");
              router.refresh();
            } catch {
              toast.error("Couldn't add that item.");
            } finally {
              setPending(false);
            }
          }}
        >
          <input type="hidden" name="stage" value={stage} />
          <DialogHeader>
            <DialogTitle>Add checklist item</DialogTitle>
            <DialogDescription>
              This item will appear on plans created from now on — existing
              plans are unaffected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              name="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Specifies the students (who)"
              required
              autoFocus
              className="mt-2"
            />
            {previewKey && (
              <p className="mt-1 text-xs text-muted-foreground">
                Key: {previewKey}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

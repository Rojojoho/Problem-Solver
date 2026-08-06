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
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/ccps/slugify";
import type { CcpsStage } from "@/lib/supabase/database.types";
import { createStageFieldTemplate } from "@/app/admin/settings/fields/actions";

export function NewStageFieldDialog({ stage }: { stage: CcpsStage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [shortName, setShortName] = useState("");

  const previewKey = shortName
    ? `${stage.toLowerCase()}_${slugify(shortName)}`
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setShortName("");
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Add field</DialogTrigger>
      <DialogContent>
        <form
          action={async (formData) => {
            setPending(true);
            try {
              await createStageFieldTemplate(formData);
              toast.success("Field added.");
              setOpen(false);
              setShortName("");
              router.refresh();
            } catch {
              toast.error("Couldn't add that field.");
            } finally {
              setPending(false);
            }
          }}
        >
          <input type="hidden" name="stage" value={stage} />
          <DialogHeader>
            <DialogTitle>Add stage field</DialogTitle>
            <DialogDescription>
              This field will appear on plans created from now on — existing
              plans are unaffected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label htmlFor="shortName">Short name</Label>
              <Input
                id="shortName"
                name="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Student Data"
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
            <div>
              <Label htmlFor="fullPrompt">Full prompt</Label>
              <Textarea
                id="fullPrompt"
                name="fullPrompt"
                placeholder="e.g. Insert the student data that tells you there is a gap to be addressed"
                required
                rows={2}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="helperText">Helper text (optional)</Label>
              <Input id="helperText" name="helperText" className="mt-2" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

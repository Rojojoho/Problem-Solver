"use client";

import { useState } from "react";
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
import { createPlan } from "@/app/plans/actions";

export function NewPlanDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New plan</Button>} />
      <DialogContent>
        <form
          action={async (formData) => {
            setPending(true);
            try {
              await createPlan(formData);
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Create a new plan</DialogTitle>
            <DialogDescription>
              Give your problem-solving plan a name. You can add detail once
              it&apos;s created.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Plan name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Year 3-5 Reading Growth"
              required
              autoFocus
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

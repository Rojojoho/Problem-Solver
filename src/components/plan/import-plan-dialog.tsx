"use client";

import { useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { importPlan } from "@/app/plans/actions";

// Counterpart to ExportPlanButton on a plan's own page — takes a
// previously-exported JSON file and recreates it as a new plan here.
// Meant for quickly moving a plan between two environments that don't
// share a database (e.g. local dev vs. the Vercel-deployed app).
export function ImportPlanDialog() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const { id } = await importPlan(new FormData(e.currentTarget));
      setOpen(false);
      formRef.current?.reset();
      router.push(`/plans/${id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't import that file."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Import plan</Button>} />
      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import a plan</DialogTitle>
            <DialogDescription>
              Choose a JSON file previously downloaded via a plan&apos;s Export
              button. This creates a brand-new plan here — it won&apos;t
              overwrite anything.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="file">Exported plan file</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/json"
              required
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-foreground"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

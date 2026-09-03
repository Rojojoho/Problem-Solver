"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { createSchool, updateSchool } from "@/app/(app)/admin/schools/actions";
import type { SchoolSummary } from "@/lib/ccps/types";

function subscriptionBadge(subscriptionUntil: string | null) {
  if (!subscriptionUntil) {
    return <Badge variant="secondary">No sub</Badge>;
  }
  const isExpired = new Date(subscriptionUntil) < new Date();
  return (
    <div className="space-y-0.5">
      <Badge variant={isExpired ? "destructive" : "success"}>
        {isExpired ? "Expired" : "Active"}
      </Badge>
      <p className="text-xs text-muted-foreground">{subscriptionUntil}</p>
    </div>
  );
}

export function SchoolsTable({ schools }: { schools: SchoolSummary[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolSummary | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" />
                Add School
              </Button>
            }
          />
          <DialogContent className="max-w-lg">
            <SchoolForm
              onDone={() => setAddOpen(false)}
              action={async (formData) => {
                await createSchool(formData);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Primary contact</th>
              <th className="px-4 py-3">Accounts email</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Charge</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium">{school.name}</td>
                <td className="px-4 py-3">
                  <div>{school.primaryContactName ?? "—"}</div>
                  {school.primaryContactEmail && (
                    <div className="text-xs text-muted-foreground">
                      {school.primaryContactEmail}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{school.accountsEmail ?? "—"}</td>
                <td className="px-4 py-3">{subscriptionBadge(school.subscriptionUntil)}</td>
                <td className="px-4 py-3">
                  {school.yearlyCharge != null ? `$${school.yearlyCharge.toFixed(2)}` : "Free"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(school)}>
                      Edit
                    </Button>
                    <Link href={`/admin/schools/${school.id}/users`}>
                      <Button size="sm" variant="outline-primary">
                        <Users className="size-3.5" />
                        Users
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {schools.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No schools yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          {editing && (
            <SchoolForm
              school={editing}
              onDone={() => setEditing(null)}
              action={async (formData) => {
                await updateSchool(editing.id, formData);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchoolForm({
  school,
  action,
  onDone,
}: {
  school?: SchoolSummary;
  action: (formData: FormData) => Promise<void>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        try {
          await action(formData);
          toast.success(school ? "School updated." : "School created.");
          router.refresh();
          onDone();
        } catch {
          toast.error("Couldn't save that school.");
        } finally {
          setPending(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{school ? "Edit school" : "Add new school"}</DialogTitle>
        <DialogDescription>
          {school
            ? "Update this school's contact and billing details."
            : "Pre-provision a school before anyone there has signed up. Hand them the join code from the Users page afterward."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">School name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={school?.name}
            required
            autoFocus
            className="mt-1"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="primaryContactName">Primary contact name</Label>
            <Input
              id="primaryContactName"
              name="primaryContactName"
              defaultValue={school?.primaryContactName ?? ""}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="primaryContactEmail">Primary contact email</Label>
            <Input
              id="primaryContactEmail"
              name="primaryContactEmail"
              type="email"
              defaultValue={school?.primaryContactEmail ?? ""}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="adminUserCode">Admin user code</Label>
          <Input
            id="adminUserCode"
            name="adminUserCode"
            placeholder="e.g. JD"
            defaultValue={school?.adminUserCode ?? ""}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="accountsEmail">Accounts email</Label>
          <Input
            id="accountsEmail"
            name="accountsEmail"
            type="email"
            defaultValue={school?.accountsEmail ?? ""}
            className="mt-1"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="subscriptionUntil">Subscription until</Label>
            <Input
              id="subscriptionUntil"
              name="subscriptionUntil"
              type="date"
              defaultValue={school?.subscriptionUntil ?? ""}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="yearlyCharge">Yearly charge ($)</Label>
            <Input
              id="yearlyCharge"
              name="yearlyCharge"
              type="number"
              step="0.01"
              defaultValue={school?.yearlyCharge ?? ""}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="salesContact">Sales / key contact</Label>
          <Input
            id="salesContact"
            name="salesContact"
            placeholder="e.g. Rowan Johanson / The Education Group"
            defaultValue={school?.salesContact ?? ""}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Additional notes about this school…"
            defaultValue={school?.notes ?? ""}
            rows={3}
            className="mt-1"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : school ? "Save changes" : "Create School"}
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgMembersList } from "@/components/admin/org-members-list";
import type { OrgMemberSummary, PendingInvite } from "@/lib/ccps/types";

const ROLE_LABEL: Record<PendingInvite["role"], string> = {
  owner: "Admin",
  contributor: "User",
};

export interface InviteInput {
  email: string;
  fullName: string;
  nickname: string;
  role: "owner" | "contributor";
}

// Reused by both the school-admin Users page (school/users) and the
// site-admin's per-school Users page (admin/schools/[orgId]/users) — the
// only difference between those two contexts is which underlying action
// each callback resolves to (org-owner-scoped vs. site-admin-scoped),
// passed in as props here.
export function UsersView({
  members,
  invites,
  onInvite,
  onCancelInvite,
  onRemoveMember,
}: {
  members: OrgMemberSummary[];
  invites: PendingInvite[];
  onInvite: (input: InviteInput) => Promise<void>;
  onCancelInvite: (inviteId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCancelInvite(inviteId: string) {
    startTransition(async () => {
      try {
        await onCancelInvite(inviteId);
        toast.success("Invite cancelled.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't cancel that invite.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" />
                Invite User
              </Button>
            }
          />
          <DialogContent>
            <InviteUserForm onInvite={onInvite} onDone={() => setInviteOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Members</h2>
        <OrgMembersList members={members} canRemove removeAction={onRemoveMember} />
      </section>

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Pending invites</h2>
          <p className="text-sm text-muted-foreground">
            Nobody has signed in with these emails yet — tell them to sign in
            with Google using the exact address below.
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      {invite.fullName ?? "—"}
                      {invite.nickname && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({invite.nickname})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{invite.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{ROLE_LABEL[invite.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function InviteUserForm({
  onInvite,
  onDone,
}: {
  onInvite: (input: InviteInput) => Promise<void>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "contributor">("contributor");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await onInvite({ email, fullName: name, nickname, role });
      toast.success("User invited.");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't invite that user.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogDescription>
          Adds this email to the allow-list — no email is sent. Tell them to
          sign in with Google using this exact address.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="invite-name">Name</Label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="invite-nickname">Code</Label>
          <Input
            id="invite-nickname"
            placeholder="e.g. JD"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="invite-email">Email Address</Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v === "owner" ? "owner" : "contributor")}>
            <SelectTrigger id="invite-role" className="mt-1 w-full">
              <SelectValue>{(v: string) => (v === "owner" ? "Admin" : "User")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contributor">User</SelectItem>
              <SelectItem value="owner">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Inviting…" : "Invite User"}
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgMembersList } from "@/components/admin/org-members-list";
import { regenerateMyJoinCode, removeMyOrgMember, joinSchool } from "@/app/school/actions";
import type { OrgMemberSummary } from "@/lib/ccps/types";

export function SchoolSettingsView({
  members,
  isOwner,
  joinCode: initialJoinCode,
}: {
  members: OrgMemberSummary[];
  isOwner: boolean;
  joinCode: string;
}) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [isRegenerating, startRegenerate] = useTransition();
  const [isJoining, startJoining] = useTransition();

  function handleRegenerate() {
    startRegenerate(async () => {
      try {
        const code = await regenerateMyJoinCode();
        setJoinCode(code);
        toast.success("Join code regenerated.");
      } catch {
        toast.error("Couldn't regenerate the join code.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Invite teammates</h2>
        <p className="text-sm text-muted-foreground">
          Share this code with a colleague — when they sign in, they can use
          it to join this school instead of starting their own.
        </p>
        <div className="flex items-center gap-2">
          <Input readOnly value={joinCode} className="max-w-[200px] font-mono" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={!isOwner || isRegenerating}
            title={isOwner ? undefined : "Only the school's owner can regenerate the code"}
          >
            <RefreshCw className="size-3.5" />
            Regenerate
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Members</h2>
        <OrgMembersList
          members={members}
          canRemove={isOwner}
          removeAction={isOwner ? removeMyOrgMember : undefined}
        />
      </section>

      <section className="space-y-2 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Join a different school</h2>
        <p className="text-sm text-muted-foreground">
          Have a join code from another school? Using it moves your account
          there and leaves this one (if you&apos;re its only member and it
          has no plans, it&apos;s removed).
        </p>
        <form
          className="flex items-center gap-2"
          action={(formData) => {
            startJoining(async () => {
              try {
                await joinSchool(formData);
                toast.success("Joined that school.");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't join that school.");
              }
            });
          }}
        >
          <Label htmlFor="code" className="sr-only">
            Join code
          </Label>
          <Input
            id="code"
            name="code"
            placeholder="Join code"
            className="max-w-[200px] font-mono"
            required
          />
          <Button type="submit" variant="outline" disabled={isJoining}>
            {isJoining ? "Joining…" : "Join"}
          </Button>
        </form>
      </section>
    </div>
  );
}

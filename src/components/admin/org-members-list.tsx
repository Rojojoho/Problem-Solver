"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgMemberSummary } from "@/lib/ccps/types";

const ROLE_LABEL: Record<OrgMemberSummary["role"], string> = {
  owner: "Admin",
  contributor: "User",
};

export function OrgMembersList({
  members,
  canRemove,
  removeAction,
}: {
  members: OrgMemberSummary[];
  canRemove: boolean;
  removeAction?: (userId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove(userId: string) {
    if (!removeAction) return;
    startTransition(async () => {
      try {
        await removeAction(userId);
        toast.success("Member removed.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove that member.");
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            {canRemove && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-medium">
                {member.displayName}
                {member.nickname && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({member.nickname})
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{member.email}</td>
              <td className="px-4 py-3">
                <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                  {ROLE_LABEL[member.role]}
                </Badge>
              </td>
              {canRemove && (
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleRemove(member.userId)}
                  >
                    Remove
                  </Button>
                </td>
              )}
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td colSpan={canRemove ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">
                No members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

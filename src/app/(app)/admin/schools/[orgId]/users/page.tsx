import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { listSchoolsForAdmin, listOrgMembers, listPendingInvites } from "@/lib/db";
import { UsersView } from "@/components/school/users-view";
import {
  removeSchoolMember,
  inviteSchoolUser,
  cancelSchoolInvite,
} from "@/app/(app)/admin/schools/actions";

export default async function AdminSchoolUsersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await requireAdmin();
  const { orgId } = await params;

  const [schools, members, invites] = await Promise.all([
    listSchoolsForAdmin(),
    listOrgMembers(orgId),
    listPendingInvites(orgId),
  ]);
  const school = schools.find((s) => s.id === orgId);
  if (!school) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/schools"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Schools
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{school.name}</h1>
        <p className="text-sm text-muted-foreground">
          Join code:{" "}
          <span className="font-mono font-medium text-foreground">
            {school.joinCode}
          </span>{" "}
          — or invite their first user below directly.
        </p>
      </div>

      <UsersView
        members={members}
        invites={invites}
        onInvite={inviteSchoolUser.bind(null, orgId)}
        onCancelInvite={cancelSchoolInvite.bind(null, orgId)}
        onRemoveMember={removeSchoolMember.bind(null, orgId)}
      />
    </div>
  );
}

import { requireOrgOwner } from "@/lib/org";
import { listOrgMembers, listPendingInvites } from "@/lib/db";
import { UsersView } from "@/components/school/users-view";
import { inviteUser, cancelInvite, removeSchoolUser } from "@/app/(app)/school/users/actions";

export default async function SchoolUsersPage() {
  const { orgId, orgName } = await requireOrgOwner();
  const [members, invites] = await Promise.all([
    listOrgMembers(orgId),
    listPendingInvites(orgId),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">{orgName}</p>
      </div>

      <UsersView
        members={members}
        invites={invites}
        onInvite={inviteUser}
        onCancelInvite={cancelInvite}
        onRemoveMember={removeSchoolUser}
      />
    </div>
  );
}

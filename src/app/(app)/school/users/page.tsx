import { requireOrgOwner } from "@/lib/org";
import { listOrgMembers, listPendingInvites, getPageSetting } from "@/lib/db";
import { UsersView } from "@/components/school/users-view";
import { inviteUser, cancelInvite, removeSchoolUser } from "@/app/(app)/school/users/actions";

export default async function SchoolUsersPage() {
  const { orgId } = await requireOrgOwner();
  const [members, invites, pageSettings] = await Promise.all([
    listOrgMembers(orgId),
    listPendingInvites(orgId),
    getPageSetting("users"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pageSettings.screenTitle}</h1>
        {pageSettings.description && (
          <p className="text-sm text-muted-foreground">{pageSettings.description}</p>
        )}
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

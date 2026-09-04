import { OrgMembersList } from "@/components/admin/org-members-list";
import { removeMyOrgMember } from "@/app/(app)/school/actions";
import type { OrgMemberSummary } from "@/lib/ccps/types";

export function SchoolSettingsView({
  members,
  isOwner,
}: {
  members: OrgMemberSummary[];
  isOwner: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Members</h2>
      <OrgMembersList
        members={members}
        canRemove={isOwner}
        removeAction={isOwner ? removeMyOrgMember : undefined}
      />
    </section>
  );
}

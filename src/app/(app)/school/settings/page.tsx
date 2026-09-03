import { getCurrentOrg } from "@/lib/org";
import { listOrgMembers } from "@/lib/db";
import { SchoolSettingsView } from "@/components/school/school-settings-view";

export default async function SchoolSettingsPage() {
  const { orgId, orgName, role, joinCode } = await getCurrentOrg();
  const members = await listOrgMembers(orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">School settings</h1>
        <p className="text-sm text-muted-foreground">{orgName}</p>
      </div>

      <SchoolSettingsView
        members={members}
        isOwner={role === "owner"}
        joinCode={joinCode}
      />
    </div>
  );
}

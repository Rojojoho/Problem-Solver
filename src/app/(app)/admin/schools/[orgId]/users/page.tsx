import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { listSchoolsForAdmin, listOrgMembers } from "@/lib/db";
import { OrgMembersList } from "@/components/admin/org-members-list";
import { removeSchoolMember } from "@/app/(app)/admin/schools/actions";

export default async function AdminSchoolUsersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await requireAdmin();
  const { orgId } = await params;

  const [schools, members] = await Promise.all([
    listSchoolsForAdmin(),
    listOrgMembers(orgId),
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
          — hand this to the school&apos;s first user so they land directly
          in this account when they sign up.
        </p>
      </div>

      <OrgMembersList
        members={members}
        canRemove
        removeAction={removeSchoolMember.bind(null, orgId)}
      />
    </div>
  );
}

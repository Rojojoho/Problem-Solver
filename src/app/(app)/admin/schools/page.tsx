import { listSchoolsForAdmin } from "@/lib/db";
import { SchoolsTable } from "@/components/admin/schools-table";

export default async function AdminSchoolsPage() {
  const schools = await listSchoolsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schools</h1>
        <p className="text-sm text-muted-foreground">
          Every school with access to Resolve. Add a school here to
          pre-provision it, then hand its join code to their first user so
          they land directly in this school&apos;s account when they sign up.
        </p>
      </div>

      <SchoolsTable schools={schools} />
    </div>
  );
}

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          App-wide configuration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/settings/checklists">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Checklist templates</CardTitle>
              <CardDescription>
                Manage the per-stage success-criteria checklist. Edits only
                apply to plans created after the change.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/fields">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Stage fields</CardTitle>
              <CardDescription>
                Manage each stage&apos;s input fields. Edits only apply to plans
                created after the change.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/validation-options">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Validation options</CardTitle>
              <CardDescription>
                Manage the statuses selectable per causal hypothesis on Stage
                2. Changes apply immediately across all plans.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

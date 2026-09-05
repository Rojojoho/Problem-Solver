import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Settings</h1>
        <p className="text-sm text-muted-foreground">
          App-wide configuration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/settings/pages">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Pages</CardTitle>
              <CardDescription>
                Manage the menu title, screen title, and description for
                Knowledge Base, Guide, Users, and School Settings — plus
                Knowledge types. Changes apply immediately across all
                schools.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/stages">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Stages</CardTitle>
              <CardDescription>
                Rename, reorder, or add stages, and manage each field&apos;s
                title and subtitle. Changes apply immediately across all
                plans.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

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

        <Link href="/admin/settings/requirement-types">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Requirement types</CardTitle>
              <CardDescription>
                Manage the types selectable per solution requirement on
                Stage 3A. Changes apply immediately across all plans.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/impact-measure-types">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Impact measure types</CardTitle>
              <CardDescription>
                Manage the types selectable per measure on Stage 5. Changes
                apply immediately across all plans.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/diagram-headings">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Connections diagram headings</CardTitle>
              <CardDescription>
                Manage the 4 column headings shown on the 3.2
                &quot;Connections&quot; popup. Changes apply immediately
                across all plans.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

      </div>
    </div>
  );
}

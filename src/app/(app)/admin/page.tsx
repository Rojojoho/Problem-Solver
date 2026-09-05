import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage published-plan review, the knowledge base, and app settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/schools">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Schools</CardTitle>
              <CardDescription>
                Add and manage schools — contacts, subscriptions, and each
                school&apos;s users.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/review">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Review queue</CardTitle>
              <CardDescription>
                Approve, reject, tag, or promote plans published by schools.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/kb">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Guide</CardTitle>
              <CardDescription>
                Write and publish articles shown on the Guide page and in
                each plan&apos;s side panel.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
              <CardDescription>
                Manage checklist templates and app configuration.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

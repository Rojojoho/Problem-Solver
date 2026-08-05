import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Global settings and the knowledge base will live here as they&apos;re
          built out.
        </p>
      </div>

      <Link href="/admin/review">
        <Card className="max-w-sm transition-colors hover:border-foreground/30">
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
            <CardDescription>
              Approve, reject, tag, or promote plans published by schools.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}

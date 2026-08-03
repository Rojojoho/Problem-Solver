import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StagePlaceholder({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>Coming soon</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This stage isn&apos;t built yet — it&apos;ll follow the same pattern as
        Problem Identification once we get to it.
      </CardContent>
    </Card>
  );
}

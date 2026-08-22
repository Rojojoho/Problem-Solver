import { notFound } from "next/navigation";
import { getPublicPlanBundle } from "@/lib/db";
import { getPlanSummary } from "@/app/plans/[id]/actions";
import { PublicPlanView } from "@/components/public/public-plan-view";

// This page has no cookies/headers/searchParams for Next to key dynamic
// rendering off automatically, so without this it's a candidate for static
// caching — the very first visit (before sharing was even fully wired up)
// could get cached as a 404 and keep being served regardless of later
// changes. The page must always reflect live, current sharing status.
export const dynamic = "force-dynamic";

export default async function PublicPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const bundle = await getPublicPlanBundle(token);
  if (!bundle) {
    notFound();
  }

  const summary = await getPlanSummary(bundle.id);

  return <PublicPlanView bundle={bundle} summary={summary} />;
}

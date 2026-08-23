import { notFound } from "next/navigation";
import {
  getPublicPlanBundle,
  getDiagramHeadings,
  getWorkspaceTabPositions,
} from "@/lib/db";
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

  const headings = await getDiagramHeadings();
  const tabPositions = await getWorkspaceTabPositions();

  return (
    <PublicPlanView bundle={bundle} headings={headings} tabPositions={tabPositions} />
  );
}

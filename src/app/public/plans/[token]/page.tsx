import { notFound } from "next/navigation";
import { getPublicPlanBundle } from "@/lib/db";
import { getPlanSummary } from "@/app/plans/[id]/actions";
import { PublicPlanView } from "@/components/public/public-plan-view";

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

import { listPublishedPlansForAdmin, listTags } from "@/lib/db";
import { ReviewQueue } from "@/components/admin/review-queue";

export default async function AdminReviewPage() {
  const [submissions, availableTags] = await Promise.all([
    listPublishedPlansForAdmin(),
    listTags(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          Published plan submissions from schools. Approve to make a
          submission visible to other orgs, tag it for later use, or promote
          it to a featured exemplar.
        </p>
      </div>
      <ReviewQueue submissions={submissions} availableTags={availableTags} />
    </div>
  );
}

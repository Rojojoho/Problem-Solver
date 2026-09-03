"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PublishedPlanSummary, TagData } from "@/lib/ccps/types";
import {
  approvePublishedPlan,
  rejectPublishedPlan,
  setExemplarStatus,
  tagPublishedPlan,
  untagPublishedPlan,
} from "@/app/admin/actions";

// toISOString() is UTC-based and locale-independent, so server and client
// render the same string — avoids a hydration mismatch from
// toLocaleDateString(), which depends on the runtime's locale/timezone.
function formatDate(iso: string) {
  return iso.slice(0, 10);
}

const STATUS_BADGE = {
  pending: { label: "Pending", variant: "warning" as const },
  approved: { label: "Approved", variant: "success" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

export function ReviewQueue({
  submissions,
  availableTags,
  stageLabels,
}: {
  submissions: PublishedPlanSummary[];
  availableTags: TagData[];
  stageLabels: Record<string, string>;
}) {
  if (!submissions.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            No plans have been published yet.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <SubmissionRow
          key={submission.id}
          submission={submission}
          availableTags={availableTags}
          stageLabels={stageLabels}
        />
      ))}
    </div>
  );
}

function SubmissionRow({
  submission,
  availableTags,
  stageLabels,
}: {
  submission: PublishedPlanSummary;
  availableTags: TagData[];
  stageLabels: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [tagInput, setTagInput] = useState("");

  function handleApprove() {
    startTransition(async () => {
      try {
        await approvePublishedPlan(submission.id);
        toast.success("Submission approved.");
      } catch {
        toast.error("Couldn't approve this submission.");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await rejectPublishedPlan(submission.id, rejectNote);
        toast.success("Submission rejected.");
        setIsRejecting(false);
        setRejectNote("");
      } catch {
        toast.error("Couldn't reject this submission.");
      }
    });
  }

  function handleToggleExemplar() {
    startTransition(async () => {
      try {
        await setExemplarStatus(submission.id, !submission.isExemplar);
        toast.success(
          submission.isExemplar ? "Removed as exemplar." : "Marked as exemplar."
        );
      } catch {
        toast.error("Couldn't update exemplar status.");
      }
    });
  }

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const name = tagInput.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await tagPublishedPlan(submission.id, name);
        setTagInput("");
      } catch {
        toast.error("Couldn't add that tag.");
      }
    });
  }

  function handleRemoveTag(tagId: string) {
    startTransition(async () => {
      try {
        await untagPublishedPlan(submission.id, tagId);
      } catch {
        toast.error("Couldn't remove that tag.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{submission.snapshotName}</h3>
            <Badge variant={STATUS_BADGE[submission.status].variant}>
              {STATUS_BADGE[submission.status].label}
            </Badge>
            {submission.isExemplar && <Badge variant="info">Exemplar</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {submission.sourceOrgName ?? "Unknown org"} · Stage:{" "}
            {stageLabels[submission.snapshotCurrentStage]} · Submitted{" "}
            {formatDate(submission.createdAt)}
          </p>
          {submission.reviewNote && (
            <p className="mt-1 text-sm text-muted-foreground">
              Note: {submission.reviewNote}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {submission.tags.map((tag) => (
            <Badge key={tag.id} variant="outline" className="gap-1">
              {tag.name}
              <button
                type="button"
                aria-label={`Remove ${tag.name} tag`}
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-0.5 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
          <form onSubmit={handleAddTag} className="flex items-center gap-1">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag…"
              list={`tags-${submission.id}`}
              className="h-7 w-36 text-xs"
            />
            <datalist id={`tags-${submission.id}`}>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>
            <Button type="submit" size="xs" variant="outline" disabled={isPending}>
              Add
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={handleApprove}
            disabled={isPending || submission.status === "approved"}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline-destructive"
            onClick={() => setIsRejecting((v) => !v)}
            disabled={isPending}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleExemplar}
            disabled={isPending || submission.status !== "approved"}
            title={
              submission.status !== "approved"
                ? "Approve this submission first"
                : undefined
            }
          >
            {submission.isExemplar ? "Remove as exemplar" : "Mark as exemplar"}
          </Button>
        </div>

        {isRejecting && (
          <div className="space-y-2 border-t border-border pt-3">
            <Label htmlFor={`reject-note-${submission.id}`}>
              Rejection note (optional)
            </Label>
            <Textarea
              id={`reject-note-${submission.id}`}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
            />
            <Button size="sm" variant="outline-destructive" onClick={handleReject} disabled={isPending}>
              Confirm reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { enablePlanSharing, disablePlanSharing } from "@/app/(app)/plans/[id]/actions";

// "Share" (a public, no-login read-only link) is a distinct concept from
// "Publish" (publish-button.tsx, which snapshots a plan into a review queue
// for other logged-in schools) — kept as a separate control entirely so the
// two aren't confused.
export function PublicShareDialog({
  planId,
  initialShareEnabled,
  initialShareToken,
}: {
  planId: string;
  initialShareEnabled: boolean;
  initialShareToken: string | null;
}) {
  const [enabled, setEnabled] = useState(initialShareEnabled);
  const [token, setToken] = useState(initialShareToken);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/public/plans/${token}`
      : "";

  function handleEnable() {
    startTransition(async () => {
      try {
        const newToken = await enablePlanSharing(planId);
        setToken(newToken);
        setEnabled(true);
      } catch {
        toast.error("Couldn't enable the public link.");
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      try {
        await disablePlanSharing(planId);
        setEnabled(false);
        setToken(null);
        setCopied(false);
      } catch {
        toast.error("Couldn't disable the public link.");
      }
    });
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Share2 className="size-3.5" />
            Share
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Public link</DialogTitle>
          <DialogDescription>
            Anyone with this link can view a read-only copy of the whole
            plan — no account needed. They won&apos;t see the side panel or
            be able to edit anything.
          </DialogDescription>
        </DialogHeader>

        {enabled && url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={url} readOnly className="flex-1" />
              <Button type="button" size="icon-sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline-destructive"
              size="sm"
              onClick={handleDisable}
              disabled={isPending}
            >
              Disable public link
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={handleEnable} disabled={isPending}>
            {isPending ? "Enabling…" : "Enable public link"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

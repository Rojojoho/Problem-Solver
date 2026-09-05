"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from "@/components/tiptap-editor";
import {
  renamePlan,
  saveBackground,
  updatePlanOwner,
  addPlanCollaborator,
  removePlanCollaborator,
} from "@/app/(app)/plans/[id]/actions";
import { useSerializedSave } from "@/components/plan/use-serialized-save";
import type { OrgMemberSummary } from "@/lib/ccps/types";

interface PlanDetailsFormProps {
  planId: string;
  planName: string;
  background: JSONContent;
  ownerId: string | null;
  collaboratorIds: string[];
  orgMembers: OrgMemberSummary[];
  canManagePlan: boolean;
}

export function PlanDetailsForm({
  planId,
  planName,
  background,
  ownerId,
  collaboratorIds,
  orgMembers,
  canManagePlan,
}: PlanDetailsFormProps) {
  const saveBackgroundQueued = useSerializedSave<JSONContent>(
    (content) => saveBackground(planId, content),
    () => toast.error("Couldn't save the background.")
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Plan Details</h2>
      </div>

      <PlanNameField planId={planId} name={planName} />

      <PlanAccessSection
        planId={planId}
        ownerId={ownerId}
        collaboratorIds={collaboratorIds}
        orgMembers={orgMembers}
        canManagePlan={canManagePlan}
      />

      <div className="space-y-1.5">
        <Label>Background</Label>
        <TiptapEditor
          content={background}
          onBlurSave={(content) => saveBackgroundQueued(content)}
        />
      </div>
    </div>
  );
}

function PlanNameField({ planId, name: initialName }: { planId: string; name: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required.");
      return;
    }
    startTransition(async () => {
      try {
        await renamePlan(planId, trimmed);
        toast.success("Saved.");
        router.refresh();
      } catch {
        toast.error("Couldn't rename this plan.");
      }
    });
  }

  return (
    <div className="max-w-md space-y-1.5">
      <Label htmlFor="plan-name">Name</Label>
      <div className="flex items-center gap-2">
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}

function PlanAccessSection({
  planId,
  ownerId,
  collaboratorIds,
  orgMembers,
  canManagePlan,
}: {
  planId: string;
  ownerId: string | null;
  collaboratorIds: string[];
  orgMembers: OrgMemberSummary[];
  canManagePlan: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState("");

  const memberById = new Map(orgMembers.map((m) => [m.userId, m]));
  const owner = ownerId ? memberById.get(ownerId) : undefined;
  const collaborators = collaboratorIds
    .filter((id) => id !== ownerId)
    .map((id) => memberById.get(id))
    .filter((m): m is OrgMemberSummary => Boolean(m));
  const availableToAdd = orgMembers.filter(
    (m) => m.userId !== ownerId && !collaboratorIds.includes(m.userId)
  );

  function handleOwnerChange(newOwnerId: string) {
    startTransition(async () => {
      try {
        await updatePlanOwner(planId, newOwnerId);
        toast.success("Owner updated.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't change the owner.");
      }
    });
  }

  function handleAddCollaborator() {
    if (!addingId) return;
    startTransition(async () => {
      try {
        await addPlanCollaborator(planId, addingId);
        toast.success("Collaborator added.");
        setAddingId("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add that collaborator.");
      }
    });
  }

  function handleRemoveCollaborator(userId: string) {
    startTransition(async () => {
      try {
        await removePlanCollaborator(planId, userId);
        toast.success("Collaborator removed.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove that collaborator.");
      }
    });
  }

  return (
    <div className="max-w-md space-y-4 rounded-md border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="plan-owner">Owner</Label>
        {canManagePlan ? (
          <Select
            value={ownerId ?? undefined}
            onValueChange={(value) => typeof value === "string" && handleOwnerChange(value)}
          >
            <SelectTrigger id="plan-owner" className="w-full">
              <SelectValue placeholder="Select an owner">
                {(value: string) => memberById.get(value)?.displayName ?? "Unknown"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {orgMembers.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm">{owner?.displayName ?? "Unassigned"}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Collaborators</Label>
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground">No collaborators yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {collaborators.map((m) => (
              <Badge key={m.userId} variant="outline" className="gap-1">
                {m.displayName}
                {canManagePlan && (
                  <button
                    type="button"
                    aria-label={`Remove ${m.displayName}`}
                    onClick={() => handleRemoveCollaborator(m.userId)}
                    disabled={isPending}
                    className="hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        {canManagePlan && availableToAdd.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Select
              value={addingId || undefined}
              onValueChange={(value) => typeof value === "string" && setAddingId(value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a person">
                  {(value: string) => memberById.get(value)?.displayName ?? "Select a person"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddCollaborator}
              disabled={isPending || !addingId}
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

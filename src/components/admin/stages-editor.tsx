"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { docToParagraphs } from "@/lib/ccps/doc-to-text";
import type { StageData, StageFieldSummary, WorkspaceTabPositions } from "@/lib/ccps/types";
import {
  createStage,
  updateStage,
  updateWorkspaceTabPosition,
} from "@/app/(app)/admin/settings/stages/actions";
import { updateStageField } from "@/app/(app)/admin/settings/fields/actions";

type MergedEntry =
  | {
      kind: "stage";
      key: string;
      label: string;
      fullName: string;
      description: string;
      sortOrder: number;
      fields: StageFieldSummary[];
    }
  | {
      kind: "details" | "summary";
      label: string;
      fullName: string;
      description: string;
      sortOrder: number;
    };

export function StagesEditor({
  stages,
  tabPositions,
  fieldsByStage,
}: {
  stages: StageData[];
  tabPositions: WorkspaceTabPositions;
  fieldsByStage: Record<string, StageFieldSummary[]>;
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [pending, setPending] = useState(false);

  // Plan Details/Summary aren't rows in the `stages` table (see
  // 0023_workspace_tab_positions.sql for why), but they're shown merged
  // into the same reorderable list here so an admin can freely interleave
  // them with the real stages — e.g. move Summary to the end.
  const entries: MergedEntry[] = [
    {
      kind: "details" as const,
      label: tabPositions.details.label,
      fullName: tabPositions.details.fullName,
      description: tabPositions.details.description,
      sortOrder: tabPositions.details.sortOrder,
    },
    ...stages.map(
      (s): MergedEntry => ({
        kind: "stage",
        key: s.key,
        label: s.label,
        fullName: s.full_name,
        description: s.description,
        sortOrder: s.sort_order,
        fields: fieldsByStage[s.key] ?? [],
      })
    ),
    {
      kind: "summary" as const,
      label: tabPositions.summary.label,
      fullName: tabPositions.summary.fullName,
      description: tabPositions.summary.description,
      sortOrder: tabPositions.summary.sortOrder,
    },
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("label", label);
      await createStage(formData);
      toast.success("Stage added.");
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that stage.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => (
        <StageSection key={entry.kind === "stage" ? entry.key : entry.kind} entry={entry} />
      ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. 6 Sustain"
          className="max-w-sm flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add stage
        </Button>
      </form>
    </div>
  );
}

function StageSection({ entry }: { entry: MergedEntry }) {
  const [label, setLabel] = useState(entry.label);
  const [fullName, setFullName] = useState(entry.fullName);
  const [description, setDescription] = useState(entry.description);
  const [sortOrder, setSortOrder] = useState(entry.sortOrder);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        if (entry.kind === "stage") {
          await updateStage(entry.key, { label, fullName, description, sortOrder });
        } else {
          await updateWorkspaceTabPosition(entry.kind, { label, fullName, description, sortOrder });
        }
        toast.success("Saved.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save these settings.");
      }
    });
  }

  const idPrefix = entry.kind === "stage" ? entry.key : entry.kind;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {entry.kind === "stage" ? entry.key : entry.kind}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-label`}>Tab name</Label>
            <Input id={`${idPrefix}-label`} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-full-name`}>Full name</Label>
            <Input
              id={`${idPrefix}-full-name`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <Textarea
            id={`${idPrefix}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-sort-order`}>Sort order</Label>
            <Input
              id={`${idPrefix}-sort-order`}
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
            Save
          </Button>
        </div>

        {entry.kind === "stage" && (
          <div className="space-y-3 border-t border-border pt-4">
            {entry.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fields for this stage yet.</p>
            ) : (
              entry.fields.map((field) => <StageFieldRow key={field.field_key} field={field} />)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StageFieldRow({ field }: { field: StageFieldSummary }) {
  const [shortName, setShortName] = useState(field.short_name);
  const [title, setTitle] = useState(field.full_prompt);
  const [subtitle, setSubtitle] = useState(field.helper_text ?? "");
  const [defaultContentText, setDefaultContentText] = useState(
    docToParagraphs(field.default_content ?? undefined).join("\n")
  );
  const [sortOrder, setSortOrder] = useState(field.sort_order);
  const [hidden, setHidden] = useState(field.hidden ?? false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateStageField(
          field.field_key,
          shortName,
          title,
          subtitle,
          defaultContentText,
          sortOrder,
          hidden
        );
        toast.success("Saved.");
      } catch {
        toast.error("Couldn't save that field.");
      }
    });
  }

  return (
    <div
      className={
        "space-y-2 rounded-md border border-border p-3" + (hidden ? " opacity-60" : "")
      }
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{field.internal_id}</span>
        <span>·</span>
        <span className="font-mono">{field.field_key}</span>
        {hidden && <Badge variant="outline">Hidden</Badge>}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <div>
          <Label className="text-xs">Short name</Label>
          <Input value={shortName} onChange={(e) => setShortName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Sort order</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="mt-1 w-20"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Subtitle</Label>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">
          Default content (pre-filled when a user hasn&apos;t answered yet, one line per paragraph)
        </Label>
        <Textarea
          value={defaultContentText}
          onChange={(e) => setDefaultContentText(e.target.value)}
          rows={3}
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
          Save
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={hidden} onCheckedChange={(checked) => setHidden(checked === true)} />
          Hide from plans
        </label>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPlanTag, removePlanTag } from "@/app/plans/[id]/actions";

interface TagsPanelProps {
  planId: string;
  tags: string[];
}

// Shown in the side panel on the Plan Details tab — plan-wide metadata, so
// it lives alongside the Background editor rather than inside it.
export function TagsPanel({ planId, tags: initialTags }: TagsPanelProps) {
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
    setTagInput("");
    startTransition(async () => {
      try {
        await addPlanTag(planId, tag);
      } catch {
        toast.error("Couldn't add that tag.");
        setTags((prev) => prev.filter((t) => t !== tag));
      }
    });
  }

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
    startTransition(async () => {
      try {
        await removePlanTag(planId, tag);
      } catch {
        toast.error("Couldn't remove that tag.");
        setTags((prev) => [...prev, tag]);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="gap-1">
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag} tag`}
            onClick={() => handleRemoveTag(tag)}
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
          className="h-7 w-36 text-xs"
        />
        <Button type="submit" size="xs" variant="outline" disabled={isPending}>
          Add
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { EMPTY_DOC } from "@/lib/ccps/constants";
import {
  createSchoolKnowledgeItem,
  updateSchoolKnowledgeItem,
  deleteSchoolKnowledgeItem,
} from "@/app/(app)/school/knowledge-base/actions";
import type { KnowledgeTypeOption, SharedKnowledgeItemData } from "@/lib/ccps/types";

interface KnowledgeBaseViewProps {
  items: SharedKnowledgeItemData[];
  knowledgeTypes: KnowledgeTypeOption[];
}

export function KnowledgeBaseView({ items, knowledgeTypes }: KnowledgeBaseViewProps) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SharedKnowledgeItemData | null>(null);

  const types = Array.from(
    new Set(items.map((item) => item.typeLabel).filter((label): label is string => Boolean(label)))
  );

  const filtered = items.filter(
    (item) =>
      (!activeType || item.typeLabel === activeType) &&
      (!query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="size-3.5" />
                Add Knowledge
              </Button>
            }
          />
          <DialogContent>
            <SchoolKnowledgeForm knowledgeTypes={knowledgeTypes} onDone={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing shared yet — add a Knowledge item here, or from any plan
          with &quot;Share with school&quot; checked, to see it here.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeType === null ? "default" : "outline"}
              onClick={() => setActiveType(null)}
            >
              All
            </Button>
            {types.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={activeType === type ? "default" : "outline"}
                onClick={() => setActiveType(type)}
              >
                {type}
              </Button>
            ))}
          </div>

          <Input
            placeholder="Search knowledge…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className="space-y-1.5 rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{item.title}</span>
                      {item.typeLabel && <Badge variant="outline">{item.typeLabel}</Badge>}
                    </div>
                    {item.sourcePlanId === null && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={() => setEditing(item)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <DeleteSchoolKnowledgeButton id={item.id} title={item.title} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From:{" "}
                    {item.sourcePlanId ? (
                      <Link href={`/plans/${item.sourcePlanId}`} className="hover:underline">
                        {item.sourcePlanName}
                      </Link>
                    ) : (
                      item.sourcePlanName
                    )}
                  </p>
                  {item.description && (
                    <TiptapEditor content={item.description} editable={false} className="text-sm" />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <SchoolKnowledgeForm
              knowledgeTypes={knowledgeTypes}
              item={editing}
              onDone={() => setEditing(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DeleteSchoolKnowledgeButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function handleDelete() {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setPending(true);
    deleteSchoolKnowledgeItem(id)
      .then(() => {
        toast.success("Knowledge deleted.");
        router.refresh();
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't delete that item.");
        setPending(false);
      });
  }

  return (
    <Button size="icon-xs" variant="ghost" aria-label="Delete" disabled={pending} onClick={handleDelete}>
      <X className="size-3.5" />
    </Button>
  );
}

function SchoolKnowledgeForm({
  knowledgeTypes,
  item,
  onDone,
}: {
  knowledgeTypes: KnowledgeTypeOption[];
  item?: SharedKnowledgeItemData;
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState<JSONContent>(item?.description ?? EMPTY_DOC);
  const [typeId, setTypeId] = useState<string | null>(
    knowledgeTypes.find((t) => t.label === item?.typeLabel)?.id ?? knowledgeTypes[0]?.id ?? null
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (item) {
        await updateSchoolKnowledgeItem(item.id, { title, description, typeId });
        toast.success("Saved.");
      } else {
        await createSchoolKnowledgeItem({ title, description, typeId, sharedToSchool: true });
        toast.success("Knowledge added.");
      }
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{item ? "Edit Knowledge" : "Add Knowledge"}</DialogTitle>
      </DialogHeader>
      <div>
        <Label htmlFor="school-knowledge-title">Title</Label>
        <Input
          id="school-knowledge-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="school-knowledge-description">Description</Label>
        <TiptapEditor content={description} onBlurSave={setDescription} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="school-knowledge-type">Type</Label>
        <Select
          value={typeId ?? undefined}
          onValueChange={(value) => setTypeId(typeof value === "string" ? value : null)}
        >
          <SelectTrigger id="school-knowledge-type" className="mt-1 w-full">
            <SelectValue>
              {(value: string) =>
                knowledgeTypes.find((t) => t.id === value)?.label ?? "Select a type"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {knowledgeTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save" : "Add Knowledge"}
        </Button>
      </DialogFooter>
    </form>
  );
}

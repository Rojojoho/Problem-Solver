"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  forkKnowledgeItem,
  listSharedKnowledgeItemsForPlan,
  updateKnowledgeItem,
} from "@/app/(app)/plans/[id]/actions";
import type {
  KnowledgeItemData,
  KnowledgeTypeOption,
  SharedKnowledgeItemData,
} from "@/lib/ccps/types";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// Descriptions are plain text, not rich text — this is the only "links"
// support they get: any http(s) URL renders as a clickable link. Exported
// for reuse by the School > Knowledge Base page (knowledge-base-view.tsx).
export function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

interface KnowledgePanelProps {
  planId: string;
  items: KnowledgeItemData[];
  knowledgeTypes: KnowledgeTypeOption[];
}

export function KnowledgePanel({ planId, items, knowledgeTypes }: KnowledgePanelProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeItemData | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(item: KnowledgeItemData) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteKnowledgeItem(planId, item.id);
        toast.success("Knowledge deleted.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete that item.");
      }
    });
  }

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
            <AddKnowledgeDialog
              planId={planId}
              knowledgeTypes={knowledgeTypes}
              onDone={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No knowledge recorded for this plan yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="space-y-1.5 rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{item.title}</span>
                    {item.typeLabel && <Badge variant="outline">{item.typeLabel}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added by {item.createdByName}
                    {!item.sharedToSchool && " · Not shared with school"}
                  </p>
                  {item.forkedFrom && (
                    <p className="text-xs text-muted-foreground italic">
                      Adapted from &quot;{item.forkedFrom.title}&quot; in{" "}
                      {item.forkedFrom.planName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() => setEditing(item)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Delete"
                    disabled={isPending}
                    onClick={() => handleDelete(item)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              {item.description && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  <Linkified text={item.description} />
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <EditKnowledgeDialog
              planId={planId}
              item={editing}
              knowledgeTypes={knowledgeTypes}
              onDone={() => setEditing(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function KnowledgeFields({
  title,
  setTitle,
  description,
  setDescription,
  typeId,
  setTypeId,
  shared,
  setShared,
  knowledgeTypes,
}: {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  typeId: string | null;
  setTypeId: (value: string | null) => void;
  shared: boolean;
  setShared: (value: boolean) => void;
  knowledgeTypes: KnowledgeTypeOption[];
}) {
  return (
    <>
      <div>
        <Label htmlFor="knowledge-title">Title</Label>
        <Input
          id="knowledge-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="knowledge-description">Description</Label>
        <Textarea
          id="knowledge-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Links (https://…) are shown as clickable."
          rows={4}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="knowledge-type">Type</Label>
        <Select
          value={typeId ?? undefined}
          onValueChange={(value) => setTypeId(typeof value === "string" ? value : null)}
        >
          <SelectTrigger id="knowledge-type" className="mt-1 w-full">
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
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={shared} onCheckedChange={(checked) => setShared(checked === true)} />
        Share with school (other plans can link to or adapt this)
      </label>
    </>
  );
}

function AddKnowledgeDialog({
  planId,
  knowledgeTypes,
  onDone,
}: {
  planId: string;
  knowledgeTypes: KnowledgeTypeOption[];
  onDone: () => void;
}) {
  const [tab, setTab] = useState("new");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Knowledge</DialogTitle>
        <DialogDescription>
          Record a definition or piece of evidence, or bring in something
          already shared by another plan in your school.
        </DialogDescription>
      </DialogHeader>
      <Tabs value={tab} onValueChange={(value) => setTab(value ?? tab)}>
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="new" className="flex-1">
            New
          </TabsTrigger>
          <TabsTrigger value="library" className="flex-1">
            From school library
          </TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4">
          <NewKnowledgeForm planId={planId} knowledgeTypes={knowledgeTypes} onDone={onDone} />
        </TabsContent>
        <TabsContent value="library" className="mt-4">
          <SchoolLibraryBrowser planId={planId} onDone={onDone} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function NewKnowledgeForm({
  planId,
  knowledgeTypes,
  onDone,
}: {
  planId: string;
  knowledgeTypes: KnowledgeTypeOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeId, setTypeId] = useState<string | null>(knowledgeTypes[0]?.id ?? null);
  const [shared, setShared] = useState(true);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createKnowledgeItem(planId, {
        title,
        description,
        typeId,
        sharedToSchool: shared,
      });
      toast.success("Knowledge added.");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that knowledge.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <KnowledgeFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        typeId={typeId}
        setTypeId={setTypeId}
        shared={shared}
        setShared={setShared}
        knowledgeTypes={knowledgeTypes}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add Knowledge"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditKnowledgeDialog({
  planId,
  item,
  knowledgeTypes,
  onDone,
}: {
  planId: string;
  item: KnowledgeItemData;
  knowledgeTypes: KnowledgeTypeOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [typeId, setTypeId] = useState<string | null>(item.typeId);
  const [shared, setShared] = useState(item.sharedToSchool);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await updateKnowledgeItem(planId, item.id, {
        title,
        description,
        typeId,
        sharedToSchool: shared,
      });
      toast.success("Saved.");
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
        <DialogTitle>Edit Knowledge</DialogTitle>
      </DialogHeader>
      <KnowledgeFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        typeId={typeId}
        setTypeId={setTypeId}
        shared={shared}
        setShared={setShared}
        knowledgeTypes={knowledgeTypes}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SchoolLibraryBrowser({ planId, onDone }: { planId: string; onDone: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SharedKnowledgeItemData[] | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSharedKnowledgeItemsForPlan(planId)
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load the school library.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const filtered = (items ?? []).filter((item) =>
    item.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function handleUseAsVariant(item: SharedKnowledgeItemData) {
    setForkingId(item.id);
    try {
      await forkKnowledgeItem(planId, item.id);
      toast.success(`Added "${item.title}" as a variant.`);
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that variant.");
      setForkingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search shared knowledge…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {items?.length ? "No matches." : "Nothing shared by other plans yet."}
          </p>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="space-y-1 rounded-md border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  {item.typeLabel && <Badge variant="outline">{item.typeLabel}</Badge>}
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={forkingId === item.id}
                  onClick={() => handleUseAsVariant(item)}
                >
                  Use as variant
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">From: {item.sourcePlanName}</p>
              {item.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
          ))
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { STAGES } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type { KbArticleData } from "@/lib/ccps/types";
import {
  updateKbArticleBody,
  updateKbArticleMeta,
  setKbArticleStatus,
  deleteKbArticle,
} from "@/app/admin/kb/actions";

const GENERAL = "general";

export function KbArticleEditor({ article }: { article: KbArticleData }) {
  const router = useRouter();
  const [title, setTitle] = useState(article.title);
  const [stage, setStage] = useState<string>(article.stage ?? GENERAL);
  const [isPending, startTransition] = useTransition();

  function handleSaveMeta() {
    startTransition(async () => {
      try {
        await updateKbArticleMeta(
          article.id,
          title,
          stage === GENERAL ? null : (stage as CcpsStage)
        );
        toast.success("Details saved.");
      } catch {
        toast.error("Couldn't save details.");
      }
    });
  }

  function handleToggleStatus() {
    const next = article.status === "published" ? "draft" : "published";
    startTransition(async () => {
      try {
        await setKbArticleStatus(article.id, next);
        toast.success(next === "published" ? "Published." : "Unpublished.");
        router.refresh();
      } catch {
        toast.error("Couldn't update status.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this article? This can't be undone.")) return;
    startTransition(async () => {
      try {
        await deleteKbArticle(article.id);
      } catch {
        toast.error("Couldn't delete this article.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
          <Badge variant={article.status === "published" ? "success" : "outline"}>
            {article.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleToggleStatus}
            disabled={isPending}
          >
            {article.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="outline-destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <div>
          <Label htmlFor="kb-title">Title</Label>
          <Input
            id="kb-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label>Stage</Label>
          <Select value={stage} onValueChange={(v) => setStage(v ?? GENERAL)}>
            <SelectTrigger className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERAL}>General (all stages)</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" onClick={handleSaveMeta} disabled={isPending}>
        Save details
      </Button>

      <div>
        <Label>Content</Label>
        <div className="mt-2">
          <TiptapEditor
            content={article.body}
            onBlurSave={(content) => updateKbArticleBody(article.id, content)}
          />
        </div>
      </div>
    </div>
  );
}

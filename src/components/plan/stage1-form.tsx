"use client";

import { useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/tiptap-editor";
import { PI_FIELDS, EMPTY_DOC } from "@/lib/ccps/constants";
import { saveStageResponse } from "@/app/plans/[id]/actions";

interface Stage1FormProps {
  planId: string;
  initialResponses: Record<string, JSONContent>;
}

export function Stage1Form({ planId, initialResponses }: Stage1FormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSave(fieldKey: string, content: JSONContent) {
    startTransition(async () => {
      try {
        await saveStageResponse(planId, "PI", fieldKey, content);
      } catch {
        toast.error("Couldn't save your changes. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Stage 1: Agree the Problem to be Solved (Problem Identification)
        </h2>
        <p className="text-sm text-muted-foreground">
          {isPending ? "Saving…" : "Changes save automatically when you click away from a field."}
        </p>
      </div>

      {PI_FIELDS.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          {field.helperText && (
            <p className="text-xs text-muted-foreground">{field.helperText}</p>
          )}
          <TiptapEditor
            content={
              initialResponses[field.key] ?? field.defaultContent ?? EMPTY_DOC
            }
            onBlurSave={(content) => handleSave(field.key, content)}
          />
        </div>
      ))}
    </div>
  );
}

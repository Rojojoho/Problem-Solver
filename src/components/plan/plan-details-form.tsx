"use client";

import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/tiptap-editor";
import { saveBackground } from "@/app/(app)/plans/[id]/actions";
import { useSerializedSave } from "@/components/plan/use-serialized-save";

interface PlanDetailsFormProps {
  planId: string;
  background: JSONContent;
}

export function PlanDetailsForm({ planId, background }: PlanDetailsFormProps) {
  const saveBackgroundQueued = useSerializedSave<JSONContent>(
    (content) => saveBackground(planId, content),
    () => toast.error("Couldn't save the background.")
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Plan Details</h2>
      </div>

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

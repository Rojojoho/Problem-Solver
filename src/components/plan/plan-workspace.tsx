"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES, STAGE_FIELDS } from "@/lib/ccps/constants";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  ExemplarData,
  FeedbackItemData,
} from "@/lib/ccps/types";
import { Stage1Form } from "@/components/plan/stage1-form";
import { StagePlaceholder } from "@/components/plan/stage-placeholder";
import { SidePanel } from "@/components/plan/side-panel";

interface PlanWorkspaceProps {
  planId: string;
  initialStage: CcpsStage;
  piResponses: Record<string, JSONContent>;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  feedback: FeedbackItemData[];
}

export function PlanWorkspace({
  planId,
  initialStage,
  piResponses,
  checklist,
  exemplars,
  feedback,
}: PlanWorkspaceProps) {
  const [stage, setStage] = useState<CcpsStage>(initialStage);

  return (
    <Tabs value={stage} onValueChange={(v) => setStage(v as CcpsStage)}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {STAGES.map((s, i) => (
          <TabsTrigger key={s.key} value={s.key} className="whitespace-nowrap">
            {i + 1}. {s.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <TabsContent value="PI" className="mt-0">
            <Stage1Form planId={planId} initialResponses={piResponses} />
          </TabsContent>
          {STAGES.filter((s) => s.key !== "PI").map((s) => (
            <TabsContent key={s.key} value={s.key} className="mt-0">
              <StagePlaceholder label={s.label} />
            </TabsContent>
          ))}
        </div>

        <aside>
          <SidePanel
            planId={planId}
            stage={stage}
            stageHasFields={Boolean(STAGE_FIELDS[stage])}
            checklist={checklist}
            exemplars={exemplars}
            feedback={feedback}
          />
        </aside>
      </div>
    </Tabs>
  );
}

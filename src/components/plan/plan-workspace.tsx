"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES, STAGE_FIELDS } from "@/lib/ccps/constants";
import type { CcpsStage, PublishedStatus } from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  ExemplarData,
  FeedbackItemData,
  KbArticleData,
} from "@/lib/ccps/types";
import { Stage1Form } from "@/components/plan/stage1-form";
import { StagePlaceholder } from "@/components/plan/stage-placeholder";
import { SidePanel } from "@/components/plan/side-panel";
import { PublishButton } from "@/components/plan/publish-button";
import { PlanDetailsForm } from "@/components/plan/plan-details-form";

type WorkspaceTab = CcpsStage | "details";

interface PlanWorkspaceProps {
  planId: string;
  initialStage: CcpsStage;
  background: JSONContent;
  tags: string[];
  piResponses: Record<string, JSONContent>;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  feedback: FeedbackItemData[];
  publishStatus: PublishedStatus | null;
  kbArticles: KbArticleData[];
}

export function PlanWorkspace({
  planId,
  initialStage,
  background,
  tags,
  piResponses,
  checklist,
  exemplars,
  feedback,
  publishStatus,
  kbArticles,
}: PlanWorkspaceProps) {
  const [stage, setStage] = useState<WorkspaceTab>(initialStage);

  return (
    <Tabs value={stage} onValueChange={(v) => setStage(v as WorkspaceTab)}>
      <div className="mb-4 flex justify-end">
        <PublishButton planId={planId} status={publishStatus} />
      </div>
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger
          value="details"
          className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
        >
          Plan Details
        </TabsTrigger>
        {STAGES.map((s, i) => (
          <TabsTrigger
            key={s.key}
            value={s.key}
            className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
          >
            {i + 1}. {s.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="details" className="mt-6">
        <PlanDetailsForm planId={planId} background={background} tags={tags} />
      </TabsContent>

      {stage !== "details" && (
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
              kbArticles={kbArticles}
            />
          </aside>
        </div>
      )}
    </Tabs>
  );
}

"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/lib/ccps/constants";
import type { CcpsStage, PublishedStatus } from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  ExemplarData,
  FeedbackItemData,
  KbArticleData,
  StageFieldSummary,
} from "@/lib/ccps/types";
import { StageForm } from "@/components/plan/stage-form";
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
  fieldsByStage: Record<CcpsStage, StageFieldSummary[]>;
  responsesByStage: Record<CcpsStage, Record<string, JSONContent>>;
  checklistByStage: Record<CcpsStage, ChecklistItemData[]>;
  exemplarsByStage: Record<CcpsStage, ExemplarData[]>;
  feedback: FeedbackItemData[];
  publishStatus: PublishedStatus | null;
  kbArticles: KbArticleData[];
}

export function PlanWorkspace({
  planId,
  initialStage,
  background,
  tags,
  fieldsByStage,
  responsesByStage,
  checklistByStage,
  exemplarsByStage,
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
            {STAGES.map((s) => (
              <TabsContent key={s.key} value={s.key} className="mt-0">
                {fieldsByStage[s.key]?.length ? (
                  <StageForm
                    planId={planId}
                    stage={s.key}
                    fields={fieldsByStage[s.key]}
                    initialResponses={responsesByStage[s.key] ?? {}}
                  />
                ) : (
                  <StagePlaceholder label={s.label} />
                )}
              </TabsContent>
            ))}
          </div>

          <aside>
            <SidePanel
              planId={planId}
              stage={stage}
              stageHasFields={Boolean(fieldsByStage[stage]?.length)}
              checklist={checklistByStage[stage] ?? []}
              exemplars={exemplarsByStage[stage] ?? []}
              fields={fieldsByStage[stage] ?? []}
              feedback={feedback}
              kbArticles={kbArticles}
            />
          </aside>
        </div>
      )}
    </Tabs>
  );
}

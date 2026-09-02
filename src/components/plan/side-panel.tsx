"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  ExemplarData,
  FeedbackItemData,
  KbArticleData,
  StageFieldSummary,
} from "@/lib/ccps/types";
import { ChecklistPanel } from "@/components/plan/checklist-panel";
import { ExemplarPanel } from "@/components/plan/exemplar-panel";
import { FeedbackPanel } from "@/components/plan/feedback-panel";
import { KbPanel } from "@/components/plan/kb-panel";
import { AskPanel } from "@/components/plan/ask-panel";
import { TagsPanel } from "@/components/plan/tags-panel";

// The Summary tab isn't a real CCPS stage (it's a rollup of several), and
// "details" isn't one either (it's the plan-wide Background/Tags tab) — both
// are sentinels handled specially wherever it actually matters (currently
// FeedbackPanel, which treats "summary" as general/no-stage feedback, and
// the Tags tab below, which only appears for "details").
export type PanelStage = CcpsStage | "summary" | "details";

interface SidePanelProps {
  planId: string;
  stage: PanelStage;
  stageLabel: string;
  stageHasFields: boolean;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  fields: StageFieldSummary[];
  feedback: FeedbackItemData[];
  kbArticles: KbArticleData[];
  tags: string[];
}

export function SidePanel({
  planId,
  stage,
  stageLabel,
  stageHasFields,
  checklist,
  exemplars,
  fields,
  feedback,
  kbArticles,
  tags,
}: SidePanelProps) {
  const isDetails = stage === "details";
  // `defaultValue` alone only applies at mount, and a plan almost never
  // opens directly on Plan Details — so it'd lock onto "checklist" and
  // never switch to "tags" just because the user later clicks over to
  // Plan Details. This resets the active panel tab only when actually
  // entering/leaving Plan Details, leaving it alone on every other stage
  // switch so an open Feedback draft etc. isn't disturbed in between.
  const [panelTab, setPanelTab] = useState(isDetails ? "tags" : "checklist");
  const wasDetailsRef = useRef(isDetails);
  useEffect(() => {
    if (isDetails !== wasDetailsRef.current) {
      wasDetailsRef.current = isDetails;
      setPanelTab(isDetails ? "tags" : "checklist");
    }
  }, [isDetails]);

  return (
    <Tabs value={panelTab} onValueChange={(value) => setPanelTab(value ?? panelTab)}>
      <TabsList variant="line" className="w-full flex-wrap">
        {isDetails && (
          <TabsTrigger value="tags" className="flex-1">
            Tags
          </TabsTrigger>
        )}
        <TabsTrigger value="checklist" className="flex-1">
          Checklist
        </TabsTrigger>
        <TabsTrigger value="exemplar" className="flex-1">
          Exemplar
        </TabsTrigger>
        <TabsTrigger value="feedback" className="flex-1">
          Feedback
        </TabsTrigger>
        <TabsTrigger value="kb" className="flex-1">
          Knowledge Base
        </TabsTrigger>
        <TabsTrigger value="ask" className="flex-1">
          Ask
        </TabsTrigger>
      </TabsList>

      {isDetails && (
        <TabsContent value="tags" className="mt-4">
          <TagsPanel planId={planId} tags={tags} />
        </TabsContent>
      )}

      <TabsContent value="checklist" className="mt-4">
        {stageHasFields ? (
          // Keyed by stage: ChecklistPanel seeds its checked-state map from
          // `items` only once (in useState), so without a key change here
          // it would keep showing the previous stage's checklist state
          // after switching tabs while this panel stays mounted.
          <ChecklistPanel key={stage} planId={planId} stageLabel={stageLabel} items={checklist} />
        ) : (
          <NotAvailable />
        )}
      </TabsContent>

      <TabsContent value="exemplar" className="mt-4">
        {stageHasFields ? (
          // Same reasoning as ChecklistPanel above — its selected-exemplar
          // state is also seeded once and needs to reset per stage.
          <ExemplarPanel key={stage} stage={stage} exemplars={exemplars} fields={fields} />
        ) : (
          <NotAvailable />
        )}
      </TabsContent>

      <TabsContent value="feedback" className="mt-4">
        <FeedbackPanel planId={planId} stage={stage} feedback={feedback} />
      </TabsContent>

      <TabsContent value="kb" className="mt-4">
        <KbPanel stage={stage} articles={kbArticles} />
      </TabsContent>

      <TabsContent value="ask" className="mt-4">
        <AskPanel />
      </TabsContent>
    </Tabs>
  );
}

function NotAvailable() {
  return (
    <p className="text-sm text-muted-foreground">
      Not available for this stage yet.
    </p>
  );
}

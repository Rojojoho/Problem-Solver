"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  ExemplarData,
  FeedbackItemData,
  KbArticleSummary,
} from "@/lib/ccps/types";
import { ChecklistPanel } from "@/components/plan/checklist-panel";
import { ExemplarPanel } from "@/components/plan/exemplar-panel";
import { FeedbackPanel } from "@/components/plan/feedback-panel";
import { KbPanel } from "@/components/plan/kb-panel";

interface SidePanelProps {
  planId: string;
  stage: CcpsStage;
  stageHasFields: boolean;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  feedback: FeedbackItemData[];
  kbArticles: KbArticleSummary[];
}

export function SidePanel({
  planId,
  stage,
  stageHasFields,
  checklist,
  exemplars,
  feedback,
  kbArticles,
}: SidePanelProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Tabs defaultValue="checklist">
          <TabsList variant="line" className="w-full">
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
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            {stageHasFields ? (
              <ChecklistPanel planId={planId} items={checklist} />
            ) : (
              <NotAvailable />
            )}
          </TabsContent>

          <TabsContent value="exemplar" className="mt-4">
            {stageHasFields ? (
              <ExemplarPanel stage={stage} exemplars={exemplars} />
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
        </Tabs>
      </CardContent>
    </Card>
  );
}

function NotAvailable() {
  return (
    <p className="text-sm text-muted-foreground">
      Not available for this stage yet.
    </p>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CcpsStage } from "@/lib/supabase/database.types";
import type {
  ChecklistItemData,
  ExemplarData,
  FeedbackItemData,
} from "@/lib/ccps/types";
import { ChecklistPanel } from "@/components/plan/checklist-panel";
import { ExemplarPanel } from "@/components/plan/exemplar-panel";
import { FeedbackPanel } from "@/components/plan/feedback-panel";

interface SidePanelProps {
  planId: string;
  stage: CcpsStage;
  stageHasFields: boolean;
  checklist: ChecklistItemData[];
  exemplars: ExemplarData[];
  feedback: FeedbackItemData[];
}

export function SidePanel({
  planId,
  stage,
  stageHasFields,
  checklist,
  exemplars,
  feedback,
}: SidePanelProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Tabs defaultValue="checklist">
          <TabsList className="w-full">
            <TabsTrigger value="checklist" className="flex-1">
              Checklist
            </TabsTrigger>
            <TabsTrigger value="exemplar" className="flex-1">
              Exemplar
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex-1">
              Feedback
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

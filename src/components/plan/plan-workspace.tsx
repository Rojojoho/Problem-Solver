"use client";

import { useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/lib/ccps/constants";
import type { CcpsStage, PublishedStatus } from "@/lib/supabase/database.types";
import type { FeedbackItemData, KbArticleData, StageBundle } from "@/lib/ccps/types";
import { StageForm } from "@/components/plan/stage-form";
import { StagePlaceholder } from "@/components/plan/stage-placeholder";
import { SidePanel } from "@/components/plan/side-panel";
import { PublishButton } from "@/components/plan/publish-button";
import { PlanDetailsForm } from "@/components/plan/plan-details-form";
import { getStageBundle } from "@/app/plans/[id]/actions";

type WorkspaceTab = CcpsStage | "details";

interface PlanWorkspaceProps {
  planId: string;
  initialStage: CcpsStage;
  initialBundle: StageBundle;
  background: JSONContent;
  tags: string[];
  feedback: FeedbackItemData[];
  publishStatus: PublishedStatus | null;
  kbArticles: KbArticleData[];
}

export function PlanWorkspace({
  planId,
  initialStage,
  initialBundle,
  background,
  tags,
  feedback,
  publishStatus,
  kbArticles,
}: PlanWorkspaceProps) {
  const [stage, setStage] = useState<WorkspaceTab>(initialStage);
  const [bundles, setBundles] = useState<Partial<Record<CcpsStage, StageBundle>>>({
    [initialStage]: initialBundle,
  });
  const [loadingStage, setLoadingStage] = useState<CcpsStage | null>(null);
  const [, startTransition] = useTransition();

  function handleStageChange(value: string) {
    const next = value as WorkspaceTab;
    setStage(next);

    // Only fetch a stage's data the first time it's visited — once cached,
    // switching back and forth is instant with no extra round trip.
    if (next !== "details" && !bundles[next]) {
      setLoadingStage(next);
      startTransition(async () => {
        try {
          const bundle = await getStageBundle(planId, next);
          setBundles((prev) => ({ ...prev, [next]: bundle }));
        } catch {
          toast.error("Couldn't load that stage.");
        } finally {
          setLoadingStage(null);
        }
      });
    }
  }

  return (
    <Tabs value={stage} onValueChange={handleStageChange}>
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
            {STAGES.map((s) => {
              const bundle = bundles[s.key];
              return (
                <TabsContent key={s.key} value={s.key} className="mt-0">
                  {bundle ? (
                    bundle.fields.length ? (
                      <StageForm
                        planId={planId}
                        stage={s.key}
                        fields={bundle.fields}
                        initialResponses={bundle.responses}
                      />
                    ) : (
                      <StagePlaceholder label={s.label} />
                    )
                  ) : loadingStage === s.key ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : null}
                </TabsContent>
              );
            })}
          </div>

          <aside>
            <SidePanel
              planId={planId}
              stage={stage}
              stageHasFields={Boolean(bundles[stage]?.fields.length)}
              checklist={bundles[stage]?.checklist ?? []}
              exemplars={bundles[stage]?.exemplars ?? []}
              fields={bundles[stage]?.fields ?? []}
              feedback={feedback}
              kbArticles={kbArticles}
            />
          </aside>
        </div>
      )}
    </Tabs>
  );
}

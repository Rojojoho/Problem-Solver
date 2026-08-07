"use client";

import { useEffect, useState, useTransition } from "react";
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
import { cn } from "@/lib/utils";

type WorkspaceTab = CcpsStage | "details";

const PANEL_WIDTH_KEY = "ccps:side-panel-width";
const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 680;

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
  // Starts at the default on both server and client so the first render
  // matches for hydration — the saved width (if any) is applied right after
  // mount, once localStorage is actually available.
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(PANEL_WIDTH_KEY));
    if (saved && saved >= MIN_PANEL_WIDTH && saved <= MAX_PANEL_WIDTH) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a persisted user preference from localStorage on mount
      setPanelWidth(saved);
    }
  }, []);

  function handleResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    const startX = e.clientX;
    const startWidth = panelWidth;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    setIsDragging(true);

    function handleMove(ev: PointerEvent) {
      const next = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, startWidth + (startX - ev.clientX))
      );
      setPanelWidth(next);
    }

    function handleEnd(ev: PointerEvent) {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", handleMove);
      handle.removeEventListener("pointerup", handleEnd);
      setIsDragging(false);
      setPanelWidth((current) => {
        localStorage.setItem(PANEL_WIDTH_KEY, String(current));
        return current;
      });
    }

    handle.addEventListener("pointermove", handleMove);
    handle.addEventListener("pointerup", handleEnd);
  }

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
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-0">
          <div className="min-w-0 flex-1 lg:pr-6">
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
                        validationOptions={bundle.validationOptions}
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

          <div
            onPointerDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize side panel"
            className={cn(
              "hidden w-2 shrink-0 cursor-col-resize touch-none self-stretch rounded-full transition-colors lg:block",
              isDragging ? "bg-border" : "bg-transparent hover:bg-border"
            )}
          />

          <aside
            style={{ ["--panel-width" as string]: `${panelWidth}px` }}
            className="w-full shrink-0 lg:w-[var(--panel-width)]"
          >
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

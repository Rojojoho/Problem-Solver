"use client";

import { useEffect, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CcpsStage, PublishedStatus } from "@/lib/supabase/database.types";
import type {
  FeedbackItemData,
  KbArticleData,
  StageBundle,
  StageData,
} from "@/lib/ccps/types";
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
const HANDLE_WIDTH = 8;

interface PlanWorkspaceProps {
  planName: string;
  planId: string;
  stages: StageData[];
  initialStage: CcpsStage;
  initialBundle: StageBundle;
  background: JSONContent;
  tags: string[];
  feedback: FeedbackItemData[];
  publishStatus: PublishedStatus | null;
  kbArticles: KbArticleData[];
}

export function PlanWorkspace({
  planName,
  planId,
  stages,
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

  // Evicts a cached stage bundle (e.g. after 2A's "Consolidate" overwrites
  // 2B's data) so the next time that tab is opened it refetches instead of
  // showing what's now stale — mirrors handleStageChange's own cache-miss path.
  function invalidateStage(target: CcpsStage) {
    setBundles((prev) => {
      if (!prev[target]) return prev;
      const next = { ...prev };
      delete next[target];
      return next;
    });
  }

  const showPanel = stage !== "details";

  return (
    <div className="relative">
      <div
        style={
          showPanel
            ? { ["--panel-total" as string]: `${panelWidth + HANDLE_WIDTH}px` }
            : undefined
        }
        className={cn("min-w-0", showPanel && "lg:mr-[var(--panel-total)]")}
      >
        <Tabs value={stage} onValueChange={handleStageChange}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">{planName}</h1>
            <PublishButton planId={planId} status={publishStatus} />
          </div>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger
              value="details"
              className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
            >
              Plan Details
            </TabsTrigger>
            {stages.map((s) => (
              <TabsTrigger
                key={s.key}
                value={s.key}
                className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
              >
                {loadingStage === s.key && <Loader2 className="size-3 animate-spin" />}
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="details" className="mt-6" keepMounted>
            <PlanDetailsForm planId={planId} background={background} tags={tags} />
          </TabsContent>

          {stages.map((s) => {
            const bundle = bundles[s.key];
            return (
              <TabsContent key={s.key} value={s.key} className="mt-6" keepMounted>
                {bundle ? (
                  bundle.fields.length ? (
                    <StageForm
                      planId={planId}
                      stage={s.key}
                      stageLabel={s.label}
                      fields={bundle.fields}
                      initialResponses={bundle.responses}
                      validationOptions={bundle.validationOptions}
                      requirementTypes={bundle.requirementTypes}
                      causeSuggestions={bundle.causeSuggestions}
                      measureSuggestions={bundle.measureSuggestions}
                      strategyRows={bundle.strategyRows}
                      onStageDataChanged={invalidateStage}
                    />
                  ) : (
                    <StagePlaceholder label={s.label} />
                  )
                ) : loadingStage === s.key ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : null}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {showPanel && (
        <>
          <div
            onPointerDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize side panel"
            style={{ right: panelWidth }}
            className={cn(
              "fixed top-14 bottom-0 z-30 hidden w-2 cursor-col-resize touch-none transition-colors lg:block",
              isDragging ? "bg-border" : "bg-transparent hover:bg-border"
            )}
          />

          <aside
            style={{ ["--panel-width" as string]: `${panelWidth}px` }}
            className="static mt-6 w-full border-t border-sidebar-border bg-sidebar lg:fixed lg:top-14 lg:right-0 lg:bottom-0 lg:z-20 lg:mt-0 lg:w-[var(--panel-width)] lg:overflow-y-auto lg:border-t-0 lg:border-l"
          >
            <div className="p-4 lg:p-6">
              <SidePanel
                planId={planId}
                stage={stage}
                stageLabel={stages.find((s) => s.key === stage)?.label ?? stage}
                stageHasFields={Boolean(bundles[stage]?.fields.length)}
                checklist={bundles[stage]?.checklist ?? []}
                exemplars={bundles[stage]?.exemplars ?? []}
                fields={bundles[stage]?.fields ?? []}
                feedback={feedback}
                kbArticles={kbArticles}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

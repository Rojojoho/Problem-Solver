"use client";

import { useEffect, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CcpsStage, PublishedStatus } from "@/lib/supabase/database.types";
import type {
  DiagramHeadings,
  FeedbackItemData,
  KbArticleData,
  StageBundle,
  StageData,
  WorkspaceTabPositions,
} from "@/lib/ccps/types";
import { StageForm } from "@/components/plan/stage-form";
import { StagePlaceholder } from "@/components/plan/stage-placeholder";
import { SidePanel } from "@/components/plan/side-panel";
import { PublishButton } from "@/components/plan/publish-button";
import { PublicShareDialog } from "@/components/plan/public-share-dialog";
import { ExportPlanButton } from "@/components/plan/export-plan-button";
import { ExportPlanTextButton } from "@/components/plan/export-plan-text-button";
import { PlanDetailsForm } from "@/components/plan/plan-details-form";
import { SummaryTab } from "@/components/plan/summary-tab";
import {
  getStageBundle,
  getPlanSummary,
  type PlanSummaryData,
} from "@/app/plans/[id]/actions";
import { cn } from "@/lib/utils";

type WorkspaceTab = CcpsStage | "details" | "summary";

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
  shareEnabled: boolean;
  shareToken: string | null;
  tabPositions: WorkspaceTabPositions;
  headings: DiagramHeadings;
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
  shareEnabled,
  shareToken,
  tabPositions,
  headings,
}: PlanWorkspaceProps) {
  const [stage, setStage] = useState<WorkspaceTab>(initialStage);
  const [bundles, setBundles] = useState<Partial<Record<CcpsStage, StageBundle>>>({
    [initialStage]: initialBundle,
  });
  // A map (not a single value) so two overlapping fetches — e.g. clicking
  // two uncached stage tabs before the first one resolves — each only ever
  // clear their own entry in `finally`, instead of racing to stomp on a
  // single shared "currently loading" value.
  const [loadingStages, setLoadingStages] = useState<Partial<Record<CcpsStage, boolean>>>({});
  const [summaryData, setSummaryData] = useState<PlanSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
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

    if (next === "summary") {
      // Re-fetches every visit rather than caching — Summary rolls up
      // content from four different stages, any of which could have
      // changed since the last time it was open.
      setSummaryLoading(true);
      startTransition(async () => {
        try {
          setSummaryData(await getPlanSummary(planId));
        } catch {
          toast.error("Couldn't load the summary.");
        } finally {
          setSummaryLoading(false);
        }
      });
      return;
    }

    // Only fetch a stage's data the first time it's visited — once cached,
    // switching back and forth is instant with no extra round trip.
    if (next !== "details" && !bundles[next]) {
      setLoadingStages((prev) => ({ ...prev, [next]: true }));
      startTransition(async () => {
        try {
          const bundle = await getStageBundle(planId, next);
          setBundles((prev) => ({ ...prev, [next]: bundle }));
        } catch {
          toast.error("Couldn't load that stage.");
        } finally {
          setLoadingStages((prev) => {
            const rest = { ...prev };
            delete rest[next];
            return rest;
          });
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

  // Every tab (including Plan Details, which uses it for Tags) gets a side
  // panel now — kept as a named constant rather than inlining `true` since
  // it reads better at each of its two call sites below.
  const showPanel = true;

  // Plan Details/Summary aren't rows in the `stages` table (see
  // 0023_workspace_tab_positions.sql), but they're merged into the same
  // sort order here for display purposes only — everything about how each
  // one's content is fetched/rendered stays exactly as it was, keyed off
  // `kind` below.
  type TabOrderEntry = { key: WorkspaceTab; kind: "details" | "summary" | "stage" };
  const tabOrder: TabOrderEntry[] = [
    { key: "details", kind: "details" } satisfies TabOrderEntry,
    { key: "summary", kind: "summary" } satisfies TabOrderEntry,
    ...stages.map((s): TabOrderEntry => ({ key: s.key, kind: "stage" })),
  ].sort((a, b) => {
    const sortOrderOf = (t: { key: WorkspaceTab; kind: "details" | "summary" | "stage" }) =>
      t.kind === "details"
        ? tabPositions.details
        : t.kind === "summary"
          ? tabPositions.summary
          : (stages.find((s) => s.key === t.key)?.sort_order ?? 0);
    return sortOrderOf(a) - sortOrderOf(b);
  });

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
            <div className="flex items-center gap-2">
              <PublicShareDialog
                planId={planId}
                initialShareEnabled={shareEnabled}
                initialShareToken={shareToken}
              />
              <ExportPlanTextButton planId={planId} planName={planName} />
              <ExportPlanButton planId={planId} planName={planName} />
              <PublishButton planId={planId} status={publishStatus} />
            </div>
          </div>
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
            {tabOrder.map((t) => {
              if (t.kind === "details") {
                return (
                  <TabsTrigger
                    key="details"
                    value="details"
                    className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
                  >
                    Plan Details
                  </TabsTrigger>
                );
              }
              if (t.kind === "summary") {
                return (
                  <TabsTrigger
                    key="summary"
                    value="summary"
                    className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
                  >
                    {summaryLoading && <Loader2 className="size-3 animate-spin" />}
                    Summary
                  </TabsTrigger>
                );
              }
              const s = stages.find((st) => st.key === t.key);
              if (!s) return null;
              return (
                <TabsTrigger
                  key={s.key}
                  value={s.key}
                  className="whitespace-nowrap data-active:bg-primary data-active:text-primary-foreground"
                >
                  {loadingStages[s.key] && <Loader2 className="size-3 animate-spin" />}
                  {s.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabOrder.map((t) => {
            if (t.kind === "details") {
              return (
                <TabsContent key="details" value="details" className="mt-6" keepMounted>
                  <PlanDetailsForm planId={planId} background={background} />
                </TabsContent>
              );
            }
            if (t.kind === "summary") {
              return (
                <TabsContent key="summary" value="summary" className="mt-6" keepMounted>
                  {summaryData ? (
                    <SummaryTab {...summaryData} />
                  ) : summaryLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading…
                    </div>
                  ) : null}
                </TabsContent>
              );
            }
            const s = stages.find((st) => st.key === t.key);
            if (!s) return null;
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
                      causeOptions={bundle.causeOptions}
                      measureSuggestions={bundle.measureSuggestions}
                      requirementOptions={bundle.requirementOptions}
                      strategyRows={bundle.strategyRows}
                      impactMeasureTypes={bundle.impactMeasureTypes}
                      onStageDataChanged={invalidateStage}
                    />
                  ) : (
                    <StagePlaceholder label={s.label} />
                  )
                ) : loadingStages[s.key] ? (
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
                stageLabel={
                  stage === "summary"
                    ? "Summary"
                    : stage === "details"
                      ? "Plan Details"
                      : (stages.find((s) => s.key === stage)?.label ?? stage)
                }
                stageHasFields={stage !== "summary" && Boolean(bundles[stage]?.fields.length)}
                checklist={stage !== "summary" ? (bundles[stage]?.checklist ?? []) : []}
                exemplars={stage !== "summary" ? (bundles[stage]?.exemplars ?? []) : []}
                fields={stage !== "summary" ? (bundles[stage]?.fields ?? []) : []}
                feedback={feedback}
                kbArticles={kbArticles}
                tags={tags}
                headings={headings}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

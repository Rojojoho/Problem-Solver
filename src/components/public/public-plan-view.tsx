import type { JSONContent } from "@tiptap/react";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTab } from "@/components/plan/summary-tab";
import { ReadOnlyRowTable, type ReadOnlyColumn } from "@/components/public/read-only-row-table";
import {
  asRowArray,
  EMPTY_DOC,
  MEASURES_FIELD_KEY,
  CAUSAL_HYPOTHESES_FIELD_KEY,
  CONSOLIDATED_HYPOTHESES_FIELD_KEY,
  SOLUTION_REQUIREMENTS_FIELD_KEY,
  SOLUTION_STRATEGIES_FIELD_KEY,
  IMPLEMENTATION_MONITORING_FIELD_KEY,
  IMPLEMENTATION_ROW_ORDER_FIELD_KEY,
  IMPACT_MEASURES_FIELD_KEY,
  SUMMARY_FIELD_KEYS,
} from "@/lib/ccps/constants";
import type {
  ConsolidatedHypothesisRow,
  HypothesisRow,
  ImplementationRow,
  ImpactMeasureRow,
  LinkRef,
  MeasureRow,
  PublicPlanBundle,
  SolutionRequirementRow,
  SolutionStrategyRow,
} from "@/lib/ccps/types";
import type { PlanSummaryData } from "@/app/plans/[id]/actions";

// Builds the same shape the in-app Summary tab uses, but from the bundle
// already fetched via the security-definer RPC — NOT by calling
// getPlanSummary (which reads via the normal authenticated Supabase client
// and would come back empty for an anonymous visitor, since RLS blocks it).
function buildPublicSummary(bundle: PublicPlanBundle): PlanSummaryData {
  const allFields = bundle.stages.flatMap((s) => s.fields);
  const allResponses: Record<string, JSONContent> = Object.assign(
    {},
    ...bundle.stages.map((s) => s.responses)
  );

  const fields = SUMMARY_FIELD_KEYS.map((fieldKey) => {
    const meta = allFields.find((f) => f.field_key === fieldKey);
    return {
      fieldKey,
      internalId: meta?.internal_id ?? "",
      label: meta?.full_prompt ?? fieldKey,
      content: allResponses[fieldKey] ?? EMPTY_DOC,
    };
  });

  const srResponses = bundle.stages.find((s) => s.key === "SR")?.responses;
  const ssResponses = bundle.stages.find((s) => s.key === "SS")?.responses;

  const requirements = asRowArray<SolutionRequirementRow>(
    srResponses?.[SOLUTION_REQUIREMENTS_FIELD_KEY]
  )
    .map((r) => r.requirement)
    .filter(Boolean);

  const strategies = asRowArray<SolutionStrategyRow>(
    ssResponses?.[SOLUTION_STRATEGIES_FIELD_KEY]
  )
    .filter((r) => r.strategy)
    .map((r) => ({ strategy: r.strategy, description: r.description }));

  return { fields, requirements, strategies };
}

// Deliberately its own, purely-presentational component tree — not the
// interactive stage-form/table components used in the logged-in workspace.
// Nothing here imports a mutating server action; this is what's rendered
// for anonymous, unauthenticated visitors via a public share link.
export function PublicPlanView({ bundle }: { bundle: PublicPlanBundle }) {
  const summary = buildPublicSummary(bundle);
  const responsesByStage: Record<string, Record<string, JSONContent>> = Object.fromEntries(
    bundle.stages.map((s) => [s.key, s.responses])
  );

  const causeRows = asRowArray<ConsolidatedHypothesisRow>(
    responsesByStage["CV"]?.[CONSOLIDATED_HYPOTHESES_FIELD_KEY]
  );
  const requirementRows = asRowArray<SolutionRequirementRow>(
    responsesByStage["SR"]?.[SOLUTION_REQUIREMENTS_FIELD_KEY]
  );
  const causeLabelById = new Map(causeRows.map((c) => [c.id, c.hypothesis]));
  const requirementLabelById = new Map(requirementRows.map((r) => [r.id, r.shortId]));

  function formatLinks(links: LinkRef[], labelById: Map<string, string>) {
    if (!links.length) return "—";
    return links
      .map((link) =>
        link.type === "ref" ? (labelById.get(link.targetId) ?? "Deleted item") : link.value
      )
      .join(", ");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{bundle.name}</h1>
        {bundle.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {bundle.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="details">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="details" className="whitespace-nowrap">
            Plan Details
          </TabsTrigger>
          <TabsTrigger value="summary" className="whitespace-nowrap">
            Summary
          </TabsTrigger>
          {bundle.stages.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="whitespace-nowrap">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <TiptapEditor content={bundle.background} editable={false} />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <SummaryTab {...summary} />
        </TabsContent>

        {bundle.stages.map((s) => (
          <TabsContent key={s.key} value={s.key} className="mt-6 space-y-6">
            <h2 className="text-xl font-bold tracking-tight">{s.label}</h2>
            {[...s.fields]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((field) => (
                <div key={field.field_key} className="space-y-1.5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="font-mono text-xs text-muted-foreground">
                      {field.internal_id}
                    </span>
                    {field.full_prompt}
                  </p>
                  {field.helper_text && (
                    <p className="text-xs text-muted-foreground">{field.helper_text}</p>
                  )}
                  {renderField(field.field_key, s.responses, {
                    causeLabelById,
                    requirementLabelById,
                    formatLinks,
                    responsesByStage,
                  })}
                  {field.field_key === "pi_outcome_data" && (
                    <ReadOnlyRowTable
                      columns={MEASURE_COLUMNS}
                      rows={asRowArray<MeasureRow>(s.responses[MEASURES_FIELD_KEY])}
                      emptyMessage="No measures added yet."
                    />
                  )}
                </div>
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

const MEASURE_COLUMNS: ReadOnlyColumn<MeasureRow>[] = [
  { key: "measure", label: "Measure" },
  { key: "baseline", label: "Baseline" },
  { key: "target", label: "Target" },
  { key: "notes", label: "Notes" },
];

const HYPOTHESIS_COLUMNS: ReadOnlyColumn<HypothesisRow>[] = [
  { key: "text", label: "Hypothesis" },
  {
    key: "categories",
    label: "Tags",
    render: (row) => (row.categories.length ? row.categories.join(", ") : "—"),
  },
  { key: "validation", label: "Initial Validation", render: (row) => row.validation ?? "—" },
];

const CONSOLIDATED_HYPOTHESIS_COLUMNS: ReadOnlyColumn<ConsolidatedHypothesisRow>[] = [
  { key: "hypothesis", label: "Causal hypothesis" },
  { key: "description", label: "Description" },
  { key: "validityTest", label: "Validity test" },
  {
    key: "confirmed",
    label: "Result",
    render: (row) =>
      row.confirmed === true ? "Confirmed" : row.confirmed === false ? "Disconfirmed" : "—",
  },
];

function requirementColumns(
  causeLabelById: Map<string, string>,
  formatLinks: (links: LinkRef[], labelById: Map<string, string>) => string
): ReadOnlyColumn<SolutionRequirementRow>[] {
  return [
    { key: "shortId", label: "ID" },
    { key: "requirement", label: "Requirement" },
    {
      key: "links",
      label: "Link to Gap or cause",
      render: (row) => formatLinks(row.links, causeLabelById),
    },
    {
      key: "types",
      label: "Type",
      render: (row) => (row.types.length ? row.types.join(", ") : "—"),
    },
  ];
}

function strategyColumns(
  requirementLabelById: Map<string, string>,
  formatLinks: (links: LinkRef[], labelById: Map<string, string>) => string
): ReadOnlyColumn<SolutionStrategyRow>[] {
  return [
    { key: "strategy", label: "Solution strategy" },
    { key: "description", label: "Description" },
    {
      key: "links",
      label: "Link",
      render: (row) => formatLinks(row.links, requirementLabelById),
    },
  ];
}

interface ImplementationDisplayRow {
  rowId: string;
  strategy: string;
  description: string;
  lead: string;
  timeframe: string;
  implementationIndicators: string;
  monitor: string;
}

const IMPLEMENTATION_COLUMNS: ReadOnlyColumn<ImplementationDisplayRow>[] = [
  { key: "strategy", label: "Solution strategy" },
  { key: "description", label: "Description" },
  { key: "lead", label: "Lead" },
  { key: "timeframe", label: "Timeframe" },
  { key: "implementationIndicators", label: "Implementation indicators" },
  { key: "monitor", label: "Monitor" },
];

const IMPACT_MEASURE_COLUMNS: ReadOnlyColumn<ImpactMeasureRow>[] = [
  { key: "measure", label: "Measure" },
  { key: "baseline", label: "Baseline" },
  { key: "target", label: "Target" },
  { key: "timeframe", label: "Timeframe" },
  { key: "type", label: "Type", render: (row) => row.type ?? "—" },
  { key: "actual", label: "Actual" },
  { key: "notes", label: "Notes" },
];

function renderField(
  fieldKey: string,
  responses: Record<string, JSONContent>,
  ctx: {
    causeLabelById: Map<string, string>;
    requirementLabelById: Map<string, string>;
    formatLinks: (links: LinkRef[], labelById: Map<string, string>) => string;
    responsesByStage: Record<string, Record<string, JSONContent>>;
  }
) {
  switch (fieldKey) {
    case CAUSAL_HYPOTHESES_FIELD_KEY:
      return (
        <ReadOnlyRowTable
          columns={HYPOTHESIS_COLUMNS}
          rows={asRowArray<HypothesisRow>(responses[fieldKey])}
          emptyMessage="No causal hypotheses added yet."
        />
      );
    case CONSOLIDATED_HYPOTHESES_FIELD_KEY:
      return (
        <ReadOnlyRowTable
          columns={CONSOLIDATED_HYPOTHESIS_COLUMNS}
          rows={asRowArray<ConsolidatedHypothesisRow>(responses[fieldKey])}
          emptyMessage="No consolidated hypotheses added yet."
        />
      );
    case SOLUTION_REQUIREMENTS_FIELD_KEY:
      return (
        <ReadOnlyRowTable
          columns={requirementColumns(ctx.causeLabelById, ctx.formatLinks)}
          rows={asRowArray<SolutionRequirementRow>(responses[fieldKey])}
          emptyMessage="No solution requirements added yet."
        />
      );
    case SOLUTION_STRATEGIES_FIELD_KEY:
      return (
        <ReadOnlyRowTable
          columns={strategyColumns(ctx.requirementLabelById, ctx.formatLinks)}
          rows={asRowArray<SolutionStrategyRow>(responses[fieldKey])}
          emptyMessage="No solution strategies added yet."
        />
      );
    case IMPLEMENTATION_MONITORING_FIELD_KEY: {
      // Mirrors the same merge implementation-monitoring-table.tsx does:
      // one row per Stage 3B strategy (live-mirrored name/description) plus
      // any standalone rows added directly on Stage 4, in the persisted
      // display order.
      const strategyRows = asRowArray<SolutionStrategyRow>(
        ctx.responsesByStage["SS"]?.[SOLUTION_STRATEGIES_FIELD_KEY]
      );
      const extraRows = asRowArray<ImplementationRow>(responses[fieldKey]);
      const order = asRowArray<string>(responses[IMPLEMENTATION_ROW_ORDER_FIELD_KEY]);

      const mirrored = strategyRows.map((strategy) => {
        const extra = extraRows.find((r) => r.strategyId === strategy.id);
        return {
          rowId: extra?.id ?? strategy.id,
          strategy: strategy.strategy,
          description: strategy.description,
          lead: extra?.lead ?? "",
          timeframe: extra?.timeframe ?? "",
          implementationIndicators: extra?.implementationIndicators ?? "",
          monitor: extra?.monitor ?? "",
        };
      });
      const standalone = extraRows
        .filter((r) => r.strategyId === null)
        .map((r) => ({
          rowId: r.id,
          strategy: r.strategy,
          description: r.description,
          lead: r.lead,
          timeframe: r.timeframe,
          implementationIndicators: r.implementationIndicators,
          monitor: r.monitor,
        }));

      const orderIndex = new Map(order.map((id, i) => [id, i]));
      const rows = [...mirrored, ...standalone].sort(
        (a, b) => (orderIndex.get(a.rowId) ?? Infinity) - (orderIndex.get(b.rowId) ?? Infinity)
      );

      return (
        <ReadOnlyRowTable
          columns={IMPLEMENTATION_COLUMNS}
          rows={rows}
          emptyMessage="No implementation rows added yet."
        />
      );
    }
    case IMPACT_MEASURES_FIELD_KEY:
      return (
        <ReadOnlyRowTable
          columns={IMPACT_MEASURE_COLUMNS}
          rows={asRowArray<ImpactMeasureRow>(responses[fieldKey])}
          emptyMessage="No impact measures added yet."
        />
      );
    default:
      return <TiptapEditor content={responses[fieldKey] ?? EMPTY_DOC} editable={false} />;
  }
}

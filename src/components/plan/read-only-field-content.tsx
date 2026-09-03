import type { JSONContent } from "@tiptap/react";
import { Waypoints } from "lucide-react";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TraceabilityDiagram } from "@/components/plan/strategy-traceability-dialog";
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
} from "@/lib/ccps/constants";
import { docToParagraphs } from "@/lib/ccps/doc-to-text";
import type {
  ConsolidatedHypothesisRow,
  DiagramHeadings,
  HypothesisRow,
  ImplementationRow,
  ImpactMeasureRow,
  LinkRef,
  MeasureRow,
  PublicPlanBundle,
  SolutionRequirementRow,
  SolutionStrategyRow,
} from "@/lib/ccps/types";
import type {
  StrategyTraceability,
  TraceCauseNode,
  TraceRequirement,
} from "@/app/(app)/plans/[id]/actions";

// Everything here renders one field's *stored* content read-only, handling
// every row-table type as well as plain rich text — shared by the public
// share view (public-plan-view.tsx) and the Exemplar side panel
// (exemplar-panel.tsx), both of which need to display someone else's
// already-saved plan content without any of the interactive
// editing/table components used in the live workspace.

// Builds the same shape strategy-traceability-dialog.tsx's
// getSolutionStrategyTraceability produces, but from an already-fetched
// bundle (no live re-fetch, and no risk of RLS blocking a read for a
// viewer who isn't a member of the source plan's org).
export function buildStrategyTraceability(
  bundle: PublicPlanBundle,
  strategyId: string,
  headings: DiagramHeadings
): StrategyTraceability {
  const piResponses = bundle.stages.find((s) => s.key === "PI")?.responses ?? {};
  const cvResponses = bundle.stages.find((s) => s.key === "CV")?.responses ?? {};
  const srResponses = bundle.stages.find((s) => s.key === "SR")?.responses ?? {};
  const ssResponses = bundle.stages.find((s) => s.key === "SS")?.responses ?? {};

  const measureRows = asRowArray<MeasureRow>(piResponses[MEASURES_FIELD_KEY]);
  const causeRows = asRowArray<ConsolidatedHypothesisRow>(
    cvResponses[CONSOLIDATED_HYPOTHESES_FIELD_KEY]
  );
  const requirementRows = asRowArray<SolutionRequirementRow>(
    srResponses[SOLUTION_REQUIREMENTS_FIELD_KEY]
  );
  const strategyRows = asRowArray<SolutionStrategyRow>(
    ssResponses[SOLUTION_STRATEGIES_FIELD_KEY]
  );

  const causeById = new Map(causeRows.map((c) => [c.id, c]));
  const measureByName = new Map(measureRows.map((m) => [m.measure, m]));
  const causeByHypothesis = new Map(causeRows.map((c) => [c.hypothesis, c]));
  const requirementById = new Map(requirementRows.map((r) => [r.id, r]));

  const strategyRow = strategyRows.find((s) => s.id === strategyId) ?? null;

  const requirements: TraceRequirement[] = (strategyRow?.links ?? []).map((link) => {
    const requirement = link.type === "ref" ? requirementById.get(link.targetId) : undefined;
    if (!requirement) {
      const label = link.type === "text" ? link.value : "Deleted requirement";
      return {
        id: link.type === "ref" ? link.targetId : label,
        shortId: label,
        requirement: "",
        dangling: true,
        causes: [],
      };
    }

    const causes: TraceCauseNode[] = requirement.links.map((l): TraceCauseNode => {
      if (l.type === "ref") {
        const cause = causeById.get(l.targetId);
        return cause
          ? { id: cause.id, kind: "cause", label: cause.hypothesis, detail: cause.description || undefined }
          : { id: `dangling:${l.targetId}`, kind: "dangling", label: "Deleted item" };
      }
      const measure = measureByName.get(l.value);
      if (measure) {
        return {
          id: `measure:${l.value}`,
          kind: "measure",
          label: l.value,
          detail: measure.baseline || measure.target
            ? `${measure.baseline || "—"} → ${measure.target || "—"}`
            : undefined,
        };
      }
      const matchedCause = causeByHypothesis.get(l.value);
      if (matchedCause) {
        return {
          id: matchedCause.id,
          kind: "cause",
          label: matchedCause.hypothesis,
          detail: matchedCause.description || undefined,
        };
      }
      return { id: `text:${l.value}`, kind: "text", label: l.value };
    });

    return {
      id: requirement.id,
      shortId: requirement.shortId,
      requirement: requirement.requirement,
      causes,
    };
  });

  const problemStatement = docToParagraphs(piResponses["pi_problem_description"]);

  return {
    strategy: strategyRow
      ? { name: strategyRow.strategy || "Untitled strategy", description: strategyRow.description }
      : null,
    problemStatement,
    requirements,
    headings,
  };
}

export function StrategyConnectionsCell({
  bundle,
  headings,
  strategyId,
  strategyLabel,
}: {
  bundle: PublicPlanBundle;
  headings: DiagramHeadings;
  strategyId: string;
  strategyLabel: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" size="icon-xs" variant="outline" aria-label="View connections">
            <Waypoints className="size-3.5" />
          </Button>
        }
      />
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            Connections{strategyLabel ? ` — ${strategyLabel}` : ""}
          </DialogTitle>
        </DialogHeader>
        <TraceabilityDiagram data={buildStrategyTraceability(bundle, strategyId, headings)} />
      </DialogContent>
    </Dialog>
  );
}

export interface FieldRenderContext {
  causeLabelById: Map<string, string>;
  requirementLabelById: Map<string, string>;
  formatLinks: (links: LinkRef[], labelById: Map<string, string>) => string;
  responsesByStage: Record<string, Record<string, JSONContent>>;
  bundle: PublicPlanBundle;
  headings: DiagramHeadings;
}

// Cross-stage label lookups (e.g. Solution Requirements showing a cause's
// live label) need the *whole* bundle, not just one stage's responses —
// build this once per bundle and reuse it across every field/stage.
export function buildFieldRenderContext(
  bundle: PublicPlanBundle,
  headings: DiagramHeadings
): FieldRenderContext {
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

  return { causeLabelById, requirementLabelById, formatLinks, responsesByStage, bundle, headings };
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
  formatLinks: (links: LinkRef[], labelById: Map<string, string>) => string,
  bundle: PublicPlanBundle,
  headings: DiagramHeadings
): ReadOnlyColumn<SolutionStrategyRow>[] {
  return [
    { key: "strategy", label: "Solution strategy" },
    { key: "description", label: "Description" },
    {
      key: "links",
      label: "Link",
      render: (row) => formatLinks(row.links, requirementLabelById),
    },
    {
      key: "connections",
      label: "",
      render: (row) => (
        <StrategyConnectionsCell
          bundle={bundle}
          headings={headings}
          strategyId={row.id}
          strategyLabel={row.strategy}
        />
      ),
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

// Renders one field's own content — including the trailing Measures table
// attached to pi_outcome_data — for every field type: row-tables get the
// same ReadOnlyRowTable treatment the interactive tables use, everything
// else falls through to a read-only TiptapEditor.
export function ReadOnlyFieldContent({
  fieldKey,
  responses,
  ctx,
}: {
  fieldKey: string;
  responses: Record<string, JSONContent>;
  ctx: FieldRenderContext;
}) {
  return (
    <>
      {renderField(fieldKey, responses, ctx)}
      {fieldKey === "pi_outcome_data" && (
        <ReadOnlyRowTable
          columns={MEASURE_COLUMNS}
          rows={asRowArray<MeasureRow>(responses[MEASURES_FIELD_KEY])}
          emptyMessage="No measures added yet."
        />
      )}
    </>
  );
}

function renderField(
  fieldKey: string,
  responses: Record<string, JSONContent>,
  ctx: FieldRenderContext
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
          columns={strategyColumns(ctx.requirementLabelById, ctx.formatLinks, ctx.bundle, ctx.headings)}
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

import type { JSONContent } from "@tiptap/react";
import { docToParagraphs } from "./doc-to-text";
import {
  asRowArray,
  MEASURES_FIELD_KEY,
  CAUSAL_HYPOTHESES_FIELD_KEY,
  CONSOLIDATED_HYPOTHESES_FIELD_KEY,
  SOLUTION_REQUIREMENTS_FIELD_KEY,
  SOLUTION_STRATEGIES_FIELD_KEY,
  IMPLEMENTATION_MONITORING_FIELD_KEY,
  IMPLEMENTATION_ROW_ORDER_FIELD_KEY,
  IMPACT_MEASURES_FIELD_KEY,
} from "./constants";
import type {
  ConsolidatedHypothesisRow,
  HypothesisRow,
  ImpactMeasureRow,
  ImplementationRow,
  LinkRef,
  MeasureRow,
  SolutionRequirementRow,
  SolutionStrategyRow,
  StageFieldSummary,
} from "./types";

interface StageForExport {
  key: string;
  label: string;
  fields: StageFieldSummary[];
  responses: Record<string, JSONContent>;
}

function mdTable(headers: string[], rows: string[][]): string[] {
  if (!rows.length) return ["_None added yet._"];
  const cell = (c: string) => (c || "—").replace(/\|/g, "\\|").replace(/\n+/g, " ");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
  ];
}

// Builds a single Markdown document for a whole plan — every stage's fields
// and answers, row-based tables rendered as Markdown tables — meant as a
// durable, human-readable record a school can keep even if they never touch
// Resolve again. Mirrors the row-type-specific rendering in
// web/src/components/public/public-plan-view.tsx so this export and the
// public/print view stay consistent with each other.
export function buildPlanMarkdown(plan: {
  name: string;
  tags: string[];
  background: JSONContent;
  stages: StageForExport[];
}): string {
  const lines: string[] = [];
  lines.push(`# ${plan.name}`, "");
  if (plan.tags.length) {
    lines.push(`**Tags:** ${plan.tags.join(", ")}`, "");
  }

  const bgParagraphs = docToParagraphs(plan.background);
  if (bgParagraphs.length) {
    lines.push("## Plan Details", "", ...bgParagraphs, "");
  }

  const responsesByStage: Record<string, Record<string, JSONContent>> = Object.fromEntries(
    plan.stages.map((s) => [s.key, s.responses])
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
      .map((l) => {
        if (l.type === "ref") return labelById.get(l.targetId) ?? "Deleted item";
        if (l.type === "knowledge") return "Knowledge item";
        return l.value;
      })
      .join(", ");
  }

  for (const stage of plan.stages) {
    lines.push(`## ${stage.label}`, "");
    const sortedFields = [...stage.fields].sort((a, b) => a.sort_order - b.sort_order);

    for (const field of sortedFields) {
      lines.push(`### ${field.internal_id} ${field.full_prompt}`, "");
      if (field.helper_text) lines.push(`_${field.helper_text}_`, "");

      const content = stage.responses[field.field_key];

      switch (field.field_key) {
        case CAUSAL_HYPOTHESES_FIELD_KEY: {
          const rows = asRowArray<HypothesisRow>(content);
          lines.push(
            ...mdTable(
              ["Hypothesis", "Tags", "Initial Validation"],
              rows.map((r) => [r.text, r.categories.join(", "), r.validation ?? ""])
            ),
            ""
          );
          break;
        }
        case CONSOLIDATED_HYPOTHESES_FIELD_KEY: {
          const rows = asRowArray<ConsolidatedHypothesisRow>(content);
          lines.push(
            ...mdTable(
              ["Causal hypothesis", "Description", "Validity test", "Result"],
              rows.map((r) => [
                r.hypothesis,
                r.description,
                r.validityTest,
                r.confirmed === true ? "Confirmed" : r.confirmed === false ? "Disconfirmed" : "",
              ])
            ),
            ""
          );
          break;
        }
        case SOLUTION_REQUIREMENTS_FIELD_KEY: {
          const rows = asRowArray<SolutionRequirementRow>(content);
          lines.push(
            ...mdTable(
              ["ID", "Requirement", "Link to Gap or cause", "Type"],
              rows.map((r) => [
                r.shortId,
                r.requirement,
                formatLinks(r.links, causeLabelById),
                r.types.join(", "),
              ])
            ),
            ""
          );
          break;
        }
        case SOLUTION_STRATEGIES_FIELD_KEY: {
          const rows = asRowArray<SolutionStrategyRow>(content);
          lines.push(
            ...mdTable(
              ["Solution strategy", "Description", "Link"],
              rows.map((r) => [r.strategy, r.description, formatLinks(r.links, requirementLabelById)])
            ),
            ""
          );
          break;
        }
        case IMPLEMENTATION_MONITORING_FIELD_KEY: {
          const strategyRows = asRowArray<SolutionStrategyRow>(
            responsesByStage["SS"]?.[SOLUTION_STRATEGIES_FIELD_KEY]
          );
          const extraRows = asRowArray<ImplementationRow>(content);
          const order = asRowArray<string>(stage.responses[IMPLEMENTATION_ROW_ORDER_FIELD_KEY]);

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

          lines.push(
            ...mdTable(
              ["Solution strategy", "Description", "Lead", "Timeframe", "Implementation indicators", "Monitor"],
              rows.map((r) => [
                r.strategy,
                r.description,
                r.lead,
                r.timeframe,
                r.implementationIndicators,
                r.monitor,
              ])
            ),
            ""
          );
          break;
        }
        case IMPACT_MEASURES_FIELD_KEY: {
          const rows = asRowArray<ImpactMeasureRow>(content);
          lines.push(
            ...mdTable(
              ["Measure", "Baseline", "Target", "Timeframe", "Type", "Actual", "Notes"],
              rows.map((r) => [r.measure, r.baseline, r.target, r.timeframe, r.type ?? "", r.actual, r.notes])
            ),
            ""
          );
          break;
        }
        default: {
          const paragraphs = docToParagraphs(content);
          lines.push(...(paragraphs.length ? paragraphs : ["_Not answered._"]), "");
        }
      }

      if (field.field_key === "pi_outcome_data") {
        const measureRows = asRowArray<MeasureRow>(stage.responses[MEASURES_FIELD_KEY]);
        lines.push(
          ...mdTable(
            ["Measure", "Baseline", "Target", "Notes"],
            measureRows.map((r) => [r.measure, r.baseline, r.target, r.notes])
          ),
          ""
        );
      }
    }
  }

  return lines.join("\n");
}

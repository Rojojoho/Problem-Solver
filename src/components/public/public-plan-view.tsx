import type { JSONContent } from "@tiptap/react";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTab } from "@/components/plan/summary-tab";
import {
  ReadOnlyFieldContent,
  buildFieldRenderContext,
} from "@/components/plan/read-only-field-content";
import { asRowArray, EMPTY_DOC, SOLUTION_REQUIREMENTS_FIELD_KEY, SOLUTION_STRATEGIES_FIELD_KEY, SUMMARY_FIELD_KEYS } from "@/lib/ccps/constants";
import type {
  DiagramHeadings,
  PublicPlanBundle,
  SolutionRequirementRow,
  SolutionStrategyRow,
  WorkspaceTabPositions,
} from "@/lib/ccps/types";
import type { PlanSummaryData } from "@/app/(app)/plans/[id]/actions";

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
type TabOrderEntry =
  | { kind: "details"; sortOrder: number }
  | { kind: "summary"; sortOrder: number }
  | { kind: "stage"; sortOrder: number; stage: PublicPlanBundle["stages"][number] };

export function PublicPlanView({
  bundle,
  headings,
  tabPositions,
}: {
  bundle: PublicPlanBundle;
  headings: DiagramHeadings;
  tabPositions: WorkspaceTabPositions;
}) {
  const summary = buildPublicSummary(bundle);

  const tabOrder: TabOrderEntry[] = [
    { kind: "details", sortOrder: tabPositions.details } satisfies TabOrderEntry,
    { kind: "summary", sortOrder: tabPositions.summary } satisfies TabOrderEntry,
    ...bundle.stages.map(
      (s): TabOrderEntry => ({ kind: "stage", sortOrder: s.sort_order, stage: s })
    ),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const fieldCtx = buildFieldRenderContext(bundle, headings);

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
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
          {tabOrder.map((t) =>
            t.kind === "details" ? (
              <TabsTrigger key="details" value="details" className="whitespace-nowrap">
                Plan Details
              </TabsTrigger>
            ) : t.kind === "summary" ? (
              <TabsTrigger key="summary" value="summary" className="whitespace-nowrap">
                Summary
              </TabsTrigger>
            ) : (
              <TabsTrigger key={t.stage.key} value={t.stage.key} className="whitespace-nowrap">
                {t.stage.label}
              </TabsTrigger>
            )
          )}
        </TabsList>

        {tabOrder.map((t) => {
          if (t.kind === "details") {
            return (
              <TabsContent key="details" value="details" className="mt-6">
                <TiptapEditor content={bundle.background} editable={false} />
              </TabsContent>
            );
          }
          if (t.kind === "summary") {
            return (
              <TabsContent key="summary" value="summary" className="mt-6">
                <SummaryTab {...summary} />
              </TabsContent>
            );
          }
          const s = t.stage;
          return (
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
                    <ReadOnlyFieldContent
                      fieldKey={field.field_key}
                      responses={s.responses}
                      ctx={fieldCtx}
                    />
                  </div>
                ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

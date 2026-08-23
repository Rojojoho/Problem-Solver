"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Loader2, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getSolutionStrategyTraceability,
  type StrategyTraceability,
  type TraceCauseNode,
} from "@/app/plans/[id]/actions";
import { cn } from "@/lib/utils";

interface StrategyTraceabilityDialogProps {
  planId: string;
  strategyId: string;
  strategyLabel: string;
}

// Fetched fresh every time the dialog opens rather than cached — same
// live-refetch reasoning as every other cross-stage picker in these
// tables (LinkCell/LinkPicker's onOpenChange), since a stale snapshot
// would silently show connections that have since changed or been removed.
export function StrategyTraceabilityDialog({
  planId,
  strategyId,
  strategyLabel,
}: StrategyTraceabilityDialogProps) {
  const [data, setData] = useState<StrategyTraceability | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) return;
    setLoading(true);
    setData(null);
    getSolutionStrategyTraceability(planId, strategyId)
      .then(setData)
      .catch(() => toast.error("Couldn't load the connections for this strategy."))
      .finally(() => setLoading(false));
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            aria-label="View connections"
          >
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

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : data ? (
          <TraceabilityDiagram data={data} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// --- diagram ---------------------------------------------------------

type NodeKind = "strategy" | "requirement" | "cause" | "measure" | "text" | "dangling" | "problem";

// Visual left-to-right column order (reversed from the underlying
// strategy->requirement->cause->problem link direction, per request: reads
// as "problem, causes, requirements, strategy" instead). Edges connect
// nodes based on this column index rather than which end is "from"/"to",
// so a line always runs from the visually-left node to the visually-right
// one regardless of which way the underlying data link points.
const COLUMN_OF: Record<NodeKind, number> = {
  problem: 0,
  cause: 1,
  measure: 1,
  text: 1,
  dangling: 1, // overridden per-node below (a dangling requirement sits in column 2, not 1)
  requirement: 2,
  strategy: 3,
};

interface DiagramNode {
  key: string;
  kind: NodeKind;
  column: number;
  title: string;
  body?: string;
}

interface DiagramEdge {
  from: string;
  to: string;
}

const STRATEGY_KEY = "strategy";
const PROBLEM_KEY = "problem";

function buildDiagram(data: StrategyTraceability) {
  const requirementNodes: DiagramNode[] = [];
  const causeNodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];

  data.requirements.forEach((req, i) => {
    const reqKey = `req:${req.id}:${i}`;
    if (req.dangling) {
      requirementNodes.push({
        key: reqKey,
        kind: "dangling",
        column: COLUMN_OF.requirement,
        title: "Deleted requirement",
      });
      edges.push({ from: STRATEGY_KEY, to: reqKey });
      return;
    }
    requirementNodes.push({
      key: reqKey,
      kind: "requirement",
      column: COLUMN_OF.requirement,
      title: req.shortId,
      body: req.requirement || undefined,
    });
    edges.push({ from: STRATEGY_KEY, to: reqKey });

    req.causes.forEach((cause: TraceCauseNode) => {
      const causeKey = `cause:${cause.id}`;
      if (!causeNodes.has(causeKey)) {
        causeNodes.set(causeKey, {
          key: causeKey,
          kind: cause.kind,
          column: COLUMN_OF[cause.kind],
          title: cause.label,
          body: cause.detail,
        });
      }
      edges.push({ from: reqKey, to: causeKey });
    });
  });

  for (const causeNode of causeNodes.values()) {
    edges.push({ from: causeNode.key, to: PROBLEM_KEY });
  }

  const strategyNode: DiagramNode = {
    key: STRATEGY_KEY,
    kind: "strategy",
    column: COLUMN_OF.strategy,
    title: data.strategy?.name || "Untitled strategy",
    body: data.strategy?.description || undefined,
  };

  const problemNode: DiagramNode = {
    key: PROBLEM_KEY,
    kind: "problem",
    column: COLUMN_OF.problem,
    title: "1.1 Problem",
    body: data.problemStatement.length ? data.problemStatement.join(" ") : "Not filled in yet.",
  };

  return {
    strategyNode,
    requirementNodes,
    causeNodes: [...causeNodes.values()],
    problemNode,
    edges,
  };
}

export function TraceabilityDiagram({ data }: { data: StrategyTraceability }) {
  const diagram = buildDiagram(data);
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef(new Map<string, HTMLDivElement>());
  const [paths, setPaths] = useState<{ id: string; d: string }[]>([]);

  const columnByKey = new Map<string, number>([
    [diagram.strategyNode.key, diagram.strategyNode.column],
    [diagram.problemNode.key, diagram.problemNode.column],
    ...diagram.requirementNodes.map((n): [string, number] => [n.key, n.column]),
    ...diagram.causeNodes.map((n): [string, number] => [n.key, n.column]),
  ]);

  function setBoxRef(key: string) {
    return (el: HTMLDivElement | null) => {
      if (el) boxRefs.current.set(key, el);
      else boxRefs.current.delete(key);
    };
  }

  function computeEdges() {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    function anchor(key: string, side: "left" | "right") {
      const el = boxRefs.current.get(key);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = (side === "right" ? r.right : r.left) - containerRect.left;
      const y = r.top + r.height / 2 - containerRect.top;
      return { x, y };
    }

    const next = diagram.edges
      .map((edge) => {
        // Anchor by visual column position, not by which end is "from"/
        // "to" — the diagram's reading order (problem→causes→requirements
        // →strategy) runs opposite to the underlying link direction
        // (strategy→requirement→cause→problem).
        const fromIsLeft = (columnByKey.get(edge.from) ?? 0) <= (columnByKey.get(edge.to) ?? 0);
        const leftKey = fromIsLeft ? edge.from : edge.to;
        const rightKey = fromIsLeft ? edge.to : edge.from;
        const from = anchor(leftKey, "right");
        const to = anchor(rightKey, "left");
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        return {
          id: `${edge.from}->${edge.to}`,
          d: `M ${from.x},${from.y} C ${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`,
        };
      })
      .filter((p): p is { id: string; d: string } => p !== null);

    setPaths(next);
  }

  useLayoutEffect(() => {
    computeEdges();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => computeEdges());
    observer.observe(container);
    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) computeEdges();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="max-h-[80vh] overflow-auto">
      <div ref={containerRef} className="relative min-w-max p-2">
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
          {paths.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        <div className="relative z-10 flex gap-12">
          <DiagramColumn heading={data.headings.problem}>
            <NodeBox node={diagram.problemNode} setRef={setBoxRef} />
          </DiagramColumn>

          <DiagramColumn heading={data.headings.causes}>
            {diagram.causeNodes.length ? (
              diagram.causeNodes.map((n) => (
                <NodeBox key={n.key} node={n} setRef={setBoxRef} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No causes or measures linked yet.
              </p>
            )}
          </DiagramColumn>

          <DiagramColumn heading={data.headings.requirements}>
            {diagram.requirementNodes.length ? (
              diagram.requirementNodes.map((n) => (
                <NodeBox key={n.key} node={n} setRef={setBoxRef} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No requirements linked yet.
              </p>
            )}
          </DiagramColumn>

          <DiagramColumn heading={data.headings.strategy}>
            <NodeBox node={diagram.strategyNode} setRef={setBoxRef} />
          </DiagramColumn>
        </div>
      </div>
    </div>
  );
}

function DiagramColumn({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-56 flex-none flex-col gap-4">
      <h4 className="text-xs font-semibold text-muted-foreground">{heading}</h4>
      <div className="flex flex-1 flex-col justify-center gap-4">{children}</div>
    </div>
  );
}

function NodeBox({
  node,
  setRef,
}: {
  node: DiagramNode;
  setRef: (key: string) => (el: HTMLDivElement | null) => void;
}) {
  const isDangling = node.kind === "dangling";
  return (
    <div
      ref={setRef(node.key)}
      className={cn(
        "rounded-md border bg-card p-3 text-xs shadow-sm",
        isDangling ? "border-dashed border-border text-muted-foreground italic" : "border-border"
      )}
    >
      <div className={cn("font-medium", node.kind === "strategy" && "text-sm")}>
        {node.kind === "measure" && !isDangling ? "Measure: " : null}
        {node.title}
      </div>
      {node.body ? (
        <p className="mt-1 line-clamp-4 text-muted-foreground">{node.body}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportPlan } from "@/app/plans/[id]/actions";

// Downloads a plan as JSON — the counterpart to ImportPlanDialog on the
// plans list. Meant for quickly moving a plan between two environments
// that don't share a database (e.g. local dev vs. the Vercel-deployed
// app), not as a general backup tool.
export function ExportPlanButton({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      try {
        const data = await exportPlan(planId);
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${planName.replace(/[^\w\- ]+/g, "").trim() || "plan"}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Couldn't export this plan.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      <Download className="size-3.5" />
      {isPending ? "Exporting…" : "Export"}
    </Button>
  );
}

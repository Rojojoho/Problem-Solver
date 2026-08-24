"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportPlanAsText } from "@/app/plans/[id]/actions";

// Downloads a full Markdown document of the plan — every stage's fields,
// answers, and tables — meant to be opened and read, unlike
// ExportPlanButton's round-trip JSON.
export function ExportPlanTextButton({
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
        const markdown = await exportPlanAsText(planId);
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${planName.replace(/[^\w\- ]+/g, "").trim() || "plan"}.md`;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Couldn't export this plan.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      <FileText className="size-3.5" />
      {isPending ? "Exporting…" : "Export as text"}
    </Button>
  );
}

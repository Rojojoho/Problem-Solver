"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KnowledgeTypesEditor } from "@/components/admin/knowledge-types-editor";
import { updatePageSetting } from "@/app/(app)/admin/settings/pages/actions";
import type { LabeledOption, PageKey, PageSettings } from "@/lib/ccps/types";

const SECTION_LABELS: Record<PageKey, string> = {
  knowledge_base: "Knowledge Base",
  guide: "Best Practice Guide",
  users: "User Management",
  school_settings: "School Settings",
};

export function PagesSettingsEditor({
  pageSettings,
  knowledgeTypes,
}: {
  pageSettings: PageSettings[];
  knowledgeTypes: LabeledOption[];
}) {
  return (
    <div className="space-y-6">
      {pageSettings.map((settings) => (
        <PageSettingsCard key={settings.pageKey} settings={settings}>
          {settings.pageKey === "knowledge_base" && (
            <div className="mt-6 max-w-xl border-t border-border pt-6">
              <h3 className="mb-3 text-sm font-medium">Types</h3>
              <KnowledgeTypesEditor options={knowledgeTypes} />
            </div>
          )}
        </PageSettingsCard>
      ))}
    </div>
  );
}

function PageSettingsCard({
  settings,
  children,
}: {
  settings: PageSettings;
  children?: React.ReactNode;
}) {
  const [menuTitle, setMenuTitle] = useState(settings.menuTitle);
  const [screenTitle, setScreenTitle] = useState(settings.screenTitle);
  const [description, setDescription] = useState(settings.description);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updatePageSetting(settings.pageKey, { menuTitle, screenTitle, description });
        toast.success("Saved.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save these settings.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{SECTION_LABELS[settings.pageKey]}</CardTitle>
      </CardHeader>
      <CardContent className="max-w-xl space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${settings.pageKey}-menu-title`}>Menu title</Label>
          <Input
            id={`${settings.pageKey}-menu-title`}
            value={menuTitle}
            onChange={(e) => setMenuTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${settings.pageKey}-screen-title`}>Screen title</Label>
          <Input
            id={`${settings.pageKey}-screen-title`}
            value={screenTitle}
            onChange={(e) => setScreenTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${settings.pageKey}-description`}>Description</Label>
          <Textarea
            id={`${settings.pageKey}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          Save
        </Button>
        {children}
      </CardContent>
    </Card>
  );
}

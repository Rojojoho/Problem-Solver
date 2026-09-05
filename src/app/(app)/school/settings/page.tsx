import { getPageSetting } from "@/lib/db";

export default async function SchoolSettingsPage() {
  const pageSettings = await getPageSetting("school_settings");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pageSettings.screenTitle}</h1>
        {pageSettings.description && (
          <p className="text-sm text-muted-foreground">{pageSettings.description}</p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">Nothing to configure yet.</p>
    </div>
  );
}

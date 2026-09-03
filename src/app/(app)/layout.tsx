import { TopNav } from "@/components/top-nav";

// Shared by every authenticated top-level section (plans, kb, admin,
// school) so TopNav — and the auth/admin check it does — mounts once per
// session instead of being torn down and re-fetched on every single click
// between top-nav links. Previously each section had its own separate
// layout.tsx independently rendering <TopNav />, which meant navigating
// from e.g. Plans to Admin fully remounted the nav bar and re-ran its
// getCurrentUserId()/isAdmin() checks from scratch every time.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      {children}
    </div>
  );
}

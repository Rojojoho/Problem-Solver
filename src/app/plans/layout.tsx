import { TopNav } from "@/components/top-nav";

export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="w-full flex-1 px-4 pt-22 pb-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

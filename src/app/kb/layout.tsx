import { TopNav } from "@/components/top-nav";

export default function KbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-22 pb-8">
        {children}
      </main>
    </div>
  );
}

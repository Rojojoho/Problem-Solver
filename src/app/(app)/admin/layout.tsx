import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-22 pb-8">
      {children}
    </main>
  );
}

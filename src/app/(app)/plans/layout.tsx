export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="w-full flex-1 px-4 pt-22 pb-8 sm:px-6">
      {children}
    </main>
  );
}

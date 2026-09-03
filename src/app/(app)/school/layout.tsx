export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-22 pb-8">
      {children}
    </main>
  );
}

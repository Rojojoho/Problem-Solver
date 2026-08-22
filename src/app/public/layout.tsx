import Image from "next/image";

// Deliberately not `TopNav` — that fetches the signed-in user's email/admin
// status via server calls that assume a session, which anonymous visitors
// to a public share link never have.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center border-b border-nav-foreground/10 bg-nav px-4 sm:px-6">
        <Image
          src="/assets/Resolve_white_small.png"
          alt=""
          width={200}
          height={87}
          className="h-5 w-auto"
          priority
        />
        <span className="ml-2 text-xl font-bold text-white">Resolve</span>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

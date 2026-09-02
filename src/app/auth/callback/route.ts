import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only a same-origin relative path is a valid redirect target — anything
// else (an absolute URL, or a protocol-relative "//evil.example.com" that
// the browser resolves as an absolute URL) is rejected in favor of the
// default, closing the open-redirect this query param would otherwise
// allow right after a successful login.
function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/plans";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

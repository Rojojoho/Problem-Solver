import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Not using the generated `Database` generic yet — regenerate types once the
// project is connected (see database.types.ts) and reintroduce it here.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — session refresh is handled
            // in proxy.ts, so this can be safely ignored here.
          }
        },
      },
    }
  );
}

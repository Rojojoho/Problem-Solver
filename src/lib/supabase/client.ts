import { createBrowserClient } from "@supabase/ssr";

// Not using the generated `Database` generic yet — regenerate types once the
// project is connected (see database.types.ts) and reintroduce it here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

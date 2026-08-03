/**
 * Dev-only bypass so the app can be clicked through without a Supabase
 * project connected. Skips auth entirely and serves in-memory mock data.
 *
 * Must NEVER be enabled in production — only set DEV_MOCK=true in a local
 * .env.local. Remove this module (and its call sites) once real usage
 * starts relying on persisted data.
 */
export const DEV_MOCK =
  process.env.DEV_MOCK === "true" && process.env.NODE_ENV !== "production";

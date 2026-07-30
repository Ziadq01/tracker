import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ADRIX has no authentication, so there is no per-user session to carry — a
 * plain anon-key client is all the server components need.
 *
 * When the env vars are absent (fresh clone, preview build without secrets) we
 * return null instead of throwing. The dashboard then renders its "not
 * connected" state rather than failing the build.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

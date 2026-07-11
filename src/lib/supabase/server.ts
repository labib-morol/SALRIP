import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for Route Handlers. Uses the service-role key, so
 * it bypasses RLS — never import this into client components. The frontend goes
 * through the /api/cases routes, which use this client.
 */
let cached: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

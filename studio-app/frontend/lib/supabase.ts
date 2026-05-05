// Supabase browser client.
// Use this in client components ("use client") and from frontend/app/* pages.
//
// For server-side code (route handlers, server actions) prefer creating a
// per-request client with the service role key — never ship that key to the
// browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in development; in production this should be set via Vercel env.
  // eslint-disable-next-line no-console
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example → .env.local and fill them in."
  );
}

export const supabase: SupabaseClient = createClient(
  url!,
  anonKey!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

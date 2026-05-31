"use client";

/**
 * OAuth callback handler for Supabase PKCE flow.
 *
 * Supabase redirects the browser here after Google login.
 * The URL will contain either:
 *   - A `code` query param (PKCE) — supabase-js exchanges it automatically
 *   - A hash fragment with the access/refresh tokens (implicit)
 *
 * We listen for the session and then redirect to the original destination.
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  useEffect(() => {
    // Check if a session already exists (e.g. tokens were in the hash and
    // supabase-js already parsed them before this component mounted).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(next);
      }
    });

    // Otherwise wait for the auth state change that fires once the code/token
    // exchange completes.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace(next);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router, next]);

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4">
      {/* Simple spinner */}
      <svg
        className="animate-spin text-neutral-400"
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      <p className="text-sm text-neutral-500">Signing you in…</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}

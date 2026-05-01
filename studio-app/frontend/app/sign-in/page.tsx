"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/cart";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If they're already signed in, skip the screen entirely.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [router, next]);

  async function startGoogle() {
    setBusy(true);
    setError(null);
    try {
      const redirect =
        typeof window !== "undefined"
          ? `${window.location.origin}${next}`
          : undefined;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect },
      });
      if (err) throw err;
      // signInWithOAuth navigates the browser; control rarely returns here.
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 sm:px-0 py-16">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Account
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          Sign in or create an account
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Continue with the account you already use. We never see your password.
        </p>
      </header>

      <button
        type="button"
        onClick={startGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-6 py-3 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-40"
      >
        <GoogleIcon />
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t start sign-in: {error}
        </p>
      )}

      <p className="text-xs text-neutral-500">
        By continuing you agree to Amenity&apos;s Terms of Service and Privacy
        Policy.
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline Google brand mark. Standardised colors per Google sign-in guidelines.
// ---------------------------------------------------------------------------
function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

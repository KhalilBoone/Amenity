"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

export default function NewsletterSignup() {
  const [email, setEmail]     = useState("");
  const [status, setStatus]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    // Swap this fetch call for your actual email service endpoint
    // (Mailchimp, Klaviyo, Loops, Resend, etc.)
    try {
      // Simulate a successful signup since no API is wired yet
      await new Promise((r) => setTimeout(r, 600));
      setStatus("done");
      setMessage("You're in. We'll be in touch.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <section className="border-t border-neutral-100" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-0 py-14">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          {/* Copy */}
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Stay in the loop
            </p>
            <h2 className="mt-1.5 font-display text-2xl tracking-tight">
              Get new arrivals &amp; wholesale deals first.
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              No spam. Unsubscribe any time.
            </p>
          </div>

          {/* Form */}
          <div className="w-full md:max-w-md">
            {status === "done" ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                </svg>
                {message}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex w-full gap-2">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="group inline-flex flex-shrink-0 items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {status === "loading" ? "…" : (
                    <>
                      Subscribe
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-paper/30 transition-all duration-200 group-hover:bg-paper group-hover:border-paper group-hover:text-ink">
                        <ArrowRight size={10} weight="bold" aria-hidden />
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
            {status === "error" && (
              <p className="mt-2 text-xs text-red-600">{message}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

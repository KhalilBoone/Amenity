"use client";

/**
 * Unified Production + Sourcing inquiry modal.
 *
 * Auth flow:
 *   1. On open: check session.
 *   2. If signed out → render AuthModal overlay (Google OAuth / future methods).
 *      onAuthStateChange listener transitions to "form" once session arrives.
 *      If AuthModal is dismissed without sign-in → InquiryModal also closes.
 *   3. If signed in → go straight to "form".
 *
 * Inquiry flow:
 *   form → loading (15 s animated steps) → success
 *
 * The HTTP request fires as soon as "Begin Process" is clicked;
 * the 15-second timer and success state are driven by the UI timer,
 * not the API response, so the experience is deterministic.
 */

import { useEffect, useRef, useState } from "react";
import {
  X,
  ArrowRight,
  CheckCircle,
  SpinnerGap,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";
import AuthModal from "@/components/AuthModal";

export type InquiryMode = "production" | "sourcing";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: InquiryMode;
}

type Phase = "auth-check" | "form" | "loading" | "success";

/* ── Loading step copy per mode ──────────────────────────────────────────── */
const STEPS: Record<InquiryMode, string[]> = {
  production: [
    "Analyzing your brief…",
    "Extracting product keywords…",
    "Matching manufacturer capabilities…",
    "Reviewing production timelines…",
    "Finalizing your inquiry…",
  ],
  sourcing: [
    "Analyzing your requirements…",
    "Searching fabric mills…",
    "Matching material specifications…",
    "Reviewing certifications…",
    "Finalizing your inquiry…",
  ],
};

const TOTAL_MS = 15_000;

/* ── Component ───────────────────────────────────────────────────────────── */
export default function InquiryModal({ open, onClose, mode }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /* phase */
  const [phase, setPhase] = useState<Phase>("auth-check");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  /* form fields */
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [brandName, setBrandName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [certifications, setCertifications] = useState("");
  const [notes, setNotes] = useState("");

  /* loading */
  const [loadingStep, setLoadingStep] = useState(0);

  /* misc */
  const [error, setError] = useState<string | null>(null);

  /* ── Reset + auth-check on open ─────────────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      setAuthModalOpen(false);
      return;
    }
    setPhase("auth-check");
    setError(null);
    setLoadingStep(0);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPhase("form");
      } else {
        setAuthModalOpen(true);
      }
    });
  }, [open]);

  /* Watch for auth state while auth modal is open */
  useEffect(() => {
    if (!open || phase !== "auth-check") return;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthModalOpen(false);
        setPhase("form");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [open, phase]);

  /* ── Keyboard + scroll lock ─────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open && phase !== "auth-check") {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, phase, onClose]);

  /* ── Loading animation + success timer ─────────────────────────────────── */
  useEffect(() => {
    if (phase !== "loading") return;

    setLoadingStep(0);
    const steps = STEPS[mode];
    const stepMs = TOTAL_MS / steps.length;
    let step = 0;

    const stepInterval = setInterval(() => {
      step += 1;
      if (step < steps.length) {
        setLoadingStep(step);
      } else {
        clearInterval(stepInterval);
      }
    }, stepMs);

    const successTimer = setTimeout(() => {
      setPhase("success");
    }, TOTAL_MS);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(successTimer);
    };
  }, [phase, mode]);

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setError(null);
    setPhase("loading");

    const endpoint =
      mode === "production" ? "/production/inquire" : "/sourcing/inquire";

    const payload =
      mode === "production"
        ? { description, brand_name: brandName, quantity, budget, timeline, notes }
        : {
            description,
            brand_name: brandName,
            material_type: materialType,
            quantity,
            budget,
            timeline,
            certifications,
            notes,
          };

    // Fire and forget — UI advances on the 15 s timer regardless.
    apiPost(endpoint, payload).catch(() => {});
  }

  /* ── Handle AuthModal close ─────────────────────────────────────────────── */
  function handleAuthClose() {
    setAuthModalOpen(false);
    // Re-check; if still no session the user dismissed without signing in.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPhase("form");
      } else {
        onClose();
      }
    });
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  if (!open) return null;

  const title = mode === "production" ? "Start Production" : "Start Sourcing";
  const subtitle =
    mode === "production"
      ? "Tell us about your project and we'll match you with the right manufacturers."
      : "Describe what materials you need and we'll find the best suppliers.";

  return (
    <>
      {/* Auth modal — shown when user is not signed in */}
      <AuthModal open={authModalOpen} onClose={handleAuthClose} />

      {/* Inquiry modal — shown once auth check passes */}
      {phase !== "auth-check" && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-100 px-6 py-5 bg-white flex-shrink-0">
              <div>
                <p className="font-display text-xl tracking-tight">{title}</p>
                {phase === "form" && (
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed max-w-xs">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
                aria-label="Close"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-6">

              {/* ── Form ───────────────────────────────────────────────── */}
              {phase === "form" && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                  {/* Main description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      {mode === "production"
                        ? "Describe your project *"
                        : "What do you need? *"}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        mode === "production"
                          ? "e.g. 300 heavyweight hoodies, 400gsm French terry, embroidery on chest, 6 colorways, Q3 delivery"
                          : "e.g. 500m of 400gsm French terry, GOTS certified, natural colorways, delivery by August"
                      }
                      className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none"
                    />
                  </div>

                  {/* Sourcing: material type */}
                  {mode === "sourcing" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Material type
                      </label>
                      <input
                        type="text"
                        value={materialType}
                        onChange={(e) => setMaterialType(e.target.value)}
                        placeholder="e.g. French terry, heavyweight fleece, cotton twill, GOTS organic"
                        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  )}

                  {/* Brand + Quantity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Brand name
                      </label>
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Your brand"
                        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        {mode === "production" ? "Quantity" : "Volume"}
                      </label>
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder={
                          mode === "production" ? "e.g. 300 units" : "e.g. 500 meters"
                        }
                        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  </div>

                  {/* Budget + Timeline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Budget
                      </label>
                      <input
                        type="text"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="e.g. $8,000 total"
                        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Timeline
                      </label>
                      <input
                        type="text"
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        placeholder="e.g. 10 weeks, Q3 2025"
                        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  </div>

                  {/* Certifications (sourcing only) */}
                  {mode === "sourcing" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Certifications needed
                      </label>
                      <input
                        type="text"
                        value={certifications}
                        onChange={(e) => setCertifications(e.target.value)}
                        placeholder="e.g. GOTS, OEKO-TEX, BCI, Bluesign"
                        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Additional notes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything else we should know?"
                      className="rounded-lg border border-neutral-300 px-4 py-3 text-sm placeholder:text-neutral-400 outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!description.trim()}
                    className="group flex w-full items-center justify-between rounded-lg bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
                  >
                    Begin Process
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-paper/40 transition-all duration-200 group-hover:bg-paper group-hover:border-paper group-hover:text-ink">
                      <ArrowRight size={12} weight="bold" aria-hidden />
                    </span>
                  </button>
                </form>
              )}

              {/* ── Loading ─────────────────────────────────────────────── */}
              {phase === "loading" && (
                <div className="flex flex-col items-center gap-10 py-10">
                  {/* Spinner */}
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <SpinnerGap
                      size={72}
                      weight="thin"
                      className="animate-spin text-ink"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-ink/5" />
                    </div>
                  </div>

                  {/* Step copy + progress */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <p className="font-display text-xl tracking-tight text-ink transition-all duration-500">
                      {STEPS[mode][loadingStep]}
                    </p>
                    {/* Progress dots */}
                    <div className="flex items-center gap-2">
                      {STEPS[mode].map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-full transition-all duration-500 ${
                            i < loadingStep
                              ? "h-2 w-2 bg-ink"
                              : i === loadingStep
                              ? "h-2 w-6 bg-ink"
                              : "h-2 w-2 bg-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400">
                      Usually takes about 15 seconds
                    </p>
                  </div>
                </div>
              )}

              {/* ── Success ─────────────────────────────────────────────── */}
              {phase === "success" && (
                <div className="flex flex-col items-center gap-7 py-8 text-center">
                  {/* Checkmark circle */}
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle
                      size={52}
                      weight="fill"
                      className="text-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-display text-2xl tracking-tight">
                      Inquiry received!
                    </p>
                    <p className="text-sm text-neutral-600 max-w-xs leading-relaxed mx-auto">
                      Thank you for your inquiry. We&apos;ll get back to you
                      within 48 hours.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-ink px-10 py-3 text-sm font-medium text-paper transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

/**
 * Production request modal.
 *
 * Opened by the "Start Production" CTA on the homepage.
 * Auth-gated: unauthenticated users are redirected to /sign-in.
 * All inputs are type="text" — the backend handles any parsing.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, UploadSimple, CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

interface SuccessData {
  order_id: string;
  matched_capabilities: string[];
  detected_quantity: number | null;
  detected_colors: string[];
}

const CAPABILITY_LABELS: Record<string, string> = {
  knitwear:     "Knitwear",
  wovens:       "Wovens",
  outerwear:    "Outerwear",
  denim:        "Denim",
  activewear:   "Activewear",
  footwear:     "Footwear",
  headwear:     "Headwear",
  accessories:  "Accessories",
  loungewear:   "Loungewear",
  cut_sew:      "Cut & Sew",
  screen_print: "Screen Print",
  embroidery:   "Embroidery",
  dtg:          "DTG",
};

export default function ProductionModal({ open, onClose }: Props) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    description: "",
    brand_name:  "",
    quantity:    "",
    budget:      "",
    timeline:    "",
    notes:       "",
  });
  const [images, setImages] = useState<File[]>([]);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setAuthChecked(false);
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Not signed in — bounce to sign-in, return here after
        router.push(
          `/sign-in?next=${encodeURIComponent("/?production=1")}`
        );
        onClose();
      } else {
        setAuthChecked(true);
        // Pre-fill brand if we have it
        setTimeout(() => firstFieldRef.current?.focus(), 50);
      }
    });
  }, [open, router, onClose]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ── Lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    // Enforce string-only: strip any non-printable characters
    setForm((prev) => ({ ...prev, [k]: v.replace(/[^\x20-\x7E -￿]/g, "") }));
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files).slice(0, 3 - prev.length)]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    // In production you'd upload the images to Supabase Storage first and
    // collect their public URLs. Stubbed here — just pass empty array.
    const image_urls: string[] = [];

    try {
      const result = await apiPost<SuccessData>("/production/inquire", {
        description: form.description,
        brand_name:  form.brand_name,
        quantity:    form.quantity,
        budget:      form.budget,
        timeline:    form.timeline,
        notes:       form.notes,
        image_urls,
      });
      setSuccess(result);
      setStatus("success");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setSuccess(null);
    setErrorMsg("");
    setForm({ description: "", brand_name: "", quantity: "", budget: "", timeline: "", notes: "" });
    setImages([]);
    onClose();
  }

  if (!open) return null;
  if (!authChecked) return null; // briefly invisible while auth check runs

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Start a production request"
    >
      {/* Panel */}
      <div className="relative w-full sm:max-w-2xl max-h-[95dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Production</p>
            <h2 className="mt-0.5 font-display text-2xl tracking-tight">Tell us what you&apos;re making.</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
            aria-label="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-8 pt-6">

          {/* ── SUCCESS STATE ── */}
          {status === "success" && success && (
            <div className="flex flex-col items-start gap-5">
              <div className="flex items-center gap-3">
                <CheckCircle size={28} weight="fill" className="text-emerald-600" />
                <div>
                  <p className="font-medium">Request received!</p>
                  <p className="text-sm text-neutral-500">Order #{success.order_id.slice(0, 8)}</p>
                </div>
              </div>

              <p className="text-sm text-neutral-600">
                We&apos;ve routed your request and will reply within 24 hours with a quote.
              </p>

              {success.matched_capabilities.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Matched capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {success.matched_capabilities.map((c) => (
                      <span key={c} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        {CAPABILITY_LABELS[c] ?? c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(success.detected_colors.length > 0 || success.detected_quantity) && (
                <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                  {success.detected_quantity && (
                    <span>Quantity detected: <strong className="text-ink">{success.detected_quantity}</strong></span>
                  )}
                  {success.detected_colors.length > 0 && (
                    <span>Colors: <strong className="text-ink">{success.detected_colors.join(", ")}</strong></span>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-neutral-800"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => { reset(); router.push("/account/orders"); }}
                  className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-neutral-500"
                >
                  View order
                </button>
              </div>
            </div>
          )}

          {/* ── FORM ── */}
          {status !== "success" && (
            <form onSubmit={submit} className="flex flex-col gap-6">

              {/* Description — the most important field */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  What are you looking to make? <span className="text-neutral-400">*</span>
                </span>
                <textarea
                  ref={firstFieldRef}
                  required
                  rows={4}
                  placeholder="e.g. I want 24 hoodies, 800gsm, in red — relaxed fit with a small chest logo. OR: Can you make cowboy boots similar to the reference image?"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="rounded-lg border border-neutral-300 px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink resize-none"
                />
                <p className="text-xs text-neutral-400">
                  Describe the product in plain language — material, weight, colors, style, and any references.
                </p>
              </label>

              {/* 2-col row: brand + quantity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Brand name</span>
                  <input
                    type="text"
                    placeholder="Your brand"
                    value={form.brand_name}
                    onChange={(e) => set("brand_name", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Quantity</span>
                  <input
                    type="text"
                    placeholder="e.g. 200, 500 pieces"
                    value={form.quantity}
                    onChange={(e) => set("quantity", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </label>
              </div>

              {/* 2-col row: budget + timeline */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Budget per unit</span>
                  <input
                    type="text"
                    placeholder="e.g. $25, under $40"
                    value={form.budget}
                    onChange={(e) => set("budget", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Timeline</span>
                  <input
                    type="text"
                    placeholder="e.g. 6 months, Q3 2025"
                    value={form.timeline}
                    onChange={(e) => set("timeline", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </label>
              </div>

              {/* Reference images */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Reference images <span className="font-normal normal-case text-neutral-400">(optional, up to 3)</span>
                </span>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 transition-colors ${
                    images.length >= 3
                      ? "border-neutral-200 opacity-50 cursor-not-allowed"
                      : "border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  <UploadSimple size={18} className="flex-shrink-0 text-neutral-400" />
                  <span className="text-sm text-neutral-500">
                    {images.length === 0
                      ? "Click to upload reference images"
                      : `${images.length} image${images.length > 1 ? "s" : ""} selected${images.length < 3 ? " — add more?" : ""}`}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={images.length >= 3}
                    onChange={(e) => handleFiles(e.target.files)}
                    className="sr-only"
                  />
                </label>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {images.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                        {f.name.slice(0, 24)}{f.name.length > 24 ? "…" : ""}
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          className="text-neutral-400 hover:text-neutral-700"
                          aria-label="Remove image"
                        >
                          <X size={10} weight="bold" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Additional notes</span>
                <textarea
                  rows={3}
                  placeholder="Fabric weight, fit references, label requirements, certifications, any other details..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="rounded-lg border border-neutral-300 px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink resize-none"
                />
              </label>

              {/* Error */}
              {status === "error" && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg || "Something went wrong — please try again."}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === "loading" || !form.description.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-neutral-800 disabled:opacity-40"
                >
                  {status === "loading" ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send request
                      <ArrowRight size={14} weight="bold" aria-hidden />
                    </>
                  )}
                </button>
                <p className="text-xs text-neutral-400">We reply within 24 hours.</p>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

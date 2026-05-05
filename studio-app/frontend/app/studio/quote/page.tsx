"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const PRODUCT_TYPES = [
  "Tee",
  "Hoodie",
  "Crewneck sweatshirt",
  "Sweatpants",
  "Polo",
  "Button-up shirt",
  "Outerwear (jacket / coat)",
  "Denim",
  "Headwear (cap / beanie)",
  "Other",
];

const CAPABILITIES = [
  "cut_sew",
  "knitwear",
  "wovens",
  "denim",
  "outerwear",
  "activewear",
  "headwear",
  "accessories",
  "screen_print",
  "embroidery",
];

const human = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function StudioQuotePage() {
  const router = useRouter();

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    brand_name: "",
    contact_email: "",
    product_type: "Tee",
    quantity: "250",
    target_price: "",
    due_date: "",
    similar_brands: "",
    notes: "",
  });
  const [capabilities, setCapabilities] = useState<Set<string>>(
    new Set(["cut_sew", "knitwear"])
  );

  // ----- auth gate -----
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace("/sign-in?next=/studio/quote");
      } else {
        setSignedIn(true);
        setForm((f) => ({
          ...f,
          contact_email: f.contact_email || data.session?.user.email || "",
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        brand_name: form.brand_name,
        contact_email: form.contact_email || null,
        product_type: form.product_type,
        quantity: form.quantity ? Math.max(1, parseInt(form.quantity.replace(/[^0-9]/g, "") || "1", 10)) : 1,
        target_price: form.target_price ? parseFloat(form.target_price.replace(/[^0-9.]/g, "")) || null : null,
        due_date: form.due_date || null,
        capabilities: Array.from(capabilities),
        required_certifications: [],
        similar_brands: form.similar_brands
          ? form.similar_brands.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        notes: form.notes,
      };
      const res = await apiPost<{ order_id: string; status: string }>(
        "/studio/rfq",
        body
      );
      router.push(`/studio/quote/${res.order_id}/submitted`);
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  if (signedIn === null) {
    return (
      <main className="mx-auto max-w-3xl px-4 sm:px-0 py-12">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-0 py-12 md:py-16">
      <header className="mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Production
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Start a quote
        </h1>
        <p className="mt-3 text-neutral-700">
          Tell us about your project. Most teams hear back within 24 hours.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-8">
        {/* ---- brand ---- */}
        <Fieldset legend="About your brand">
          <Field label="Brand name" required>
            <input
              type="text"
              required
              value={form.brand_name}
              onChange={(e) => set("brand_name", e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="text"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
              placeholder="We'll use your account email if blank."
            />
          </Field>
        </Fieldset>

        {/* ---- product ---- */}
        <Fieldset legend="The product">
          <Field label="Product type" required>
            <select
              value={form.product_type}
              onChange={(e) => set("product_type", e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Quantity" required>
              <input
                type="text"
                required
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="e.g. 250"
                className="rounded-md border border-neutral-300 px-3 py-2"
              />
            </Field>
            <Field label="Target price / unit (USD)">
              <input
                type="text"
                value={form.target_price}
                onChange={(e) => set("target_price", e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. $25"
              />
            </Field>
            <Field label="Need by">
              <input
                type="text"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. Q3 2025, 6 months"
              />
            </Field>
          </div>
        </Fieldset>

        {/* ---- capabilities ---- */}
        <Fieldset legend="Capabilities needed">
          <p className="text-xs text-neutral-500">
            Select everything that applies. We&apos;ll match against partners
            who handle all of them.
          </p>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => {
              const on = capabilities.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapabilities((s) => toggle(s, c))}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    on
                      ? "border-ink bg-ink text-paper"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {human(c)}
                </button>
              );
            })}
          </div>
        </Fieldset>

        {/* ---- references ---- */}
        <Fieldset legend="References">
          <Field label="Similar brands (comma-separated)">
            <input
              type="text"
              value={form.similar_brands}
              onChange={(e) => set("similar_brands", e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
              placeholder="e.g. Aimé Leon Dore, Stüssy"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={5}
              className="rounded-md border border-neutral-300 px-3 py-2"
              placeholder="Anything else we should know — fabric weight, fit references, label requirements, etc."
            />
          </Field>
        </Fieldset>

        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper transition hover:bg-accent disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Send RFQ →"}
          </button>
          <p className="self-center text-xs text-neutral-500">
            We&apos;ll review and reply within 24 hours.
          </p>
        </div>
      </form>
    </main>
  );
}

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-display text-xl">{legend}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
        {required && <span className="ml-1 text-neutral-400">*</span>}
      </span>
      {children}
    </label>
  );
}

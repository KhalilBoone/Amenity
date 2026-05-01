"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/types";

type OrderWithSpec = Order & { spec: Record<string, unknown> };

const STATUS_TIMELINE: { id: OrderStatus; label: string; sub: string }[] = [
  { id: "intake",      label: "Intake",       sub: "We received your brief" },
  { id: "compliance",  label: "Compliance",   sub: "Spec checks complete" },
  { id: "routing",     label: "Routing",      sub: "Run assigned" },
  { id: "fulfillment", label: "Production",   sub: "PO opened, sampling" },
  { id: "qa",          label: "Quality",      sub: "Inspection in progress" },
  { id: "shipped",     label: "Shipped",      sub: "Out for delivery" },
  { id: "invoiced",    label: "Invoiced",     sub: "Invoice sent" },
  { id: "closed",      label: "Closed",       sub: "Run complete" },
];

export default function StudioOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [order, setOrder] = useState<OrderWithSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace(`/sign-in?next=/studio/quote/${id}`);
        return;
      }
      setSignedIn(true);
      apiGet<OrderWithSpec>(`/orders/${id}`)
        .then((o) => !cancelled && setOrder(o))
        .catch((e) => !cancelled && setError(String(e)));
    });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (signedIn === null || (!order && !error)) {
    return <Shell><p className="text-neutral-500">Loading…</p></Shell>;
  }
  if (error) {
    return <Shell><p className="text-red-700">{error}</p></Shell>;
  }
  if (!order) return null;

  const currentIdx = Math.max(
    0,
    STATUS_TIMELINE.findIndex((s) => s.id === order.status)
  );

  const spec = (order.spec ?? {}) as Record<string, unknown>;
  const capabilities = (spec.capabilities as string[] | undefined) ?? [];
  const similarBrands = (spec.similar_brands as string[] | undefined) ?? [];
  const notes = (spec.notes as string | undefined) ?? "";

  return (
    <Shell>
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/account/orders" className="hover:underline">
          Account
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">RFQ #{String(order.id).slice(0, 8)}</span>
      </nav>

      <header className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Studio · {order.product_type ?? "Custom run"}
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">
            RFQ #{String(order.id).slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Placed {new Date(order.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs uppercase tracking-wider text-neutral-700">
            {order.status}
          </span>
          {order.po_number && (
            <span className="text-xs text-neutral-500">PO {order.po_number}</span>
          )}
        </div>
      </header>

      {/* ---------- timeline ---------- */}
      <section className="mb-12 rounded-2xl border border-neutral-200 p-6">
        <h2 className="mb-6 font-display text-2xl">Progress</h2>
        <ol className="flex flex-col gap-0">
          {STATUS_TIMELINE.map((step, i) => {
            const reached = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <li key={step.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {i < STATUS_TIMELINE.length - 1 && (
                  <span
                    className={`absolute left-[11px] top-6 h-full w-px ${
                      reached ? "bg-ink" : "bg-neutral-200"
                    }`}
                    aria-hidden
                  />
                )}
                <span
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : reached
                      ? "border-ink bg-ink text-paper"
                      : "border-neutral-300 bg-paper"
                  }`}
                >
                  {reached && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12l5 5L20 6" />
                    </svg>
                  )}
                </span>
                <div className="flex-1">
                  <p className={`font-medium ${reached ? "" : "text-neutral-400"}`}>
                    {step.label}
                  </p>
                  <p className={`text-sm ${reached ? "text-neutral-600" : "text-neutral-400"}`}>
                    {step.sub}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---------- brief ---------- */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 p-6">
          <h2 className="mb-4 font-display text-2xl">Brief</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Product type">{order.product_type ?? "—"}</Row>
            <Row label="Quantity">{order.quantity?.toLocaleString() ?? "—"}</Row>
            <Row label="Target / unit">
              {order.target_price != null
                ? `$${Number(order.target_price).toFixed(2)}`
                : "—"}
            </Row>
            <Row label="Need by">{order.due_date ?? "—"}</Row>
          </dl>

          {capabilities.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
                Capabilities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {capabilities.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-neutral-100 px-2 py-1 text-xs"
                  >
                    {c.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {similarBrands.length > 0 && (
            <div className="mt-5">
              <p className="mb-1 text-xs uppercase tracking-wider text-neutral-500">
                Reference brands
              </p>
              <p className="text-sm">{similarBrands.join(", ")}</p>
            </div>
          )}

          {notes && (
            <div className="mt-5">
              <p className="mb-1 text-xs uppercase tracking-wider text-neutral-500">
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap text-neutral-700">{notes}</p>
            </div>
          )}
        </div>

        {/* ---------- summary side ---------- */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-neutral-200 p-6">
            <h2 className="mb-4 font-display text-2xl">Summary</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Status">
                <span className="capitalize">{order.status}</span>
              </Row>
              {order.po_number && (
                <Row label="PO number">{order.po_number}</Row>
              )}
              {order.routing_score != null && (
                <Row label="Match score">
                  {Number(order.routing_score).toFixed(1)} / 100
                </Row>
              )}
              {order.qa_passed != null && (
                <Row label="QA">
                  <span
                    className={
                      order.qa_passed ? "text-emerald-700" : "text-amber-800"
                    }
                  >
                    {order.qa_passed ? "Passed" : "In review"}
                  </span>
                </Row>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-6">
            <h2 className="mb-2 font-display text-xl">What happens next</h2>
            <p className="text-sm text-neutral-700">
              {nextStepCopy(order.status)}
            </p>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function nextStepCopy(status: OrderStatus): string {
  switch (status) {
    case "intake":
      return "Your brief is in our queue. A human reviews every RFQ — expect a reply within 24 hours.";
    case "compliance":
      return "We're confirming the spec lines up with any compliance requirements.";
    case "routing":
      return "We're matching your run to the right capacity. You'll see the PO number here once production starts.";
    case "fulfillment":
      return "Sampling and production are underway. We'll email when first samples are ready for review.";
    case "qa":
      return "Inspection is in progress. Each milestone gets photo QA before we ship.";
    case "shipped":
      return "Tracking will hit your inbox shortly.";
    case "invoiced":
      return "Your invoice has been sent. NET-30 terms apply.";
    case "closed":
      return "This run is complete. Want to start another? Submit a new RFQ.";
    case "cancelled":
      return "This run was cancelled. Reach out if that's not what you intended.";
    default:
      return "";
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12 md:py-16">{children}</main>
  );
}

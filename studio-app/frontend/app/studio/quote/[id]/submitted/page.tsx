"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/types";

export default function RfqSubmittedPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(() => {
      apiGet<Order>(`/orders/${id}`)
        .then((o) => !cancelled && setOrder(o))
        .catch((e) => !cancelled && setError(String(e)));
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-0 py-16">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Check />
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            RFQ received
          </p>
        </div>

        <h1 className="font-display text-4xl tracking-tight">
          We&apos;re on it.
        </h1>
        <p className="text-neutral-700">
          Your brief is in our queue. A human will review it, route it to the
          right partner, and reply with a quote within 24 hours.
        </p>

        {error && <p className="text-red-700">{error}</p>}

        {order && (
          <div className="rounded-2xl border border-neutral-200 p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <p className="font-display text-xl">
                RFQ #{String(order.id).slice(0, 8)}
              </p>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                {order.status}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Product type">{order.product_type ?? "—"}</Row>
              <Row label="Quantity">{order.quantity ?? "—"}</Row>
              <Row label="Target price">
                {order.target_price != null
                  ? `$${Number(order.target_price).toFixed(2)} / unit`
                  : "—"}
              </Row>
              <Row label="Need by">{order.due_date ?? "—"}</Row>
            </dl>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/account/orders"
            className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-accent"
          >
            View all orders
          </Link>
          <Link
            href="/studio/quote"
            className="rounded-md border border-ink px-5 py-3 text-sm font-medium hover:bg-neutral-100"
          >
            Submit another
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-700"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

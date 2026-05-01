"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/types";

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stripe sometimes redirects back before our webhook has flipped the
  // order status — poll a couple times so the UI doesn't show "intake"
  // forever.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function fetchOnce() {
      try {
        const o = await apiGet<Order>(`/orders/${id}`);
        if (cancelled) return;
        setOrder(o);
        if (o.status === "intake" && tries < 6) {
          tries += 1;
          setTimeout(fetchOnce, 1500);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    // Auth-gate: if the user opened the success URL in a fresh browser,
    // they may not have a session. apiGet attaches the Supabase JWT when
    // present; if not, we still try (their RLS will reject and we'll show
    // the error politely).
    supabase.auth.getSession().then(() => fetchOnce());

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <Shell><p className="text-red-700">{error}</p></Shell>;
  if (!order) return <Shell><p className="text-neutral-500">Loading your order…</p></Shell>;

  const totals = [
    { label: "Subtotal", value: order.subtotal },
    { label: "Shipping", value: order.shipping_cost },
    { label: "Tax", value: order.tax },
  ];

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Check />
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Order confirmed
          </p>
        </div>

        <h1 className="font-display text-4xl tracking-tight">
          Thanks — we&apos;re on it.
        </h1>
        <p className="text-neutral-700">
          We&apos;ve forwarded your order to our supplier and you&apos;ll get
          a tracking email as soon as it ships. Most blank orders move inside
          5–7 business days; customized orders take roughly two weeks.
        </p>

        <div className="rounded-2xl border border-neutral-200 p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-display text-xl">Order #{String(order.id).slice(0, 8)}</p>
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              {order.status}
            </p>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            {totals.map((t) =>
              t.value != null ? (
                <Row key={t.label} label={t.label}>
                  ${Number(t.value).toFixed(2)}
                </Row>
              ) : null
            )}
            {order.total != null && (
              <>
                <hr className="my-2 border-neutral-200" />
                <Row label="Total" emphasis>
                  ${Number(order.total).toFixed(2)} {order.currency}
                </Row>
              </>
            )}
          </dl>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/blanks"
            className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-accent"
          >
            Keep shopping →
          </Link>
          <Link
            href="/account/orders"
            className="rounded-md border border-ink px-5 py-3 text-sm font-medium hover:bg-neutral-100"
          >
            View all orders
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-0 py-16">
      {children}
    </main>
  );
}

function Row({
  label,
  children,
  emphasis,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between ${
        emphasis ? "text-base font-medium" : ""
      }`}
    >
      <dt className={emphasis ? "" : "text-neutral-500"}>{label}</dt>
      <dd>{children}</dd>
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

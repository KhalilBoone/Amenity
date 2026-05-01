"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, OrderType } from "@/types";

type Filter = "all" | OrderType;

const STATUS_CLASSES: Record<OrderStatus, string> = {
  intake:      "bg-neutral-100 text-neutral-700",
  compliance:  "bg-blue-50 text-blue-800",
  routing:     "bg-blue-50 text-blue-800",
  fulfillment: "bg-amber-50 text-amber-900",
  qa:          "bg-amber-50 text-amber-900",
  shipped:     "bg-emerald-50 text-emerald-800",
  invoiced:    "bg-emerald-50 text-emerald-800",
  closed:      "bg-emerald-50 text-emerald-800",
  cancelled:   "bg-neutral-100 text-neutral-500",
};

export default function AccountOrdersPage() {
  const router = useRouter();

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // ----- auth gate -----
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace("/sign-in?next=/account/orders");
      } else {
        setSignedIn(true);
        apiGet<{ orders: Order[] }>("/orders")
          .then((res) => !cancelled && setOrders(res.orders ?? []))
          .catch((e) => !cancelled && setError(String(e)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (filter === "all") return orders;
    return orders.filter((o) => o.order_type === filter);
  }, [orders, filter]);

  // ----- render -----
  if (signedIn === null || orders === null) {
    return (
      <Shell>
        {error ? (
          <p className="text-red-700">{error}</p>
        ) : (
          <p className="text-neutral-500">Loading…</p>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Account
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Orders</h1>
        </div>

        <div className="flex gap-2">
          {(["all", "studio", "blanks"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md border px-3 py-1.5 text-sm capitalize transition ${
                filter === f
                  ? "border-ink bg-ink text-paper"
                  : "border-neutral-300 hover:border-neutral-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-neutral-300 p-10">
          <p className="text-neutral-700">
            {orders.length === 0
              ? "You haven't placed any orders yet."
              : `No ${filter} orders.`}
          </p>
          <div className="flex gap-3">
            <Link
              href="/blanks"
              className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-accent"
            >
              Browse Blanks →
            </Link>
            <Link
              href="/studio/quote"
              className="rounded-md border border-ink px-5 py-3 text-sm font-medium hover:bg-neutral-100"
            >
              Start a Studio quote
            </Link>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {filtered.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {o.order_type}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wider ${
                      STATUS_CLASSES[o.status] ?? "bg-neutral-100"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 font-medium">
                  {o.order_type === "studio"
                    ? `${o.product_type ?? "Custom run"} · qty ${o.quantity ?? "—"}`
                    : `Order ${String(o.id).slice(0, 8)}`}
                </p>
                <p className="text-xs text-neutral-500">
                  Placed {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">
                    {o.total != null
                      ? `$${Number(o.total).toFixed(2)}`
                      : o.target_price != null
                      ? `Target $${Number(o.target_price).toFixed(2)}/unit`
                      : "—"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {o.currency}
                  </p>
                </div>
                <Link
                  href={
                    o.order_type === "studio"
                      ? `/studio/quote/${o.id}`
                      : `/orders/${o.id}/success`
                  }
                  className="text-sm underline-offset-4 hover:underline"
                >
                  View →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12 md:py-16">{children}</main>
  );
}

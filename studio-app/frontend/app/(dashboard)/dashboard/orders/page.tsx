"use client";

/**
 * /dashboard/orders — all orders for the signed-in user
 *
 * Pulls from GET /orders (auth-scoped via RLS).
 * Status badges, search, and date filter.
 * Click any row → /dashboard/orders/[id]
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlass,
  Package,
  ArrowRight,
  ClipboardText,
  FunnelSimple,
} from "@phosphor-icons/react";
import { apiGet } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_title: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
  items: OrderItem[];
  shipping_address: Record<string, string> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:  "bg-sky-50 text-sky-700 border-sky-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped:    "bg-violet-50 text-violet-700 border-violet-200",
  delivered:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:  "bg-neutral-100 text-neutral-500 border-neutral-200",
  refunded:   "bg-rose-50 text-rose-700 border-rose-200",
};

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUS_FILTERS = ["All", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
  }).format(amount / 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiGet<{ orders: Order[] }>("/orders")
      .then((r) => setOrders(r.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 250);
  }

  const filtered = orders.filter((o) => {
    if (statusFilter !== "All" && o.status !== statusFilter) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !(o.order_number ?? "").toLowerCase().includes(q) &&
        !o.items.some((i) => i.product_title.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">Orders</h1>
            <p className="text-xs text-neutral-500">All orders across all manufacturers</p>
          </div>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <MagnifyingGlass size={13} weight="regular" aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search orders…"
              className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-neutral-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <FunnelSimple size={13} className="text-neutral-400" aria-hidden />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? "border-neutral-800 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {s === "All" ? "All" : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-neutral-100 px-6 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <ClipboardText size={40} weight="thin" className="text-neutral-300" />
            <div>
              <p className="text-sm font-medium text-neutral-700">No orders yet</p>
              <p className="mt-1 text-xs text-neutral-400">
                {debouncedSearch || statusFilter !== "All"
                  ? "No orders match your search or filters."
                  : "Your orders will appear here once you place one."}
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400"
            >
              <Package size={13} weight="regular" aria-hidden />
              Shop blanks
            </Link>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Order</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:block">Items</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Date</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Status</span>
              <span className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Total</span>
            </div>

            {filtered.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-neutral-100 bg-white px-6 py-4 transition-colors hover:bg-neutral-50"
              >
                {/* Order # */}
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {order.order_number ? `#${order.order_number}` : order.id.slice(0, 8).toUpperCase()}
                  </p>
                  {order.items.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-neutral-400 max-w-[200px]">
                      {order.items[0].product_title}
                      {order.items.length > 1 && ` +${order.items.length - 1} more`}
                    </p>
                  )}
                </div>

                {/* Item count */}
                <span className="hidden text-sm text-neutral-500 sm:block">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </span>

                {/* Date */}
                <span className="text-sm text-neutral-500">{formatDate(order.created_at)}</span>

                {/* Status */}
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
                  {statusLabel(order.status)}
                </span>

                {/* Total */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(order.total_amount, order.currency)}
                  </span>
                  <ArrowRight size={13} weight="bold" className="text-neutral-300 transition-colors group-hover:text-neutral-600" aria-hidden />
                </div>
              </Link>
            ))}

            <p className="px-6 py-3 text-xs text-neutral-400">
              {filtered.length} order{filtered.length !== 1 ? "s" : ""}
              {statusFilter !== "All" && ` · ${statusLabel(statusFilter)}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

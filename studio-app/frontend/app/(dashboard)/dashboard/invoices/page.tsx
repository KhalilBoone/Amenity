"use client";

/**
 * /dashboard/invoices — all invoices for the signed-in user
 *
 * Derived from orders that have been fulfilled / have Stripe payment intents.
 * Shows outstanding vs paid invoices, amounts, due dates, and pay actions.
 *
 * Note: For now this derives invoice data from GET /orders.
 * When a dedicated /invoices endpoint exists this page can point there instead.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Receipt,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Warning,
  DownloadSimple,
  FunnelSimple,
} from "@phosphor-icons/react";
import { apiGet } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
  stripe_payment_intent_id?: string | null;
  items: { product_title: string }[];
}

// A lightweight "invoice" we synthesize from each order
interface Invoice {
  orderId: string;
  orderLabel: string;
  items: string;
  amount: number | null;
  currency: string | null;
  issuedAt: string;
  paymentStatus: "paid" | "outstanding" | "overdue";
  stripeId: string | null;
  orderStatus: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function derivePaymentStatus(order: Order): Invoice["paymentStatus"] {
  if (["delivered", "refunded"].includes(order.status)) return "paid";
  if (order.status === "cancelled") return "paid"; // no balance due
  // Consider overdue if placed > 30 days ago and not yet paid
  const ageMs = Date.now() - new Date(order.created_at).getTime();
  if (ageMs > 30 * 24 * 60 * 60 * 1000) return "overdue";
  return "outstanding";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount / 100);
}

const PAYMENT_STATUS_STYLES = {
  paid:        { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle, iconClass: "text-emerald-500" },
  outstanding: { badge: "bg-amber-50 text-amber-700 border-amber-200",       Icon: Clock,        iconClass: "text-amber-400"   },
  overdue:     { badge: "bg-rose-50 text-rose-700 border-rose-200",          Icon: Warning,      iconClass: "text-rose-500"    },
};

const FILTER_OPTIONS = ["All", "outstanding", "overdue", "paid"] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterOption>("All");

  useEffect(() => {
    apiGet<{ orders: Order[] }>("/orders")
      .then(({ orders }) => {
        const inv: Invoice[] = (orders ?? []).map((o) => ({
          orderId:       o.id,
          orderLabel:    o.order_number ? `#${o.order_number}` : `#${o.id.slice(0, 8).toUpperCase()}`,
          items:         o.items.map((i) => i.product_title).join(", ") || "Order",
          amount:        o.total_amount,
          currency:      o.currency,
          issuedAt:      o.created_at,
          paymentStatus: derivePaymentStatus(o),
          stripeId:      o.stripe_payment_intent_id ?? null,
          orderStatus:   o.status,
        }));
        // Sort: overdue first, then outstanding, then paid
        inv.sort((a, b) => {
          const rank = { overdue: 0, outstanding: 1, paid: 2 };
          return rank[a.paymentStatus] - rank[b.paymentStatus];
        });
        setInvoices(inv);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "All" ? invoices : invoices.filter((i) => i.paymentStatus === filter);

  const totalOutstanding = invoices
    .filter((i) => i.paymentStatus !== "paid")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const currency = invoices[0]?.currency ?? "USD";

  return (
    <div className="flex h-full flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">Invoices</h1>
            <p className="text-xs text-neutral-500">View and pay your outstanding balances</p>
          </div>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            label="Outstanding"
            value={formatCurrency(totalOutstanding, currency)}
            sub={`${invoices.filter((i) => i.paymentStatus === "outstanding").length} invoice${invoices.filter((i) => i.paymentStatus === "outstanding").length !== 1 ? "s" : ""}`}
            accent="text-amber-600"
          />
          <SummaryCard
            label="Overdue"
            value={formatCurrency(
              invoices.filter((i) => i.paymentStatus === "overdue").reduce((s, i) => s + (i.amount ?? 0), 0),
              currency,
            )}
            sub={`${invoices.filter((i) => i.paymentStatus === "overdue").length} invoice${invoices.filter((i) => i.paymentStatus === "overdue").length !== 1 ? "s" : ""}`}
            accent="text-rose-600"
          />
          <SummaryCard
            label="Paid"
            value={formatCurrency(
              invoices.filter((i) => i.paymentStatus === "paid").reduce((s, i) => s + (i.amount ?? 0), 0),
              currency,
            )}
            sub={`${invoices.filter((i) => i.paymentStatus === "paid").length} invoice${invoices.filter((i) => i.paymentStatus === "paid").length !== 1 ? "s" : ""}`}
            accent="text-emerald-600"
          />
        </div>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center gap-1.5">
          <FunnelSimple size={13} className="text-neutral-400" aria-hidden />
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === f
                  ? "border-neutral-800 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-neutral-100 px-6 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <Receipt size={40} weight="thin" className="text-neutral-300" />
            <div>
              <p className="text-sm font-medium text-neutral-700">No invoices</p>
              <p className="mt-1 text-xs text-neutral-400">
                {filter !== "All" ? "No invoices match this filter." : "Invoices from your orders will appear here."}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Invoice</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:block">Issued</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Status</span>
              <span className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Amount</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400" />
            </div>

            {filtered.map((inv) => {
              const cfg = PAYMENT_STATUS_STYLES[inv.paymentStatus];
              return (
                <div
                  key={inv.orderId}
                  className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-neutral-100 bg-white px-6 py-4 transition-colors hover:bg-neutral-50"
                >
                  {/* Invoice / order label */}
                  <div>
                    <Link
                      href={`/dashboard/orders/${inv.orderId}`}
                      className="text-sm font-semibold text-neutral-900 hover:text-ink"
                    >
                      {inv.orderLabel}
                    </Link>
                    <p className="mt-0.5 max-w-[240px] truncate text-xs text-neutral-400">{inv.items}</p>
                  </div>

                  {/* Issue date */}
                  <span className="hidden text-sm text-neutral-500 sm:block">{formatDate(inv.issuedAt)}</span>

                  {/* Status */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.badge}`}>
                    <cfg.Icon size={10} weight="fill" aria-hidden />
                    {inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}
                  </span>

                  {/* Amount */}
                  <span className="text-sm font-semibold tabular-nums text-neutral-900">
                    {formatCurrency(inv.amount, inv.currency)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Download invoice"
                      className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      <DownloadSimple size={14} weight="regular" aria-hidden />
                    </button>
                    {inv.paymentStatus !== "paid" && (
                      <Link
                        href={`/dashboard/orders/${inv.orderId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-paper transition-all hover:bg-neutral-800"
                      >
                        Pay
                        <ArrowRight size={10} weight="bold" aria-hidden />
                      </Link>
                    )}
                    {inv.paymentStatus === "paid" && (
                      <Link
                        href={`/dashboard/orders/${inv.orderId}`}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-400 transition-colors hover:text-neutral-700"
                      >
                        View
                        <ArrowSquareOut size={11} weight="regular" aria-hidden />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            <p className="px-6 py-3 text-xs text-neutral-400">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary card
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
    </div>
  );
}

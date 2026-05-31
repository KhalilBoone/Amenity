"use client";

/**
 * /dashboard/orders/[id] — order detail view
 *
 * Shows full order metadata, line items, shipping address,
 * status timeline / change log, and document download actions.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  MapPin,
  CheckCircle,
  Circle,
  Clock,
  Truck,
  Receipt,
  DownloadSimple,
  Storefront,
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
  customization?: {
    placement?: string;
    technique?: string;
    setup_fee?: number;
    unit_cost?: number;
  } | null;
}

interface OrderEvent {
  status: string;
  note: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  subtotal: number | null;
  shipping_total: number | null;
  tax_total: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
  items: OrderItem[];
  events?: OrderEvent[];
  shipping_address: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
  stripe_payment_intent_id?: string | null;
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

// Ordered timeline steps for the progress tracker
const TIMELINE_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency ?? "USD",
  }).format(amount / 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder]     = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<Order>(`/orders/${id}`)
      .then((o) => setOrder(o))
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-100 mb-8" />
        <div className="grid gap-5 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <Package size={40} weight="thin" className="text-neutral-300" />
        <p className="text-sm font-medium text-neutral-700">Order not found</p>
        <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-ink">
          <ArrowLeft size={12} weight="bold" aria-hidden />
          Back to orders
        </Link>
      </div>
    );
  }

  const orderLabel = order.order_number
    ? `#${order.order_number}`
    : `#${order.id.slice(0, 8).toUpperCase()}`;

  const currentStepIdx = TIMELINE_STEPS.indexOf(order.status);
  const isCancelledOrRefunded = ["cancelled", "refunded"].includes(order.status);

  return (
    <div className="flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-800"
            >
              <ArrowLeft size={12} weight="bold" aria-hidden />
              Orders
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-medium text-neutral-700">{orderLabel}</span>
          </div>

          {/* Download actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400"
            >
              <DownloadSimple size={12} weight="regular" aria-hidden />
              Invoice
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400"
            >
              <DownloadSimple size={12} weight="regular" aria-hidden />
              Packing slip
            </button>
          </div>
        </div>
      </div>

      {/* ── Order header ────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{orderLabel}</h1>
            <p className="mt-1 text-xs text-neutral-500">Placed {formatDate(order.created_at)}</p>
          </div>
          <span className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-medium sm:self-auto ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
            {statusLabel(order.status)}
          </span>
        </div>

        {/* Status progress tracker */}
        {!isCancelledOrRefunded && (
          <div className="mt-5 flex items-center gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done    = i <= currentStepIdx;
              const current = i === currentStepIdx;
              const last    = i === TIMELINE_STEPS.length - 1;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    {done ? (
                      <CheckCircle
                        size={18}
                        weight="fill"
                        className={current ? "text-neutral-900" : "text-emerald-500"}
                        aria-hidden
                      />
                    ) : (
                      <Circle size={18} weight="regular" className="text-neutral-300" aria-hidden />
                    )}
                    <span className={`text-[10px] font-medium whitespace-nowrap ${done ? "text-neutral-700" : "text-neutral-400"}`}>
                      {statusLabel(step)}
                    </span>
                  </div>
                  {!last && (
                    <div className={`mb-4 flex-1 h-px mx-1 ${i < currentStepIdx ? "bg-emerald-300" : "bg-neutral-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCancelledOrRefunded && (
          <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
            This order was {order.status}.
            {order.updated_at && ` Last updated ${formatDate(order.updated_at)}.`}
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Left 2/3 ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:col-span-2">

            {/* Line items */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="border-b border-neutral-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Items</p>
              </div>
              <div className="divide-y divide-neutral-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                        <Storefront size={16} weight="regular" className="text-neutral-400" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{item.product_title}</p>
                        {item.variant_title && (
                          <p className="text-xs text-neutral-400">{item.variant_title}</p>
                        )}
                        {item.customization?.technique && (
                          <p className="mt-0.5 text-[11px] text-neutral-400">
                            {item.customization.technique.replace(/_/g, " ")}
                            {item.customization.placement && ` · ${item.customization.placement}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatCurrency(item.unit_price * item.quantity, order.currency)}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {item.quantity} × {formatCurrency(item.unit_price, order.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4">
                <dl className="flex flex-col gap-2">
                  {order.subtotal != null && (
                    <div className="flex justify-between text-sm text-neutral-600">
                      <dt>Subtotal</dt>
                      <dd>{formatCurrency(order.subtotal, order.currency)}</dd>
                    </div>
                  )}
                  {order.shipping_total != null && (
                    <div className="flex justify-between text-sm text-neutral-600">
                      <dt>Shipping</dt>
                      <dd>{formatCurrency(order.shipping_total, order.currency)}</dd>
                    </div>
                  )}
                  {order.tax_total != null && (
                    <div className="flex justify-between text-sm text-neutral-600">
                      <dt>Tax</dt>
                      <dd>{formatCurrency(order.tax_total, order.currency)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-900">
                    <dt>Total</dt>
                    <dd>{formatCurrency(order.total_amount, order.currency)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Change log */}
            {(order.events ?? []).length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="border-b border-neutral-100 px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Activity</p>
                </div>
                <div className="divide-y divide-neutral-100">
                  {(order.events ?? []).map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                      <Clock size={14} weight="regular" className="mt-0.5 flex-shrink-0 text-neutral-400" aria-hidden />
                      <div>
                        <p className="text-sm text-neutral-700">
                          Status changed to <span className="font-medium">{statusLabel(ev.status)}</span>
                        </p>
                        {ev.note && <p className="mt-0.5 text-xs text-neutral-400">{ev.note}</p>}
                        <p className="mt-0.5 text-[11px] text-neutral-400">{formatDateTime(ev.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right 1/3 ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Shipping address */}
            {order.shipping_address && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Truck size={14} weight="regular" className="text-neutral-400" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Ship to</p>
                </div>
                <div className="text-sm text-neutral-700 leading-relaxed">
                  {order.shipping_address.name && <p className="font-medium">{order.shipping_address.name}</p>}
                  {order.shipping_address.line1 && <p>{order.shipping_address.line1}</p>}
                  {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                  {(order.shipping_address.city || order.shipping_address.state) && (
                    <p>
                      {[
                        order.shipping_address.city,
                        order.shipping_address.state,
                        order.shipping_address.postal_code,
                      ].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {order.shipping_address.country && <p>{order.shipping_address.country}</p>}
                </div>
              </div>
            )}

            {/* Payment summary */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Receipt size={14} weight="regular" className="text-neutral-400" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Payment</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Amount</span>
                  <span className="font-semibold text-neutral-900">
                    {formatCurrency(order.total_amount, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Status</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    order.status === "delivered"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : order.status === "cancelled" || order.status === "refunded"
                      ? "border-neutral-200 bg-neutral-100 text-neutral-500"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}>
                    {order.status === "delivered" ? "Paid"
                      : order.status === "cancelled" ? "Cancelled"
                      : order.status === "refunded" ? "Refunded"
                      : "Pending"}
                  </span>
                </div>
                {order.stripe_payment_intent_id && (
                  <p className="mt-1 text-[10px] text-neutral-400 font-mono break-all">
                    {order.stripe_payment_intent_id}
                  </p>
                )}
              </div>
            </div>

            {/* Order meta */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Details</p>
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Order ID</dt>
                  <dd className="font-mono text-[11px] text-neutral-600">{order.id.slice(0, 8).toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Placed</dt>
                  <dd className="text-neutral-700">{formatDate(order.created_at)}</dd>
                </div>
                {order.updated_at && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Updated</dt>
                    <dd className="text-neutral-700">{formatDate(order.updated_at)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Download docs */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Documents</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Invoice", icon: Receipt },
                  { label: "Packing slip", icon: Package },
                  { label: "Shipping manifest", icon: Truck },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={13} weight="regular" className="text-neutral-400" aria-hidden />
                      {label}
                    </span>
                    <DownloadSimple size={12} weight="regular" className="text-neutral-400" aria-hidden />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

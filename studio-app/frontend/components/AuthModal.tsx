"use client";

/**
 * Combined Sign In / Sign Up / Account modal.
 *
 * States:
 *   loading  — checking session on open
 *   guest    — not signed in; shows Google OAuth button
 *   user     — signed in; full account panel with tabs:
 *                Orders | Updates | Settings
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X,
  ArrowRight,
  Clipboard,
  SignOut,
  Bell,
  GearSix,
  Package,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

type State = "loading" | "guest" | "user";
type Tab = "orders" | "updates" | "settings";

interface UserInfo {
  email?: string;
  name?: string;
}

interface Order {
  id: string;
  order_type: string;
  status: string;
  product_type?: string;
  quantity?: number;
  total?: number;
  target_price?: number;
  currency?: string;
  created_at: string;
}

const STATUS_CLASSES: Record<string, string> = {
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

export default function AuthModal({ open, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<State>("loading");
  const [user, setUser] = useState<UserInfo>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  /* ── Session check whenever modal opens ──────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    setState("loading");
    setError(null);
    setOrders(null);
    setTab("orders");

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const u = data.session.user;
        setUser({
          email: u.email,
          name:  u.user_metadata?.full_name ?? u.user_metadata?.name,
        });
        setState("user");
        fetchOrders();
      } else {
        setState("guest");
      }
    });

    // Watch for auth changes while modal is open (e.g. another tab signs in)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!open) return;
      if (session) {
        const u = session.user;
        setUser({
          email: u.email,
          name:  u.user_metadata?.full_name ?? u.user_metadata?.name,
        });
        setState("user");
        fetchOrders();
      } else {
        setState("guest");
        setOrders(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [open]);

  async function fetchOrders() {
    setOrdersLoading(true);
    try {
      const res = await apiGet<{ orders: Order[] }>("/orders");
      setOrders(res.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  /* ── Keyboard + scroll lock ─────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  /* ── Google OAuth ───────────────────────────────────────────────────────── */
  async function startGoogle() {
    setBusy(true);
    setError(null);
    try {
      const next =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      const redirect =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
          : undefined;

      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect },
      });
      if (err) throw err;
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  /* ── Sign out ───────────────────────────────────────────────────────────── */
  async function handleSignOut() {
    await supabase.auth.signOut();
    onClose();
  }

  if (!open) return null;

  const initials = user.name
    ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Account"
    >
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5 flex-shrink-0">
          <p className="font-display text-xl tracking-tight">
            {state === "user" ? "Account" : "Sign in or create an account"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
            aria-label="Close"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-6">

            {/* ── Loading ──────────────────────────────────────────────── */}
            {state === "loading" && (
              <div className="flex justify-center py-8">
                <svg className="animate-spin text-neutral-300" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
            )}

            {/* ── Guest ────────────────────────────────────────────────── */}
            {state === "guest" && (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Use the same account you already have. Sign in and sign up are the same step.
                </p>

                <button
                  type="button"
                  onClick={startGoogle}
                  disabled={busy}
                  className="group flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50 hover:shadow-sm active:scale-[0.99] disabled:opacity-40"
                >
                  <GoogleIcon />
                  {busy ? "Redirecting…" : "Continue with Google"}
                </button>

                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <p className="text-xs text-neutral-400">
                  By continuing you agree to Amenity&apos;s{" "}
                  <span className="underline underline-offset-2 cursor-pointer hover:text-ink">Terms of Service</span>
                  {" "}and{" "}
                  <span className="underline underline-offset-2 cursor-pointer hover:text-ink">Privacy Policy</span>.
                </p>
              </div>
            )}

            {/* ── Signed in ────────────────────────────────────────────── */}
            {state === "user" && (
              <div className="flex flex-col gap-5">

                {/* Avatar + identity */}
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    {user.name && (
                      <p className="truncate text-sm font-medium">{user.name}</p>
                    )}
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex rounded-lg bg-neutral-100 p-1 gap-1">
                  {(
                    [
                      { id: "orders"   as Tab, label: "Orders",   icon: <Clipboard size={13} aria-hidden /> },
                      { id: "updates"  as Tab, label: "Updates",   icon: <Bell      size={13} aria-hidden /> },
                      { id: "settings" as Tab, label: "Settings",  icon: <GearSix   size={13} aria-hidden /> },
                    ] as const
                  ).map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 ${
                        tab === id
                          ? "bg-white shadow-sm text-ink"
                          : "text-neutral-500 hover:text-neutral-700"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Orders tab ──────────────────────────────────────── */}
                {tab === "orders" && (
                  <div className="flex flex-col gap-3">
                    {ordersLoading ? (
                      <div className="flex justify-center py-8">
                        <svg className="animate-spin text-neutral-300" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                      </div>
                    ) : orders && orders.length > 0 ? (
                      <>
                        <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 overflow-hidden">
                          {orders.map((o) => (
                            <div
                              key={o.id}
                              className="flex items-center justify-between gap-3 px-4 py-3.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs uppercase tracking-wider text-neutral-400 font-medium">
                                    {o.order_type}
                                  </p>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${
                                      STATUS_CLASSES[o.status] ?? "bg-neutral-100 text-neutral-600"
                                    }`}
                                  >
                                    {o.status}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-sm font-medium truncate">
                                  {o.order_type === "studio"
                                    ? `${o.product_type ?? "Custom run"} · qty ${o.quantity ?? "—"}`
                                    : `Order ${String(o.id).slice(0, 8)}`}
                                </p>
                                <p className="text-xs text-neutral-400">
                                  {new Date(o.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-medium">
                                  {o.total != null
                                    ? `$${Number(o.total).toFixed(2)}`
                                    : o.target_price != null
                                    ? `~$${Number(o.target_price).toFixed(2)}/u`
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Link
                          href="/account/orders"
                          onClick={onClose}
                          className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-ink"
                        >
                          View all orders
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 transition-all duration-200 group-hover:bg-ink group-hover:border-ink group-hover:text-paper">
                            <ArrowRight size={9} weight="bold" aria-hidden />
                          </span>
                        </Link>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
                        <Package size={32} className="text-neutral-300" />
                        <div>
                          <p className="text-sm font-medium text-neutral-700">No orders yet</p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Start production or browse wholesale
                          </p>
                        </div>
                        <Link
                          href="/blanks"
                          onClick={onClose}
                          className="mt-1 rounded-md bg-ink px-4 py-2 text-xs font-medium text-paper transition-colors hover:bg-neutral-800"
                        >
                          Browse Wholesale
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Updates tab ─────────────────────────────────────── */}
                {tab === "updates" && (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
                    <Bell size={32} className="text-neutral-300" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">You&apos;re all caught up</p>
                      <p className="text-xs text-neutral-400 mt-0.5 max-w-[200px] mx-auto leading-relaxed">
                        Order updates and notifications will appear here
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Settings tab ────────────────────────────────────── */}
                {tab === "settings" && (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-neutral-200 overflow-hidden">
                      <div className="px-4 py-3.5 border-b border-neutral-100">
                        <p className="text-xs text-neutral-400 mb-0.5">Name</p>
                        <p className="text-sm font-medium">{user.name ?? "—"}</p>
                      </div>
                      <div className="px-4 py-3.5">
                        <p className="text-xs text-neutral-400 mb-0.5">Email</p>
                        <p className="text-sm font-medium">{user.email}</p>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Profile details are managed through your Google account.
                    </p>

                    <hr className="border-neutral-100" />

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-ink"
                    >
                      <SignOut size={16} aria-hidden />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Google brand mark ──────────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

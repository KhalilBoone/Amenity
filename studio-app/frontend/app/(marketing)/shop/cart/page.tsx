"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  getLocalCart, removeFromLocalCart, updateLocalCartQty,
  localCartSubtotal, type LocalCartItem,
} from "@/lib/localCart";
import type { HydratedCart, ShippingAddress } from "@/types";

const LABELS: Record<string, string> = {
  front_chest: "Front chest",
  front_full: "Front (full)",
  back_full: "Back (full)",
  back_yoke: "Back yoke",
  left_sleeve: "Left sleeve",
  right_sleeve: "Right sleeve",
  neck_label: "Neck label",
  hood: "Hood",
  screen_print: "Screen print",
  embroidery: "Embroidery",
  dtg: "DTG",
};
const human = (k: string | undefined) => (k ? LABELS[k] ?? k : "");

export default function CartPage() {
  const router = useRouter();

  const [signedIn,        setSignedIn]        = useState<boolean | null>(null);
  const [cart,            setCart]            = useState<HydratedCart | null>(null);
  // Local cart is used when the API is unavailable or user is not signed in
  const [localItems,      setLocalItems]      = useState<LocalCartItem[]>([]);
  const [useLocal,        setUseLocal]        = useState(false);
  const [addresses,       setAddresses]       = useState<ShippingAddress[]>([]);
  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [submitting,      setSubmitting]      = useState(false);

  // ----- init: try API, fall back to local cart -----
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const ok = !!data.session;
      setSignedIn(ok);
      if (ok) {
        // Signed in — try the API
        try {
          const [c, a] = await Promise.all([
            apiGet<HydratedCart>("/cart"),
            apiGet<{ addresses: ShippingAddress[] }>("/addresses"),
          ]);
          setCart(c);
          setAddresses(a.addresses ?? []);
          const dflt = a.addresses?.find((x) => x.is_default) ?? a.addresses?.[0];
          if (dflt) setPickedAddressId(dflt.id);
          else setShowAddressForm(true);
        } catch {
          // API down — fall through to local cart
          setUseLocal(true);
          setLocalItems(getLocalCart());
        }
      } else {
        // Not signed in — show local cart without redirecting
        setUseLocal(true);
        setLocalItems(getLocalCart());
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  async function setQuantity(itemId: string, q: number) {
    if (useLocal) {
      updateLocalCartQty(itemId, q);
      setLocalItems(getLocalCart());
    } else {
      try {
        const c = await apiPatch<HydratedCart>(`/cart/items/${itemId}`, { quantity: q });
        setCart(c);
      } catch (e) { setError(String(e)); }
    }
  }

  async function removeItem(itemId: string) {
    if (useLocal) {
      removeFromLocalCart(itemId);
      setLocalItems(getLocalCart());
    } else {
      try {
        const c = await apiDelete<HydratedCart>(`/cart/items/${itemId}`);
        setCart(c);
      } catch (e) { setError(String(e)); }
    }
  }

  async function checkout() {
    if (useLocal) {
      // Direct to sign-in so they can create an account before placing the order
      router.push("/sign-in?next=/shop/cart");
      return;
    }
    if (!pickedAddressId) { setError("Please add or select a shipping address."); return; }
    setSubmitting(true); setError(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await apiPost<{ order_id: string; checkout_url: string }>("/checkout", {
        shipping_address_id: pickedAddressId,
        success_url: `${origin}/orders/{ORDER_ID}/success`,
        cancel_url: `${origin}/shop/cart`,
      });
      window.location.href = res.checkout_url;
    } catch (e) { setError(String(e)); setSubmitting(false); }
  }

  // ----- render -----
  if (signedIn === null) return <Loading />;

  // Local cart mode
  if (useLocal) {
    const empty = localItems.length === 0;
    const subtotal = localCartSubtotal();
    return (
      <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
        <h1 className="mb-2 font-display text-4xl tracking-tight">Your cart</h1>
        {!signedIn && (
          <p className="mb-8 text-sm text-neutral-500">
            <Link href="/sign-in?next=/shop/cart" className="underline underline-offset-4">Sign in</Link> to save your cart and check out.
          </p>
        )}
        {empty ? (
          <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-neutral-300 p-10">
            <p className="text-neutral-700">Your cart is empty.</p>
            <Link href="/shop/blanks" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-accent">
              Browse Blanks →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_360px]">
            <ul className="flex flex-col divide-y divide-neutral-200">
              {localItems.map((item) => (
                <li key={item.id} className="flex flex-col gap-4 py-6 md:flex-row md:items-start">
                  <div className="aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                    {item.hero_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.hero_image_url} alt={item.name} className="h-full w-full object-cover"/>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-xs uppercase tracking-wider text-neutral-500">{item.brand}</p>
                    <Link href={`/shop/blanks/${item.slug}`} className="font-medium hover:underline">{item.name}</Link>
                    <p className="text-sm text-neutral-600">
                      {item.size && `Size ${item.size}`}{item.size && item.color && " · "}{item.color}
                    </p>
                    {item.customization && (
                      <div className="mt-2 inline-flex flex-col gap-0.5 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
                        <span><strong>Customized.</strong> {human(item.customization.technique)} on {human(item.customization.placement)}</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-xs uppercase tracking-wider text-neutral-500">Qty</label>
                      <input type="text" inputMode="numeric" value={item.quantity}
                        onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, "") || "1", 10); setQuantity(item.id, Math.max(1, n)); }}
                        className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"/>
                      <button type="button" onClick={() => removeItem(item.id)}
                        className="text-xs text-neutral-500 underline-offset-4 hover:underline">Remove</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.unit_price * item.quantity).toFixed(2)}</p>
                    <p className="text-xs text-neutral-500">${item.unit_price.toFixed(2)} ea</p>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="self-start md:sticky md:top-24">
              <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-6">
                <h2 className="font-display text-xl">Order summary</h2>
                <Row label="Subtotal">${subtotal.toFixed(2)}</Row>
                <Row label="Shipping" muted>Calculated at checkout</Row>
                <Row label="Tax" muted>Calculated at checkout</Row>
                <hr className="border-neutral-200"/>
                <button type="button" onClick={checkout}
                  className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper transition hover:bg-accent">
                  {signedIn ? "Proceed to checkout →" : "Sign in to checkout →"}
                </button>
                {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              </div>
            </aside>
          </div>
        )}
      </main>
    );
  }

  if (!cart) return <Loading />;
  const items = cart.items ?? [];
  const empty = items.length === 0;

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
      <h1 className="mb-8 font-display text-4xl tracking-tight">Your cart</h1>

      {empty ? (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-neutral-300 p-10">
          <p className="text-neutral-700">Your cart is empty.</p>
          <Link
            href="/shop/blanks"
            className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-accent"
          >
            Browse Blanks →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_360px]">
          {/* ---------- line items ---------- */}
          <ul className="flex flex-col divide-y divide-neutral-200">
            {items.map((line) => {
              type Joined = typeof line & {
                product_variants?: {
                  sku: string;
                  size: string | null;
                  color: string | null;
                  hero_image_url: string | null;
                  products?: {
                    name: string;
                    slug: string;
                    hero_image_url: string | null;
                    brand: string;
                  };
                };
              };
              const j = line as Joined;
              const v = j.product_variants;
              const p = v?.products;
              const lineTotal = Number(line.unit_price) * Number(line.quantity);
              const cz = line.customization;

              return (
                <li
                  key={line.id}
                  className="flex flex-col gap-4 py-6 md:flex-row md:items-start"
                >
                  <div className="aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                    {(v?.hero_image_url || p?.hero_image_url) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v?.hero_image_url ?? p?.hero_image_url ?? ""}
                        alt={p?.name ?? "Variant"}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-xs uppercase tracking-wider text-neutral-500">
                      {p?.brand}
                    </p>
                    {p?.slug ? (
                      <Link
                        href={`/shop/blanks/${p.slug}`}
                        className="font-medium hover:underline"
                      >
                        {p?.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{p?.name}</p>
                    )}
                    <p className="text-sm text-neutral-600">
                      {v?.size && `Size ${v.size}`}
                      {v?.size && v?.color && " · "}
                      {v?.color}
                    </p>

                    {cz && (
                      <div className="mt-2 inline-flex flex-col gap-0.5 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
                        <span>
                          <strong>Customized.</strong> {human(cz.technique)} on{" "}
                          {human(cz.placement)}
                          {cz.colors ? ` · ${cz.colors} color${cz.colors > 1 ? "s" : ""}` : ""}
                        </span>
                        <span className="text-neutral-500">
                          Setup ${Number(cz.setup_fee).toFixed(2)} · Decoration $
                          {Number(cz.unit_cost).toFixed(2)}/unit
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-xs uppercase tracking-wider text-neutral-500">
                        Qty
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, "") || "1", 10);
                          setQuantity(line.id, Math.max(1, n));
                        }}
                        className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(line.id)}
                        className="text-xs text-neutral-500 underline-offset-4 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">${lineTotal.toFixed(2)}</p>
                    <p className="text-xs text-neutral-500">
                      ${Number(line.unit_price).toFixed(2)} ea
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ---------- summary + checkout ---------- */}
          <aside className="self-start md:sticky md:top-24">
            <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-6">
              <h2 className="font-display text-xl">Order summary</h2>

              <Row label="Subtotal">${cart.subtotal.toFixed(2)}</Row>
              <Row label="Shipping" muted>
                Calculated next
              </Row>
              <Row label="Tax" muted>
                Calculated next
              </Row>
              <hr className="border-neutral-200" />

              <AddressBlock
                addresses={addresses}
                pickedId={pickedAddressId}
                onPick={setPickedAddressId}
                showForm={showAddressForm}
                onShowForm={() => setShowAddressForm(true)}
                onCreated={(a) => {
                  setAddresses((prev) => [a, ...prev]);
                  setPickedAddressId(a.id);
                  setShowAddressForm(false);
                }}
                onError={setError}
              />

              <button
                type="button"
                onClick={checkout}
                disabled={submitting || !pickedAddressId}
                className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper transition hover:bg-accent disabled:opacity-40"
              >
                {submitting ? "Redirecting…" : "Proceed to checkout →"}
              </button>

              {error && (
                <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Address block — picker + inline create form
// ---------------------------------------------------------------------------
function AddressBlock({
  addresses,
  pickedId,
  onPick,
  showForm,
  onShowForm,
  onCreated,
  onError,
}: {
  addresses: ShippingAddress[];
  pickedId: string | null;
  onPick: (id: string) => void;
  showForm: boolean;
  onShowForm: () => void;
  onCreated: (a: ShippingAddress) => void;
  onError: (msg: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm uppercase tracking-wider text-neutral-500">
        Shipping address
      </p>

      {addresses.length > 0 && !showForm && (
        <ul className="flex flex-col gap-2">
          {addresses.map((a) => (
            <li key={a.id}>
              <label className="flex cursor-pointer gap-3 rounded-md border border-neutral-200 p-3 hover:border-neutral-400">
                <input
                  type="radio"
                  name="address"
                  checked={pickedId === a.id}
                  onChange={() => onPick(a.id)}
                  className="mt-1"
                />
                <span className="text-sm">
                  <strong>{a.full_name ?? "—"}</strong>
                  <br />
                  {a.line1}
                  {a.line2 && `, ${a.line2}`}
                  <br />
                  {a.city}
                  {a.region && `, ${a.region}`} {a.postal_code}
                </span>
              </label>
            </li>
          ))}
          <button
            type="button"
            onClick={onShowForm}
            className="mt-1 self-start text-xs underline-offset-4 hover:underline"
          >
            + Add another address
          </button>
        </ul>
      )}

      {showForm && (
        <AddressForm onCreated={onCreated} onError={onError} />
      )}
    </div>
  );
}

function AddressForm({
  onCreated,
  onError,
}: {
  onCreated: (a: ShippingAddress) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    company: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postal_code: "",
    country: "US",
    phone: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const a = await apiPost<ShippingAddress>("/addresses", form);
      onCreated(a);
    } catch (err) {
      onError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 text-sm">
      <Input col={2} label="Full name" value={form.full_name}
        onChange={(v) => set("full_name", v)} required />
      <Input col={2} label="Company (optional)" value={form.company}
        onChange={(v) => set("company", v)} />
      <Input col={2} label="Address" value={form.line1}
        onChange={(v) => set("line1", v)} required />
      <Input col={2} label="Apt, suite, etc. (optional)" value={form.line2}
        onChange={(v) => set("line2", v)} />
      <Input col={1} label="City" value={form.city}
        onChange={(v) => set("city", v)} required />
      <Input col={1} label="State" value={form.region}
        onChange={(v) => set("region", v)} required />
      <Input col={1} label="ZIP" value={form.postal_code}
        onChange={(v) => set("postal_code", v)} required />
      <Input col={1} label="Phone" value={form.phone}
        onChange={(v) => set("phone", v)} />
      <button
        type="submit"
        disabled={busy}
        className="col-span-2 mt-2 rounded-md border border-ink px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  col = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  col?: 1 | 2;
}) {
  return (
    <label className={`flex flex-col gap-1 ${col === 2 ? "col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-md border border-neutral-300 px-3 py-2"
      />
    </label>
  );
}

function Row({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={muted ? "text-neutral-500" : ""}>{children}</span>
    </div>
  );
}

function Loading() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
      <p className="text-neutral-500">Loading…</p>
    </main>
  );
}

function Errored({ msg }: { msg: string }) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
      <p className="text-red-700">{msg}</p>
    </main>
  );
}

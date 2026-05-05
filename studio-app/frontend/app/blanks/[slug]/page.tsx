"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart, Package, ArrowCounterClockwise, Lock, Minus, Plus } from "@phosphor-icons/react";
import { apiGet, apiPost } from "@/lib/api";
import { addToLocalCart } from "@/lib/localCart";
import { VOLUME_TIERS, tieredUnitPrice } from "@/lib/pricing";
import type { Product, ProductVariant } from "@/types";

type ProductDetail = Product & { product_variants: ProductVariant[] };

/* ── Placeholder product shown when API returns no data for the slug ── */
const PLACEHOLDER: ProductDetail = {
  id: "placeholder", slug: "placeholder",
  name: "Essentials Heavyweight Tee",
  description: "Our flagship 400gsm heavyweight tee. Preshrunk ring-spun cotton with a boxy, relaxed fit. The same blank used by the brands you already wear.",
  brand: "Amenity Blanks",
  sourcing: "dropship", supplier_id: null, category: "Tees & Tops",
  hero_image_url: null,
  images: [],
  base_price: 22.00,
  wholesale_cost: null,
  attributes: { weight: "400gsm", fit: "Relaxed / boxy", fabric: "100% ring-spun cotton", origin: "Pakistan" },
  status: "active",
  created_at: "", updated_at: "",
  product_variants: [
    { id:"v1", product_id:"p", sku:"TEE-S-BLK",  size:"S",  color:"Black",    price:22, wholesale_cost:null, inventory_count:50, tracks_inventory:false, hero_image_url:null, position:1, created_at:"", updated_at:"" },
    { id:"v2", product_id:"p", sku:"TEE-M-BLK",  size:"M",  color:"Black",    price:22, wholesale_cost:null, inventory_count:80, tracks_inventory:false, hero_image_url:null, position:2, created_at:"", updated_at:"" },
    { id:"v3", product_id:"p", sku:"TEE-L-BLK",  size:"L",  color:"Black",    price:22, wholesale_cost:null, inventory_count:60, tracks_inventory:false, hero_image_url:null, position:3, created_at:"", updated_at:"" },
    { id:"v4", product_id:"p", sku:"TEE-XL-BLK", size:"XL", color:"Black",    price:22, wholesale_cost:null, inventory_count:40, tracks_inventory:false, hero_image_url:null, position:4, created_at:"", updated_at:"" },
    { id:"v5", product_id:"p", sku:"TEE-S-STO",  size:"S",  color:"Stone",    price:22, wholesale_cost:null, inventory_count:45, tracks_inventory:false, hero_image_url:null, position:5, created_at:"", updated_at:"" },
    { id:"v6", product_id:"p", sku:"TEE-M-STO",  size:"M",  color:"Stone",    price:22, wholesale_cost:null, inventory_count:70, tracks_inventory:false, hero_image_url:null, position:6, created_at:"", updated_at:"" },
    { id:"v7", product_id:"p", sku:"TEE-L-STO",  size:"L",  color:"Stone",    price:22, wholesale_cost:null, inventory_count:55, tracks_inventory:false, hero_image_url:null, position:7, created_at:"", updated_at:"" },
    { id:"v8", product_id:"p", sku:"TEE-XL-STO", size:"XL", color:"Stone",    price:22, wholesale_cost:null, inventory_count:30, tracks_inventory:false, hero_image_url:null, position:8, created_at:"", updated_at:"" },
    { id:"v9", product_id:"p", sku:"TEE-S-OLV",  size:"S",  color:"Olive",    price:22, wholesale_cost:null, inventory_count:35, tracks_inventory:false, hero_image_url:null, position:9, created_at:"", updated_at:"" },
    { id:"v10",product_id:"p", sku:"TEE-M-OLV",  size:"M",  color:"Olive",    price:22, wholesale_cost:null, inventory_count:65, tracks_inventory:false, hero_image_url:null, position:10,created_at:"", updated_at:"" },
  ],
};

/* Color name → hex (fallback for text-only color names from API) */
const COLOR_HEX: Record<string, string> = {
  black:"#1a1a1a", white:"#f5f5f5", stone:"#d4cec5", slate:"#64748b",
  olive:"#4a6741", navy:"#1e3a5f", brown:"#8b7355", grey:"#9ca3af",
  gray:"#9ca3af", cream:"#f5f0e8", tan:"#c9b99a", sand:"#d4c5a9",
  natural:"#e8e0d0", charcoal:"#374151", forest:"#2d6a4f", sage:"#7c9e7a",
};
function colorToHex(name: string): string {
  return COLOR_HEX[name.toLowerCase()] ?? "#d4d4d4";
}

/* Placeholder tile backgrounds per color name */
const COLOR_BG: Record<string, string> = {
  black:"bg-neutral-800", white:"bg-neutral-50", stone:"bg-stone-200",
  olive:"bg-stone-400", navy:"bg-blue-900", grey:"bg-neutral-400",
  gray:"bg-neutral-400", cream:"bg-amber-50", tan:"bg-stone-300",
  sand:"bg-amber-100", natural:"bg-stone-100", charcoal:"bg-zinc-700",
  forest:"bg-emerald-900", sage:"bg-emerald-200",
};
function colorToBg(name: string): string {
  return COLOR_BG[name.toLowerCase()] ?? "bg-neutral-200";
}

/* ── Stars ── */
function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-0.5">
        {[1,2,3,4,5].map((i) => {
          const filled = rating >= i;
          const half   = !filled && rating >= i - 0.5;
          return (
            <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="none">
              {filled ? (
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#1a1a1a"/>
              ) : half ? (
                <>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#d4d4d4" strokeWidth="1.5"/>
                  <path d="M12 2v15.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#1a1a1a"/>
                </>
              ) : (
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#d4d4d4" strokeWidth="1.5"/>
              )}
            </svg>
          );
        })}
      </span>
      {count != null && (
        <button type="button" className="text-sm font-medium underline-offset-4 hover:underline">
          ({count.toLocaleString()} reviews)
        </button>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [size,    setSize]    = useState<string | null>(null);
  const [color,   setColor]   = useState<string | null>(null);
  const [quantity, setQuantity] = useState(12);           // B2B default MOQ
  const [adding,  setAdding]  = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false;
    apiGet<ProductDetail>(`/products/${slug}`)
      .then((p) => {
        if (cancelled) return;
        const prod = p.product_variants?.length ? p : PLACEHOLDER;
        setProduct(prod);
        const first = prod.product_variants[0];
        setSize(first?.size ?? null);
        setColor(first?.color ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(PLACEHOLDER);
          setSize(PLACEHOLDER.product_variants[0]?.size ?? null);
          setColor(PLACEHOLDER.product_variants[0]?.color ?? null);
        }
      });
    return () => { cancelled = true; };
  }, [slug]);

  /* ── Derived ── */
  const sizes = useMemo(() =>
    Array.from(new Set((product?.product_variants ?? []).map((v) => v.size).filter((s): s is string => !!s))),
    [product]);

  const colors = useMemo(() =>
    Array.from(new Set((product?.product_variants ?? []).map((v) => v.color).filter((c): c is string => !!c))),
    [product]);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!product) return null;
    return product.product_variants.find((v) => v.size === size && v.color === color) ?? null;
  }, [product, size, color]);

  /* Gallery images: real images array or color-keyed placeholder tiles */
  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (product.images?.length) return product.images;
    // Generate 3 pseudo-gallery entries keyed to selected color
    return ["main", "detail", "lifestyle"];
  }, [product]);

  /* ── Actions ── */
  async function addToCart() {
    if (!selectedVariant || !product) return;
    setAdding(true);
    try {
      // Try the API first; fall back to localStorage so the button always works
      try {
        await apiPost("/cart/items", { variant_id: selectedVariant.id, quantity });
      } catch {
        addToLocalCart({
          slug: product.slug,
          variant_id: selectedVariant.id,
          quantity,
          unit_price: tieredUnitPrice(selectedVariant.price, quantity),
          name: product.name,
          brand: product.brand,
          size: selectedVariant.size,
          color: selectedVariant.color,
          hero_image_url: selectedVariant.hero_image_url ?? product.hero_image_url,
          customization: null,
        });
      }
      router.push("/cart");
    } catch (e) { setError(String(e)); }
    finally { setAdding(false); }
  }

  function goCustomize() {
    if (!selectedVariant || !product) return;
    const qs = new URLSearchParams({
      variant: selectedVariant.id,
      qty: String(quantity),
      // Pass product display info so the canvas can show the real product
      img: product.hero_image_url ?? "",
      color: selectedVariant.color ?? "",
      name: product.name,
      price: String(selectedVariant.price),
    });
    router.push(`/blanks/${slug}/customize?${qs}`);
  }

  /* ── Loading / error states ── */
  if (error && !product) return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-8">
      <p className="text-red-700">Couldn&apos;t load this product. {error}</p>
    </main>
  );
  if (!product) return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-8">
      <p className="text-neutral-500">Loading…</p>
    </main>
  );

  const attrs = (product.attributes ?? {}) as Record<string, string>;
  const activeBg = color ? colorToBg(color) : "bg-neutral-100";

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-10">

      {/* ── Breadcrumb ── */}
      <nav className="mb-8 flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/blanks" className="hover:text-ink transition-colors">Wholesale</Link>
        <span>/</span>
        {product.category && (
          <>
            <span className="hover:text-ink cursor-pointer transition-colors">{product.category}</span>
            <span>/</span>
          </>
        )}
        <span className="text-neutral-800">{product.name}</span>
      </nav>

      {/* ── 3-panel layout ── */}
      <div className="flex gap-6 md:gap-8">

        {/* Panel 1 — Thumbnail strip */}
        <div className="hidden md:flex flex-col gap-2 flex-shrink-0 w-[90px]">
          {galleryImages.map((img, i) => (
            <button key={i} type="button" onClick={() => setActiveImg(i)}
              className={`aspect-square w-full overflow-hidden rounded-lg border-2 transition-all ${
                activeImg === i ? "border-ink" : "border-transparent hover:border-neutral-300"
              } ${activeBg}`}>
              {typeof img === "string" && img.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={`View ${i+1}`} className="h-full w-full object-cover"/>
              ) : null}
            </button>
          ))}
        </div>

        {/* Panel 2 — Main image */}
        <div className="relative flex-1 md:flex-[0_0_50%]">
          <div className={`aspect-[4/5] w-full overflow-hidden rounded-2xl ${activeBg}`}>
            {product.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.hero_image_url} alt={product.name}
                className="h-full w-full object-cover"/>
            ) : null}
          </div>

          {/* Wishlist */}
          <button type="button" aria-label="Save to wishlist"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm hover:bg-neutral-50 transition-colors">
            <Heart size={16} className="text-neutral-600"/>
          </button>

          {/* Mobile thumbnails */}
          <div className="mt-3 flex gap-2 md:hidden">
            {galleryImages.map((_, i) => (
              <button key={i} type="button" onClick={() => setActiveImg(i)}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  activeImg === i ? "bg-ink" : "bg-neutral-200"
                }`}/>
            ))}
          </div>
        </div>

        {/* Panel 3 — Product info */}
        <div className="flex flex-col gap-5 md:flex-[0_0_36%] md:pl-4">

          {/* Name + brand */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-1">{product.brand}</p>
            <h1 className="font-display text-3xl leading-tight tracking-tight">{product.name}</h1>
          </div>

          {/* Rating — placeholder stars since API has no ratings */}
          <Stars rating={4.7} count={89}/>

          {/* Price — updates live with quantity */}
          {(() => {
            const unitPrice = tieredUnitPrice(product.base_price, quantity);
            const discountPct = Math.round((1 - unitPrice / product.base_price) * 100);
            return (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-medium">${unitPrice.toFixed(2)}</span>
                  {discountPct > 0 && (
                    <span className="text-base text-neutral-400 line-through">${product.base_price.toFixed(2)}</span>
                  )}
                  {discountPct > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {discountPct}% off
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">
                  per unit &nbsp;·&nbsp; ${(unitPrice * quantity).toFixed(2)} total for {quantity} units
                </p>
              </div>
            );
          })()}

          {/* Volume pricing table */}
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Volume pricing</p>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <span className="font-medium text-neutral-500">Qty</span>
              <span className="font-medium text-neutral-500">Unit price</span>
              <span className="font-medium text-neutral-500">Savings</span>
              {VOLUME_TIERS.map((tier) => {
                const unitP = tieredUnitPrice(product.base_price, tier.min);
                const active = quantity >= tier.min && (tier.max == null || quantity <= tier.max);
                return (
                  <>
                    <span key={`${tier.label}-qty`} className={active ? "font-semibold text-ink" : "text-neutral-600"}>
                      {tier.label}
                    </span>
                    <span key={`${tier.label}-price`} className={active ? "font-semibold text-ink" : "text-neutral-600"}>
                      ${unitP.toFixed(2)}
                    </span>
                    <span key={`${tier.label}-save`} className={active ? "font-semibold text-emerald-700" : "text-neutral-400"}>
                      {tier.discountPct > 0 ? `${tier.discountPct}% off` : "—"}
                    </span>
                  </>
                );
              })}
            </div>
          </div>

          {/* Color picker */}
          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                Color: <span className="font-normal text-neutral-600">{color ?? "—"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} title={c}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      color === c ? "border-ink ring-2 ring-ink ring-offset-1" : "border-white ring-1 ring-neutral-300 hover:ring-neutral-400"
                    }`}
                    style={{ backgroundColor: colorToHex(c) }}
                    aria-label={c} aria-pressed={color === c}/>
                ))}
              </div>
            </div>
          )}

          {/* Size picker */}
          {sizes.length > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm font-medium">Size</p>
                <button type="button" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
                  Size Chart
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} type="button" onClick={() => setSize(s)}
                    className={`min-w-[3.5rem] rounded-md border px-4 py-2 text-sm transition ${
                      size === s
                        ? "border-ink bg-ink text-paper"
                        : "border-neutral-300 hover:border-neutral-500"
                    }`}
                    aria-pressed={size === s}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="mb-2 text-sm font-medium">Quantity <span className="font-normal text-neutral-500">(min. 12)</span></p>
            <div className="inline-flex items-center gap-0 rounded-md border border-neutral-300">
              <button type="button" onClick={() => setQuantity(Math.max(12, quantity - 12))}
                className="flex h-10 w-10 items-center justify-center text-neutral-500 hover:text-ink transition-colors">
                <Minus size={14}/>
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 12)}
                className="flex h-10 w-10 items-center justify-center text-neutral-500 hover:text-ink transition-colors">
                <Plus size={14}/>
              </button>
            </div>
          </div>

          {/* In stock */}
          <p className="text-center text-sm text-neutral-500">In stock and ready to ship</p>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <button type="button" onClick={addToCart}
              disabled={!selectedVariant || adding}
              className="w-full rounded-md bg-ink px-6 py-4 text-sm font-semibold uppercase tracking-wider text-paper transition hover:bg-neutral-800 disabled:opacity-40">
              {adding ? "Adding…" : "Add to Cart"}
            </button>
            <button type="button" onClick={goCustomize}
              disabled={!selectedVariant}
              className="w-full rounded-md border border-ink px-6 py-4 text-sm font-medium text-ink transition hover:bg-neutral-50 disabled:opacity-40">
              Customize this blank →
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-5">
            {[
              { icon: <Package size={18} className="text-neutral-500"/>, text: "Free standard shipping on orders over $200" },
              { icon: <ArrowCounterClockwise size={18} className="text-neutral-500"/>, text: "30-day easy returns on undecorated blanks" },
              { icon: <Lock size={18} className="text-neutral-500"/>, text: "Secure payment via Stripe" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-neutral-600">
                {icon} {text}
              </div>
            ))}
          </div>

          {/* Attributes */}
          {Object.keys(attrs).length > 0 && (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm">
              {Object.entries(attrs).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">{k.replace(/_/g, " ")}</dt>
                  <dd className="mt-0.5 font-medium text-neutral-800">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-sm leading-relaxed text-neutral-600 border-t border-neutral-100 pt-5">
              {product.description}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

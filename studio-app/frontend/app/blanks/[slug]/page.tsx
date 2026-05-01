"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import type { Product, ProductVariant } from "@/types";

type ProductDetail = Product & { product_variants: ProductVariant[] };

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // ----- fetch -----
  useEffect(() => {
    let cancelled = false;
    apiGet<ProductDetail>(`/products/${slug}`)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        // Pre-select the first variant's size + color so the page is usable
        // without forcing the user to make a choice.
        const first = p.product_variants?.[0];
        setSize(first?.size ?? null);
        setColor(first?.color ?? null);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ----- variant selection -----
  const sizes = useMemo(
    () =>
      Array.from(
        new Set(
          (product?.product_variants ?? [])
            .map((v) => v.size)
            .filter((s): s is string => !!s)
        )
      ),
    [product]
  );
  const colors = useMemo(
    () =>
      Array.from(
        new Set(
          (product?.product_variants ?? [])
            .map((v) => v.color)
            .filter((c): c is string => !!c)
        )
      ),
    [product]
  );

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!product) return null;
    return (
      product.product_variants.find(
        (v) => v.size === size && v.color === color
      ) ?? null
    );
  }, [product, size, color]);

  // ----- actions -----
  async function addBlankToCart() {
    if (!selectedVariant) return;
    setAdding(true);
    try {
      await apiPost("/cart/items", {
        variant_id: selectedVariant.id,
        quantity,
      });
      router.push("/cart");
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  }

  function goCustomize() {
    if (!selectedVariant) return;
    const qs = new URLSearchParams({
      variant: selectedVariant.id,
      qty: String(quantity),
    });
    router.push(`/blanks/${slug}/customize?${qs}`);
  }

  // ----- render -----
  if (error) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-8">
        <p className="text-red-700">Couldn&apos;t load this product. {error}</p>
      </main>
    );
  }
  if (!product) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-8">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  const heroSrc = product.hero_image_url ?? "/placeholder-hero.svg";
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-4 sm:px-0 py-12 md:grid-cols-2">
      {/* ---- gallery ---- */}
      <section className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </section>

      {/* ---- detail ---- */}
      <section className="flex flex-col gap-6">
        <header>
          <p className="text-sm uppercase tracking-wider text-neutral-500">
            {product.brand}
          </p>
          <h1 className="font-display text-4xl tracking-tight">{product.name}</h1>
          <p className="mt-2 text-2xl">${product.base_price.toFixed(2)}</p>
        </header>

        {product.description && (
          <p className="text-neutral-700">{product.description}</p>
        )}

        {/* attribute row */}
        {Object.keys(attrs).length > 0 && (
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4 text-sm">
            {Object.entries(attrs).map(([k, v]) => (
              <div key={k}>
                <dt className="uppercase tracking-wider text-neutral-500">
                  {k.replace(/_/g, " ")}
                </dt>
                <dd className="text-neutral-900">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* size picker */}
        {sizes.length > 0 && (
          <div>
            <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`min-w-[3rem] rounded-md border px-3 py-2 text-sm transition ${
                    size === s
                      ? "border-ink bg-ink text-paper"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* color picker */}
        {colors.length > 0 && (
          <div>
            <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    color === c
                      ? "border-ink bg-ink text-paper"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* quantity */}
        <div>
          <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">
            Quantity
          </p>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value || "1", 10)))
            }
            className="w-24 rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        {/* ---- stacked CTAs ---- */}
        <div className="mt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={goCustomize}
            disabled={!selectedVariant}
            className="w-full rounded-md bg-ink px-6 py-4 text-base font-medium text-paper transition hover:bg-accent disabled:opacity-40"
          >
            Customize this →
          </button>
          <button
            type="button"
            onClick={addBlankToCart}
            disabled={!selectedVariant || adding}
            className="w-full rounded-md border border-ink bg-paper px-6 py-4 text-base font-medium text-ink transition hover:bg-neutral-100 disabled:opacity-40"
          >
            {adding ? "Adding…" : "Add blank to cart"}
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          Customize unlocks logo upload, placement, and decoration pricing.
          Blanks ship in 5–7 business days; customized orders take ~14 days.
        </p>
      </section>
    </main>
  );
}

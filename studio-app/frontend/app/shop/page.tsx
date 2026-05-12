"use client";

/**
 * /shop — wholesale catalog umbrella.
 *
 * Sections:
 *   1. Header — wholesale framing
 *   2. Category rail — horizontal scrollable filter pills
 *   3. Featured products — 6-up grid
 *   4. Featured collection — big lifestyle card on the left, 6-up image grid
 *      on the right (modeled on the screenshot you shared)
 *   5. Top sellers — 6-up grid
 *   6. Try Liai — callout for users who need manufacturing help
 *
 * Product data comes from /products (FastAPI); falls back to placeholder
 * catalog when the API returns empty so the page never looks broken.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Heart, Sparkle, Star } from "@phosphor-icons/react";
import type { Product, ProductVariant } from "@/types";
import { lowestTieredPrice } from "@/lib/pricing";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type ProductWithVariants = Product & { product_variants: ProductVariant[] };

const CATEGORIES = [
  "All",
  "Tees & Tops",
  "Hoodies & Fleece",
  "Bottoms",
  "Headwear",
  "Outerwear",
  "Footwear",
  "Accessories",
];

/* ─────────────────────────────────────────────────────────────────────────────
   PLACEHOLDER CATALOG
───────────────────────────────────────────────────────────────────────────── */

interface CardItem {
  slug: string;
  name: string;
  base_price: number;
  category: string;
  rating: number;
  badge?: string;
  colors: string[];
  hero_image_url?: string | null;
}

const UNSPLASH: Record<string, string> = {
  "Essentials Tee":        "photo-1521572163474-6864f9cf17ab",
  "Heavyweight Tee":       "photo-1583743814966-8936f5b7be1a",
  "Long-Sleeve Tee":       "photo-1618354691373-d851c5c3a990",
  "Heavyweight Hoodie":    "photo-1556821840-3a63f15732ce",
  "French Terry Crewneck": "photo-1578587029809-cf2c23b8f4e2",
  "Washed Fleece":         "photo-1602810318383-e386cc2a3ccf",
  "Relaxed Chino":         "photo-1624378439575-d8705ad7ae80",
  "Fleece Shorts":         "photo-1591195853828-11db59a44f43",
  "Cargo Pant":            "photo-1624378439575-d8705ad7ae80",
  "Structured 6-Panel":    "photo-1588850561407-ed78c282e89b",
  "Nylon Bomber":          "photo-1551537482-f2075a1d41f2",
  "Canvas Tote":           "photo-1544816155-12df9643f363",
};
function unsplashUrl(name: string) {
  const id = UNSPLASH[name];
  return id ? `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&h=750&q=80` : undefined;
}

const FEATURED_PLACEHOLDER: CardItem[] = [
  { slug:"essentials-tee",        name:"Essentials Tee",        base_price:18,  category:"Tees & Tops",      rating:4.8, badge:"Best seller", colors:["#d4cec5","#1a1a1a","#8b7355","#4a6741"], hero_image_url: unsplashUrl("Essentials Tee") },
  { slug:"heavyweight-hoodie",    name:"Heavyweight Hoodie",    base_price:42,  category:"Hoodies & Fleece", rating:4.6, badge:"New",         colors:["#e5e0d8","#1a1a1a","#5c6b7a"],          hero_image_url: unsplashUrl("Heavyweight Hoodie") },
  { slug:"french-terry-crewneck", name:"French Terry Crewneck", base_price:38,  category:"Hoodies & Fleece", rating:4.7,                      colors:["#c8b89a","#2d3748","#744210"],         hero_image_url: unsplashUrl("French Terry Crewneck") },
  { slug:"relaxed-chino",         name:"Relaxed Chino",         base_price:54,  category:"Bottoms",          rating:4.5, badge:"Best seller", colors:["#c9b99a","#1a1a1a","#4a5568"],         hero_image_url: unsplashUrl("Relaxed Chino") },
  { slug:"structured-6-panel",    name:"Structured 6-Panel",    base_price:22,  category:"Headwear",         rating:4.9,                      colors:["#1a1a1a","#d4cec5","#4a5568","#2d6a4f"], hero_image_url: unsplashUrl("Structured 6-Panel") },
  { slug:"nylon-bomber",          name:"Nylon Bomber",          base_price:88,  category:"Outerwear",        rating:4.4, badge:"New",         colors:["#1a1a1a","#2d3748"],                   hero_image_url: unsplashUrl("Nylon Bomber") },
];

const TOP_SELLERS_PLACEHOLDER: CardItem[] = [
  { slug:"heavyweight-tee",       name:"Heavyweight Tee",       base_price:22,  category:"Tees & Tops",      rating:4.9, badge:"Best seller", colors:["#1a1a1a","#e5e0d8","#8b7355","#4a6741","#5c6b7a"], hero_image_url: unsplashUrl("Heavyweight Tee") },
  { slug:"canvas-tote",           name:"Canvas Tote",           base_price:14,  category:"Accessories",      rating:4.8, badge:"Best seller", colors:["#d4cec5","#1a1a1a","#8b7355"],                   hero_image_url: unsplashUrl("Canvas Tote") },
  { slug:"essentials-tee",        name:"Essentials Tee",        base_price:18,  category:"Tees & Tops",      rating:4.8,                      colors:["#d4cec5","#1a1a1a","#8b7355","#4a6741"],         hero_image_url: unsplashUrl("Essentials Tee") },
  { slug:"fleece-shorts",         name:"Fleece Shorts",         base_price:28,  category:"Bottoms",          rating:4.6,                      colors:["#e5e0d8","#1a1a1a","#4a6741"],                   hero_image_url: unsplashUrl("Fleece Shorts") },
  { slug:"long-sleeve-tee",       name:"Long-Sleeve Tee",       base_price:24,  category:"Tees & Tops",      rating:4.5,                      colors:["#e5e0d8","#1a1a1a","#c5b9a8","#4a5568"],         hero_image_url: unsplashUrl("Long-Sleeve Tee") },
  { slug:"washed-fleece",         name:"Washed Fleece",         base_price:46,  category:"Hoodies & Fleece", rating:4.6,                      colors:["#c8b89a","#4a5568","#1a1a1a"],                   hero_image_url: unsplashUrl("Washed Fleece") },
];

/* Hero image for the Featured Collection big card.
 * Pick a moody lifestyle shot that reads as an editorial set piece. Replace
 * with a brand-shot photo when one is available. */
const COLLECTION_HERO =
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&h=1200&q=80";

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function ShopPage() {
  const [apiProducts, setApiProducts] = useState<ProductWithVariants[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    fetch(`${API}/products`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((json) => {
        setApiProducts(json.products ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const baseFeatured = useMemo<CardItem[]>(() => {
    if (apiProducts.length === 0) return FEATURED_PLACEHOLDER;
    return apiProducts.slice(0, 12).map((p) => ({
      slug: p.slug,
      name: p.name,
      base_price: p.base_price,
      category: p.category ?? "—",
      rating: 4.7,
      hero_image_url: p.hero_image_url,
      colors: ["#d4cec5", "#1a1a1a", "#8b7355"],
    }));
  }, [apiProducts]);

  const baseTopSellers = useMemo<CardItem[]>(() => {
    if (apiProducts.length === 0) return TOP_SELLERS_PLACEHOLDER;
    return apiProducts.slice(6, 18).map((p) => ({
      slug: p.slug,
      name: p.name,
      base_price: p.base_price,
      category: p.category ?? "—",
      rating: 4.8,
      badge: "Best seller",
      hero_image_url: p.hero_image_url,
      colors: ["#1a1a1a", "#e5e0d8", "#8b7355"],
    }));
  }, [apiProducts]);

  const featured = useMemo(() => filterAndCap(baseFeatured, category, 6), [baseFeatured, category]);
  const topSellers = useMemo(() => filterAndCap(baseTopSellers, category, 6), [baseTopSellers, category]);

  /* Featured Collection uses a mix of items from both pools so the curation
     feels distinct from the two surrounding grids. */
  const collectionItems = useMemo<CardItem[]>(() => {
    const blend = [...baseFeatured, ...baseTopSellers];
    const filtered = category === "All" ? blend : blend.filter((i) => i.category === category);
    return filtered.slice(0, 6);
  }, [baseFeatured, baseTopSellers, category]);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 md:py-14">
      {/* Header */}
      <div className="mb-8 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Wholesale</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">Shop</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
          Premium blanks at B2B pricing — tiered as quantities scale. Need help
          finding the right manufacturer? Talk to{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-ink">
            Liai
          </Link>
          .
        </p>
      </div>

      {/* Category filters */}
      <CategoryRail
        categories={CATEGORIES}
        active={category}
        onChange={setCategory}
      />

      {/* Featured products */}
      <ProductGrid
        kicker="Featured products"
        title="New + favorites"
        items={featured}
        loading={!loaded && apiProducts.length === 0}
        emptyHint={category}
        className="mt-10"
      />

      {/* Featured collection */}
      <FeaturedCollection
        items={collectionItems}
        loading={!loaded && apiProducts.length === 0}
        className="mt-16"
      />

      {/* Top sellers */}
      <ProductGrid
        kicker="Top sellers"
        title="Best of the catalog"
        items={topSellers}
        loading={!loaded && apiProducts.length === 0}
        emptyHint={category}
        className="mt-16"
      />

      {/* Try Liai callout */}
      <TryLiaiCallout className="mt-16" />
    </main>
  );
}

function filterAndCap(items: CardItem[], category: string, cap: number) {
  const filtered = category === "All" ? items : items.filter((i) => i.category === category);
  return filtered.slice(0, cap);
}

/* ─────────────────────────────────────────────────────────────────────────────
   CATEGORY RAIL
───────────────────────────────────────────────────────────────────────────── */

function CategoryRail({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="-mx-4 sm:mx-0">
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              aria-pressed={isActive}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-ink bg-ink text-paper"
                  : "border-neutral-300 bg-white text-ink hover:border-neutral-500"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT GRID
───────────────────────────────────────────────────────────────────────────── */

function ProductGrid({
  kicker,
  title,
  items,
  loading,
  emptyHint,
  className = "",
}: {
  kicker: string;
  title: string;
  items: CardItem[];
  loading: boolean;
  emptyHint: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {kicker}
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-neutral-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          {emptyHint === "All"
            ? "No items yet — load the products seed."
            : `No items in "${emptyHint}" right now.`}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((p) => (
            <ProductCard key={`${kicker}-${p.slug}`} item={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProductCard({ item }: { item: CardItem }) {
  return (
    <Link
      href={`/shop/blanks/${item.slug}`}
      className="group flex flex-col gap-3"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-100">
        {item.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.hero_image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
        {item.badge && (
          <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium shadow-sm">
            {item.badge}
          </span>
        )}
        <button
          type="button"
          aria-label="Save"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100"
        >
          <Heart size={12} weight="regular" aria-hidden className="text-neutral-600" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{item.name}</p>
          <p className="flex-shrink-0 text-sm text-neutral-600">
            ${lowestTieredPrice(item.base_price).toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={11} weight="fill" aria-hidden className="text-ink" />
          <span className="text-xs text-neutral-500">{item.rating.toFixed(1)}</span>
        </div>
        {item.colors.length > 0 && (
          <div className="flex items-center gap-1 pt-0.5">
            {item.colors.slice(0, 5).map((c) => (
              <span
                key={c}
                title={c}
                className="h-3.5 w-3.5 rounded-full border border-white ring-1 ring-neutral-200"
                style={{ backgroundColor: c }}
              />
            ))}
            {item.colors.length > 5 && (
              <span className="text-xs text-neutral-400">+{item.colors.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURED COLLECTION
   Left: big lifestyle card with overlay copy + CTA
   Right: 3×2 grid of simpler product cards (image + price only)
───────────────────────────────────────────────────────────────────────────── */

function FeaturedCollection({
  items,
  loading,
  className = "",
}: {
  items: CardItem[];
  loading: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Featured collection
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight md:text-3xl">
          Heavyweight basics
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left — lifestyle hero card */}
        <Link
          href="/shop/blanks"
          className="group relative block overflow-hidden rounded-2xl bg-neutral-100"
          style={{ minHeight: 480 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={COLLECTION_HERO}
            alt="Heavyweight basics collection"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 text-paper sm:p-8">
            <p className="font-display text-2xl tracking-tight leading-tight md:text-3xl">
              Woven to perfection
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/80">
              Built on heavyweight knits and finished to last. Domestic stock,
              tiered pricing, ships in 5–7 days.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink transition-all duration-200 group-hover:bg-neutral-100">
              Shop the collection
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ink/20 transition-all duration-200 group-hover:bg-ink group-hover:text-paper">
                <ArrowRight size={9} weight="bold" aria-hidden />
              </span>
            </span>
          </div>
        </Link>

        {/* Right — 3×2 image-only grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {items.slice(0, 6).map((item) => (
              <CollectionTile key={`coll-${item.slug}`} item={item} />
            ))}
            {/* If filter narrows the pool to <6, pad with empty squares so the grid stays balanced. */}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square rounded-xl bg-neutral-50" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionTile({ item }: { item: CardItem }) {
  return (
    <Link
      href={`/shop/blanks/${item.slug}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
        {item.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.hero_image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
        <button
          type="button"
          aria-label="Save"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100"
        >
          <Heart size={12} weight="regular" aria-hidden className="text-neutral-600" />
        </button>
      </div>
      <p className="text-xs text-neutral-600">
        ${lowestTieredPrice(item.base_price).toFixed(2)}
      </p>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TRY LIAI CALLOUT
───────────────────────────────────────────────────────────────────────────── */

function TryLiaiCallout({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <div className="grid grid-cols-1 items-center gap-6 rounded-2xl bg-ink p-8 text-paper md:grid-cols-[1fr_auto] md:p-10">
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80">
            <Sparkle size={11} weight="fill" aria-hidden />
            Meet Liai
          </div>
          <p className="font-display text-2xl tracking-tight leading-tight md:text-3xl">
            Looking for reliable manufacturing?
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-white/70">
            Liai matches your brief with vetted manufacturers, mills, and
            decorators — ranked by capability fit, lead time, and certifications
            in minutes.
          </p>
        </div>
        <Link
          href="/"
          className="group inline-flex w-fit items-center justify-between gap-3 rounded-md bg-paper px-5 py-3 text-sm font-medium text-ink transition-all duration-200 hover:bg-neutral-100"
        >
          Try Liai
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 transition-all duration-200 group-hover:bg-ink group-hover:text-paper">
            <ArrowRight size={11} weight="bold" aria-hidden />
          </span>
        </Link>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Funnel, CaretDown, Heart, X } from "@phosphor-icons/react";
import type { Product, ProductVariant } from "@/types";
import { lowestTieredPrice } from "@/lib/pricing";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type ProductWithVariants = Product & { product_variants: ProductVariant[] };

/* ─── Placeholder products (shown when API returns empty) ─── */
interface PlaceholderProduct {
  slug: string; name: string; base_price: number;
  category: string; badge?: string; rating: number;
  reviewCount: number; colors: string[]; bg: string;
}
const PLACEHOLDERS: PlaceholderProduct[] = [
  { slug:"essentials-tee",        name:"Essentials Tee",        base_price:18,  category:"Tees & Tops",      badge:"Best seller", rating:4.8, reviewCount:127, colors:["#d4cec5","#1a1a1a","#8b7355","#4a6741"],          bg:"bg-stone-200"   },
  { slug:"heavyweight-hoodie",    name:"Heavyweight Hoodie",    base_price:42,  category:"Hoodies & Fleece", badge:"New",         rating:4.6, reviewCount:43,  colors:["#e5e0d8","#1a1a1a","#5c6b7a"],                   bg:"bg-neutral-200" },
  { slug:"french-terry-crewneck", name:"French Terry Crewneck", base_price:38,  category:"Hoodies & Fleece",                      rating:4.7, reviewCount:89,  colors:["#c8b89a","#2d3748","#744210"],                   bg:"bg-amber-100"   },
  { slug:"relaxed-chino",         name:"Relaxed Chino",         base_price:54,  category:"Bottoms",          badge:"Best seller", rating:4.5, reviewCount:62,  colors:["#c9b99a","#1a1a1a","#4a5568"],                   bg:"bg-stone-300"   },
  { slug:"structured-6-panel",    name:"Structured 6-Panel",    base_price:22,  category:"Headwear",                              rating:4.9, reviewCount:204, colors:["#1a1a1a","#d4cec5","#4a5568","#2d6a4f"],         bg:"bg-neutral-300" },
  { slug:"nylon-bomber",          name:"Nylon Bomber",          base_price:88,  category:"Outerwear",        badge:"New",         rating:4.4, reviewCount:18,  colors:["#1a1a1a","#2d3748"],                             bg:"bg-zinc-200"    },
  { slug:"fleece-shorts",         name:"Fleece Shorts",         base_price:28,  category:"Bottoms",                               rating:4.6, reviewCount:51,  colors:["#e5e0d8","#1a1a1a","#4a6741"],                   bg:"bg-amber-50"    },
  { slug:"dad-hat",               name:"Dad Hat",               base_price:18,  category:"Headwear",         badge:"Best seller", rating:4.7, reviewCount:93,  colors:["#d4cec5","#1a1a1a","#8b7355"],                   bg:"bg-stone-100"   },
  { slug:"long-sleeve-tee",       name:"Long-Sleeve Tee",       base_price:24,  category:"Tees & Tops",                           rating:4.5, reviewCount:37,  colors:["#e5e0d8","#1a1a1a","#c5b9a8","#4a5568"],         bg:"bg-neutral-100" },
  { slug:"track-jacket",          name:"Track Jacket",          base_price:68,  category:"Outerwear",        badge:"New",         rating:4.3, reviewCount:11,  colors:["#1a1a1a","#2d6a4f","#5c6b7a"],                   bg:"bg-zinc-300"    },
  { slug:"canvas-tote",           name:"Canvas Tote",           base_price:14,  category:"Accessories",      badge:"Best seller", rating:4.8, reviewCount:156, colors:["#d4cec5","#1a1a1a","#8b7355"],                   bg:"bg-amber-100"   },
  { slug:"washed-fleece",         name:"Washed Fleece",         base_price:46,  category:"Hoodies & Fleece",                      rating:4.6, reviewCount:72,  colors:["#c8b89a","#4a5568","#1a1a1a"],                   bg:"bg-stone-200"   },
  { slug:"low-top-sneaker",       name:"Low-Top Sneaker",       base_price:62,  category:"Footwear",                              rating:4.4, reviewCount:28,  colors:["#e5e0d8","#1a1a1a"],                             bg:"bg-neutral-200" },
  { slug:"suede-loafer",          name:"Suede Loafer",          base_price:74,  category:"Footwear",         badge:"New",         rating:4.5, reviewCount:15,  colors:["#c9b99a","#4a3728"],                             bg:"bg-stone-300"   },
  { slug:"heavyweight-tee",       name:"Heavyweight Tee",       base_price:22,  category:"Tees & Tops",      badge:"Best seller", rating:4.9, reviewCount:311, colors:["#1a1a1a","#e5e0d8","#8b7355","#4a6741","#5c6b7a"],bg:"bg-stone-200"   },
  { slug:"cargo-pant",            name:"Cargo Pant",            base_price:58,  category:"Bottoms",          badge:"New",         rating:4.4, reviewCount:24,  colors:["#4a5568","#1a1a1a","#8b7355"],                   bg:"bg-zinc-200"    },
];

const CATEGORIES = ["All","Tees & Tops","Hoodies & Fleece","Bottoms","Headwear","Outerwear","Footwear","Accessories"];

type SortKey = "featured" | "price-asc" | "price-desc" | "newest";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value:"featured",   label:"Featured"       },
  { value:"price-asc",  label:"Price: Low–High" },
  { value:"price-desc", label:"Price: High–Low" },
  { value:"newest",     label:"Newest"          },
];

/* ── Stars ── */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => {
        const filled = rating >= i;
        const half   = !filled && rating >= i - 0.5;
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="none">
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
  );
}

/* ── Product Card ── */
interface CardProps {
  slug: string; name: string; base_price: number;
  badge?: string; rating?: number; reviewCount?: number;
  colors?: string[]; bg?: string; hero_image_url?: string | null;
}
function ProductCard({ slug, name, base_price, badge, rating, reviewCount, colors, bg, hero_image_url }: CardProps) {
  return (
    <Link href={`/blanks/${slug}`} className="group flex flex-col gap-3">
      {/* Image */}
      <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl ${bg ?? "bg-neutral-100"}`}>
        {hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero_image_url} alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"/>
        ) : (
          <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"/>
        )}

        {/* Badge */}
        {badge && (
          <span className="absolute bottom-3 left-3 rounded-md bg-white px-2.5 py-1 text-xs font-medium shadow-sm">
            {badge}
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          aria-label="Save"
          onClick={(e) => e.preventDefault()}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-white"
        >
          <Heart size={14} className="text-neutral-600"/>
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{name}</p>
          <p className="flex-shrink-0 text-sm text-neutral-600">From ${lowestTieredPrice(base_price).toFixed(2)}</p>
        </div>
        {rating != null && (
          <div className="flex items-center gap-1.5">
            <Stars rating={rating}/>
            <span className="text-xs text-neutral-500">{rating.toFixed(1)}</span>
          </div>
        )}
        {colors && colors.length > 0 && (
          <div className="flex items-center gap-1 pt-0.5">
            {colors.slice(0,5).map((c) => (
              <span key={c} title={c}
                className="h-3.5 w-3.5 rounded-full border border-white ring-1 ring-neutral-200"
                style={{ backgroundColor: c }}/>
            ))}
            {colors.length > 5 && (
              <span className="text-xs text-neutral-400">+{colors.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Filter Dropdown (UI shell — wired to real data in future) ── */
function FilterDropdown({ label }: { label: string }) {
  return (
    <button type="button"
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:border-neutral-500">
      {label}<CaretDown size={12} weight="bold"/>
    </button>
  );
}

/* ── Page ── */
export default function BlanksPage() {
  const [apiProducts, setApiProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState("All");
  const [sort, setSort]         = useState<SortKey>("featured");
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    fetch(`${API}/products`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((json) => { setApiProducts(json.products ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* Normalise API products or fall back to placeholders */
  const allItems = useMemo<CardProps[]>(() => {
    if (apiProducts.length > 0) {
      return apiProducts.map((p) => ({
        slug: p.slug, name: p.name, base_price: p.base_price,
        hero_image_url: p.hero_image_url, bg: "bg-neutral-100",
        category: p.category ?? "All",
      }));
    }
    return PLACEHOLDERS.map((p) => ({ ...p, hero_image_url: null }));
  }, [apiProducts]);

  const filtered = useMemo(() => {
    const src = apiProducts.length > 0
      ? allItems
      : (category === "All" ? allItems : allItems.filter((p) => (p as PlaceholderProduct).category === category));

    if (sort === "price-asc")  return [...src].sort((a,b) => a.base_price - b.base_price);
    if (sort === "price-desc") return [...src].sort((a,b) => b.base_price - a.base_price);
    return src;
  }, [allItems, apiProducts.length, category, sort]);

  const activeCategory = category !== "All";

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Amenity</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Wholesale Catalog</h1>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-0 z-10 -mx-4 bg-white px-4 py-3 sm:mx-0 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">

          {/* Filter icon */}
          <button type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:border-neutral-500">
            <Funnel size={13} weight="bold"/>
            Filter {activeCategory && "(1)"}
          </button>

          {/* Category pills */}
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                category === cat
                  ? "border-ink bg-ink text-paper"
                  : "border-neutral-300 bg-white hover:border-neutral-500"
              }`}>
              {cat}
            </button>
          ))}

          {/* Attribute dropdowns */}
          <FilterDropdown label="Color"/>
          <FilterDropdown label="Size"/>
          <FilterDropdown label="Material"/>
          <FilterDropdown label="Price Range"/>

          {/* Clear */}
          {activeCategory && (
            <button type="button" onClick={() => setCategory("All")}
              className="inline-flex items-center gap-1 text-sm text-neutral-500 underline-offset-4 hover:underline">
              <X size={11}/> Clear all
            </button>
          )}

          {/* Count + Sort */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} items`}
            </span>
            <div className="relative">
              <button type="button" onClick={() => setShowSort((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:border-neutral-500">
                Sort By <CaretDown size={12} weight="bold"/>
              </button>
              {showSort && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.value} type="button"
                      onClick={() => { setSort(o.value); setShowSort(false); }}
                      className={`w-full px-4 py-2 text-left text-sm transition hover:bg-neutral-50 ${sort===o.value?"font-medium":""}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 border-b border-neutral-100"/>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="mt-20 text-center text-neutral-500">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-20 text-center">
          <p className="text-neutral-500">No products in this category yet.</p>
          <button type="button" onClick={() => setCategory("All")}
            className="mt-4 text-sm underline-offset-4 hover:underline">View all wholesale</button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.slug} {...p}/>)}
        </div>
      )}
    </main>
  );
}

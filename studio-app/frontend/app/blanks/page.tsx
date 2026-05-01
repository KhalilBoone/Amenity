import Link from "next/link";
import type { Product, ProductVariant } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ProductWithVariants = Product & { product_variants: ProductVariant[] };

async function fetchProducts(): Promise<ProductWithVariants[]> {
  try {
    const res = await fetch(`${API}/products`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { products: ProductWithVariants[] };
    return json.products ?? [];
  } catch {
    return [];
  }
}

const CATEGORIES: { id: string; label: string; sub: string }[] = [
  { id: "tees",    label: "Tees",    sub: "6.5oz–400gsm heavyweight knits" },
  { id: "hoodies", label: "Hoodies", sub: "14oz pullovers, regular and relaxed" },
  { id: "sweats",  label: "Sweats",  sub: "500gsm crews, fleece interior" },
];

export default async function BlanksLandingPage() {
  const products = await fetchProducts();
  const featured = products.slice(0, 4);

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
      {/* ---------- hero ---------- */}
      <section className="rounded-2xl bg-neutral-100 p-10 md:p-16">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Amenity Blanks
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
          Designer-grade blanks.
          <br />
          Wholesale pricing.
        </h1>
        <p className="mt-4 max-w-xl text-neutral-700">
          The same midweight and heavyweight basics that define modern
          menswear — sourced direct from the wholesalers who supply Supreme,
          Aimé Leon Dore, and Kith. Add your logo or order plain.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/blanks/category/tees"
            className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-accent"
          >
            Shop tees →
          </Link>
          <Link
            href="/blanks/category/hoodies"
            className="rounded-md border border-ink px-5 py-3 text-sm font-medium hover:bg-neutral-100"
          >
            Shop hoodies
          </Link>
        </div>
      </section>

      {/* ---------- category tiles ---------- */}
      <section className="mt-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Shop by category</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/blanks/category/${c.id}`}
              className="group rounded-xl border border-neutral-200 p-6 transition hover:border-neutral-500"
            >
              <p className="font-display text-2xl">{c.label}</p>
              <p className="mt-1 text-sm text-neutral-600">{c.sub}</p>
              <p className="mt-4 text-sm font-medium underline-offset-4 group-hover:underline">
                Browse →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- featured products ---------- */}
      <section className="mt-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Featured</h2>
          <Link
            href="/blanks/category/tees"
            className="text-sm underline-offset-4 hover:underline"
          >
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.length === 0 ? (
            <p className="col-span-full text-neutral-500">
              No products yet — load <code>products_seed_template.sql</code>.
            </p>
          ) : (
            featured.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product }: { product: ProductWithVariants }) {
  return (
    <Link
      href={`/blanks/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 transition hover:border-neutral-400"
    >
      <div className="aspect-[4/5] w-full bg-neutral-100">
        {product.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.hero_image_url}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <span className="text-xs uppercase tracking-wider">
              {product.brand}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          {product.brand}
        </p>
        <p className="font-medium leading-tight">{product.name}</p>
        <p className="mt-auto pt-2 text-sm">
          From ${product.base_price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}

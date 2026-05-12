import Link from "next/link";
import { notFound } from "next/navigation";
import type { Product, ProductVariant } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ProductWithVariants = Product & { product_variants: ProductVariant[] };

const VALID_CATEGORIES = new Set(["tees", "hoodies", "sweats"]);

const COPY: Record<string, { title: string; sub: string }> = {
  tees: {
    title: "Tees",
    sub: "Heavyweight knits from 6.5oz to 400gsm premium.",
  },
  hoodies: {
    title: "Hoodies",
    sub: "Pullovers in midweight 320gsm and heavyweight 14oz.",
  },
  sweats: {
    title: "Sweats",
    sub: "500gsm crewnecks. Brushed back, ribbed cuffs and hem.",
  },
};

async function fetchProducts(category: string): Promise<ProductWithVariants[]> {
  try {
    const res = await fetch(
      `${API}/products?category=${encodeURIComponent(category)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { products: ProductWithVariants[] };
    return json.products ?? [];
  } catch {
    return [];
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  if (!VALID_CATEGORIES.has(name)) notFound();

  const products = await fetchProducts(name);
  const copy = COPY[name];

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
      {/* breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/shop/blanks" className="hover:underline">
          Wholesale
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{copy.title}</span>
      </nav>

      <header className="mb-10">
        <h1 className="font-display text-4xl tracking-tight">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-neutral-700">{copy.sub}</p>
      </header>

      {products.length === 0 ? (
        <p className="text-neutral-500">
          Nothing in this category yet — load{" "}
          <code>products_seed_template.sql</code>.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/shop/blanks/${p.slug}`}
                className="group block overflow-hidden rounded-xl border border-neutral-200 transition hover:border-neutral-400"
              >
                <div className="aspect-[4/5] w-full bg-neutral-100">
                  {p.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.hero_image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-400">
                      <span className="text-xs uppercase tracking-wider">
                        {p.brand}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">
                    {p.brand}
                  </p>
                  <p className="font-medium leading-tight">{p.name}</p>
                  <p className="mt-2 text-sm">
                    From ${p.base_price.toFixed(2)}
                  </p>
                  {p.product_variants?.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      {p.product_variants.length} variants
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

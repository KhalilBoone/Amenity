import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Sparkle,
  Package,
  Storefront,
  CheckCircle,
} from "@phosphor-icons/react/ssr";
import { getUseCase, ALL_USE_CASES, USE_CASE_CATEGORIES } from "@/lib/useCases";

// ─── Static params ─────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  return ALL_USE_CASES.map((uc) => ({ slug: uc.slug }));
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) return {};
  return {
    title: `${uc.label} — Amenity`,
    description: uc.hero,
  };
}

// ─── Product badge config ──────────────────────────────────────────────────────
const PRODUCT_META = {
  liai:   { label: "Liai", sub: "AI Sourcing Agent", Icon: Sparkle,   accent: "bg-violet-50 text-violet-700 border-violet-100", href: "/products/liai" },
  studio: { label: "Studio", sub: "PIM & PLM",        Icon: Package,   accent: "bg-sky-50 text-sky-700 border-sky-100",         href: "/products/studio" },
  blanks: { label: "Blanks", sub: "Wholesale Shop",   Icon: Storefront, accent: "bg-emerald-50 text-emerald-700 border-emerald-100", href: "/shop" },
} as const;

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) notFound();

  // Find which category this use case belongs to
  const category = USE_CASE_CATEGORIES.find((cat) =>
    cat.useCases.some((u) => u.slug === slug)
  );

  // Other use cases in same category (excluding current)
  const relatedUseCases = category?.useCases.filter((u) => u.slug !== slug) ?? [];

  return (
    <div className="bg-white">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-100">
        <div className="mx-auto max-w-[1200px] px-6 py-3 text-xs text-neutral-400 sm:px-0">
          <Link href="/use-cases" className="transition-colors hover:text-neutral-700">
            Use Cases
          </Link>
          {category && (
            <>
              <span className="mx-2">/</span>
              <span>{category.label}</span>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="font-medium text-neutral-700">{uc.label}</span>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-14 sm:px-0 md:pt-20">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {uc.sub}
        </p>
        <h1 className="font-display max-w-2xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
          {uc.headline}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-500">
          {uc.hero}
        </p>

        {/* Products used */}
        <div className="mt-8 flex flex-wrap gap-2">
          {uc.products.map((p) => {
            const meta = PRODUCT_META[p];
            return (
              <Link
                key={p}
                href={meta.href}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 ${meta.accent}`}
              >
                <meta.Icon size={12} weight="fill" aria-hidden />
                {meta.label} · {meta.sub}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            href={uc.cta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
          >
            {uc.cta.label}
            <ArrowRight size={15} weight="bold" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── Pain points ─────────────────────────────────────────────────────── */}
      <section className="border-y border-neutral-100 bg-neutral-50">
        <div className="mx-auto max-w-[1200px] px-6 py-14 sm:px-0">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            The challenge
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {uc.pain.map((p, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-5"
              >
                <span className="mt-0.5 flex-shrink-0 text-neutral-300">
                  <CheckCircle size={16} weight="fill" aria-hidden className="text-neutral-300" />
                </span>
                <p className="text-sm leading-relaxed text-neutral-600">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Outcomes / features ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-24">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          How Amenity helps
        </p>
        <h2 className="mb-12 max-w-md font-display text-3xl font-semibold text-neutral-900">
          Built for {uc.label.toLowerCase()}.
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {uc.outcomes.map(({ title, body }) => (
            <div key={title} className="rounded-xl border border-neutral-100 p-6">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">{title}</h3>
              <p className="text-sm leading-relaxed text-neutral-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────────── */}
      <section className="bg-ink">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-paper md:text-3xl">
                {uc.cta.label}
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                No long setup. Start in minutes.
              </p>
            </div>
            <Link
              href={uc.cta.href}
              className="inline-flex items-center gap-2 rounded-lg bg-paper px-6 py-3 text-sm font-medium text-ink transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Get started
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Products in use ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Products used
        </p>
        <h2 className="mb-8 font-display text-2xl font-semibold text-neutral-900">
          The Amenity suite for {uc.label.toLowerCase()}.
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {uc.products.map((p) => {
            const meta = PRODUCT_META[p];
            return (
              <Link
                key={p}
                href={meta.href}
                className="group flex flex-col gap-3 rounded-2xl border border-neutral-100 p-5 transition-colors hover:border-neutral-200 hover:bg-neutral-50"
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${meta.accent}`}>
                  <meta.Icon size={16} weight="fill" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 group-hover:text-ink">{meta.label}</p>
                  <p className="text-xs text-neutral-400">{meta.sub}</p>
                </div>
                <p className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 group-hover:text-ink">
                  Learn more <ArrowRight size={11} weight="bold" aria-hidden />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Related use cases ───────────────────────────────────────────────── */}
      {relatedUseCases.length > 0 && (
        <section className="border-t border-neutral-100 bg-neutral-50">
          <div className="mx-auto max-w-[1200px] px-6 py-14 sm:px-0">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Related use cases
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {relatedUseCases.slice(0, 3).map((related) => (
                <Link
                  key={related.slug}
                  href={`/use-cases/${related.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-800 group-hover:text-ink">{related.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">{related.sub}</p>
                  </div>
                  <ArrowRight size={14} weight="bold" className="flex-shrink-0 text-neutral-300 group-hover:text-ink" aria-hidden />
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/use-cases"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-ink"
              >
                See all use cases
                <ArrowRight size={13} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

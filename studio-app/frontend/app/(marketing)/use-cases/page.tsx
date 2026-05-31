import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { USE_CASE_CATEGORIES } from "@/lib/useCases";

export const metadata: Metadata = {
  title: "Use Cases — Amenity",
  description:
    "See how fashion brands, CPG companies, design studios, and product teams use Amenity to source, catalog, and launch products.",
};

export default function UseCasesPage() {
  return (
    <div className="bg-white">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-16 sm:px-0 md:pt-20">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Use Cases
        </p>
        <h1 className="font-display max-w-2xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          Built for every kind<br />of product brand.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-neutral-500">
          From DTC apparel founders to enterprise sourcing teams, Amenity adapts to
          how you build and manage products. Find your use case below.
        </p>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24 sm:px-0">
        <div className="flex flex-col gap-16">
          {USE_CASE_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <h2 className="mb-6 border-b border-neutral-100 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {cat.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cat.useCases.map((uc) => (
                  <Link
                    key={uc.slug}
                    href={`/use-cases/${uc.slug}`}
                    className="group flex flex-col justify-between gap-4 rounded-xl border border-neutral-100 p-5 transition-colors hover:border-neutral-200 hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 group-hover:text-ink">
                        {uc.label}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 line-clamp-2">
                        {uc.hero}
                      </p>
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400 group-hover:text-ink">
                      Learn more
                      <ArrowRight size={11} weight="bold" aria-hidden />
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-ink">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-paper md:text-3xl">
                Don&apos;t see your use case?
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                Amenity works for any product brand. Start with a sourcing brief and see for yourself.
              </p>
            </div>
            <Link
              href="/sourcing"
              className="inline-flex items-center gap-2 rounded-lg bg-paper px-6 py-3 text-sm font-medium text-ink transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Try Liai free
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

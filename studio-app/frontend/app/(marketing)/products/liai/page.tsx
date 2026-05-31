import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkle,
  ArrowRight,
  ChatCircleText,
  ListBullets,
  SealCheck,
  Storefront,
  MapPin,
  Clock,
  Factory,
  ShieldCheck,
} from "@phosphor-icons/react/ssr";

export const metadata: Metadata = {
  title: "Liai — AI Sourcing Agent",
  description:
    "Describe what you need. Liai searches our verified manufacturer network and returns a ranked shortlist — no cold emails, no dead ends.",
};

// ─── Feature grid ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon:  ChatCircleText,
    title: "Plain-English briefs",
    body:  "No drop-downs, no filters. Describe your product — material, quantity, lead time — just like you'd tell a friend.",
  },
  {
    Icon:  ListBullets,
    title: "Ranked shortlists",
    body:  "Liai scores every manufacturer for fit and returns a prioritized list, not a haystack. Top match is always first.",
  },
  {
    Icon:  SealCheck,
    title: "Verified network",
    body:  "Every manufacturer in our network has been reviewed for certifications, capabilities, and reliability before appearing in results.",
  },
  {
    Icon:  MapPin,
    title: "Country & region filtering",
    body:  "Narrow by geography, trade bloc, or proximity to your market — built into every search automatically.",
  },
  {
    Icon:  Clock,
    title: "Lead time aware",
    body:  "Liai understands your timeline. Tell it when you need samples and it surfaces manufacturers who can deliver.",
  },
  {
    Icon:  Factory,
    title: "Capability matching",
    body:  "Cut & sew, embroidery, sustainable fabrics, custom hardware — Liai matches your product's exact technical requirements.",
  },
  {
    Icon:  ShieldCheck,
    title: "Berry & TAA compliance",
    body:  "Federal procurement requires it. Liai filters by Berry Amendment, TAA, and Buy American compliance automatically — so government agencies only see eligible suppliers.",
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Describe your product",
    body:  "Tell Liai what you're building — category, materials, quantity, certifications, and any special requirements. No forms, just a message.",
  },
  {
    n: "02",
    title: "Liai searches the network",
    body:  "Liai embeds your brief and runs a semantic search across our verified manufacturer database, weighing capabilities, location, MOQ, and lead time.",
  },
  {
    n: "03",
    title: "Review your shortlist",
    body:  "You receive a ranked list of matched manufacturers with capability summaries and fit scores. Ask follow-up questions, then reach out.",
  },
];

export default function LiaiPage() {
  return (
    <div className="bg-white">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-100">
        <div className="mx-auto max-w-[1200px] px-6 py-3 text-xs text-neutral-400 sm:px-0">
          <span>Products</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-neutral-700">Liai</span>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-20 pt-16 sm:px-0 md:pt-24">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
            <Sparkle size={13} weight="fill" aria-hidden />
            AI Sourcing Agent
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
            Find the right<br />manufacturer.<br />
            <span className="text-neutral-400">In one brief.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-500">
            Describe what you need in plain English. Liai searches our verified network and
            returns a ranked shortlist of manufacturers matched to your exact specifications —
            no cold emails, no dead ends.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-400">
            {["Fashion brands", "Government agencies", "Uniform suppliers", "Wholesale buyers"].map((label) => (
              <span key={label} className="rounded-full border border-neutral-200 px-3 py-1">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sourcing"
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start a brief
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              Browse blanks instead
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="border-y border-neutral-100 bg-neutral-50">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
          <p className="mb-12 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            How it works
          </p>
          <div className="grid gap-8 md:grid-cols-3 md:gap-12">
            {STEPS.map(({ n, title, body }) => (
              <div key={n}>
                <p className="font-display text-4xl font-light text-neutral-200">{n}</p>
                <h3 className="mt-3 text-base font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-24">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Built for product brands
        </p>
        <h2 className="mb-12 max-w-md font-display text-3xl font-semibold text-neutral-900">
          Everything a sourcing brief needs.
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-neutral-100 p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Icon size={17} weight="fill" className="text-violet-600" aria-hidden />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-neutral-900">{title}</h3>
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
                Ready to find your manufacturer?
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                No account required. Just describe what you're building.
              </p>
            </div>
            <Link
              href="/sourcing"
              className="inline-flex items-center gap-2 rounded-lg bg-paper px-6 py-3 text-sm font-medium text-ink transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Try Liai now
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Cross-sell: Shop ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Also from Amenity
        </p>
        <h2 className="mb-8 font-display text-2xl font-semibold text-neutral-900">
          Need blanks now?
        </h2>
        <div className="flex flex-col justify-between gap-6 rounded-2xl border border-neutral-100 p-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
              <Storefront size={12} weight="fill" aria-hidden />
              Blanks · Wholesale Shop
            </div>
            <p className="text-sm leading-relaxed text-neutral-600">
              Browse our curated catalog of blank apparel, ready to order wholesale — no brief required.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex flex-shrink-0 items-center gap-1.5 text-sm font-medium text-neutral-800 transition-colors hover:text-ink"
          >
            Shop Blanks
            <ArrowRight size={13} weight="bold" aria-hidden />
          </Link>
        </div>
      </section>

    </div>
  );
}

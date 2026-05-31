import type { Metadata } from "next";
import Link from "next/link";
import {
  Lock,
  Factory,
  SealCheck,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Sparkle,
  CheckCircle,
} from "@phosphor-icons/react/ssr";

export const metadata: Metadata = {
  title: "Manufacturer Network — Amenity",
  description:
    "Access Amenity's verified network of apparel, footwear, and uniform manufacturers — filtered for compliance, capability, and capacity.",
};

// ─── Blurred ghost cards ──────────────────────────────────────────────────────
const GHOST_CARDS = [
  { swatch: "bg-stone-200",   initials: "HM", location: "Los Angeles, CA",   domestic: true,  berry: true,  taa: false, cat: "Cut & Sew" },
  { swatch: "bg-violet-100",  initials: "SR", location: "New York, NY",       domestic: true,  berry: false, taa: true,  cat: "Uniforms" },
  { swatch: "bg-amber-100",   initials: "PG", location: "Guangzhou, China",   domestic: false, berry: false, taa: false, cat: "Footwear" },
  { swatch: "bg-emerald-100", initials: "TF", location: "Dallas, TX",         domestic: true,  berry: true,  taa: true,  cat: "Apparel" },
  { swatch: "bg-sky-100",     initials: "AL", location: "Portland, OR",       domestic: true,  berry: false, taa: false, cat: "Activewear" },
  { swatch: "bg-rose-100",    initials: "NW", location: "Ho Chi Minh, VN",    domestic: false, berry: false, taa: true,  cat: "Textiles" },
];

// ─── Plan benefits ────────────────────────────────────────────────────────────
const BENEFITS = [
  "Full manufacturer profiles — capabilities, MOQ, lead times, certifications",
  "Domestic-only and Berry/TAA/Buy American filters for federal procurement",
  "Direct contact details and website access",
  "AI-powered sourcing via Liai — describe your spec, get a ranked shortlist",
  "Orders and invoicing in one place",
  "Unlimited sourcing briefs",
];

export default function ManufacturersGatePage() {
  return (
    <div className="bg-white">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-10 pt-16 sm:px-0 md:pt-24">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-20">

          {/* Left: pitch */}
          <div className="max-w-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
              <Lock size={12} weight="fill" aria-hidden />
              Subscription required
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              The verified<br />manufacturer<br />
              <span className="text-neutral-400">network.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-neutral-500">
              Amenity subscribers get access to our curated directory of apparel, footwear,
              and uniform manufacturers — pre-screened for quality, compliance, and capacity.
              Filter by Berry Amendment, TAA, domestic sourcing, and more.
            </p>

            {/* Benefits */}
            <ul className="mt-6 flex flex-col gap-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-neutral-600">
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 flex-shrink-0 text-emerald-500"
                    aria-hidden
                  />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign in to access
                <ArrowRight size={14} weight="bold" aria-hidden />
              </Link>
              <Link
                href="/sourcing"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <Sparkle size={13} weight="fill" aria-hidden />
                Try Liai free
              </Link>
            </div>
          </div>

          {/* Right: blurred ghost grid */}
          <div className="relative flex-1">
            <div className="pointer-events-none grid gap-3 sm:grid-cols-2 select-none">
              {GHOST_CARDS.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-4 blur-[3px] opacity-70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold text-ink/70 ${c.swatch}`}>
                        {c.initials}
                      </div>
                      <div>
                        <div className="h-3 w-28 rounded bg-neutral-200" />
                        <div className="mt-1.5 flex items-center gap-1">
                          <MapPin size={9} weight="regular" aria-hidden className="text-neutral-400" />
                          <span className="text-[10px] text-neutral-400">{c.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {c.domestic && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700">Domestic</span>}
                      {c.berry   && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-medium text-violet-700">Berry</span>}
                      {c.taa     && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-medium text-sky-700">TAA</span>}
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{c.cat}</div>
                  <div className="h-2.5 w-full rounded bg-neutral-100" />
                  <div className="h-2.5 w-3/4 rounded bg-neutral-100" />
                  <div className="flex gap-1">
                    {["", "", ""].map((_, j) => (
                      <div key={j} className="h-5 w-14 rounded-full bg-neutral-100" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
              <div className="rounded-2xl border border-neutral-200 bg-white/90 px-8 py-7 text-center shadow-lg backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
                  <Lock size={20} weight="fill" className="text-neutral-500" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-neutral-800">
                  Subscribers only
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Sign in or subscribe to browse<br />the full manufacturer network.
                </p>
                <Link
                  href="/sign-in"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-all hover:bg-neutral-800"
                >
                  Get access
                  <ArrowRight size={13} weight="bold" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────────── */}
      <section className="border-y border-neutral-100 bg-neutral-50">
        <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-0">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <Factory size={16} weight="fill" className="text-emerald-600" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">Verified network</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Every manufacturer is reviewed for capabilities, certifications, and reliability before joining.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50">
                <ShieldCheck size={16} weight="fill" className="text-violet-600" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">Compliance-ready</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Filter by Berry Amendment, TAA, Buy American, and domestic sourcing — built into every search.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sky-50">
                <SealCheck size={16} weight="fill" className="text-sky-600" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">Apparel &amp; footwear</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Cut &amp; sew, embroidery, uniforms, footwear, activewear, outerwear — all categories covered.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-ink">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-paper md:text-3xl">
                Ready to find your manufacturer?
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                Sign in to browse the full network, or start a free brief with Liai.
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg bg-paper px-6 py-3 text-sm font-medium text-ink transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              >
                Sign in
                <ArrowRight size={14} weight="bold" aria-hidden />
              </Link>
              <Link
                href="/sourcing"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-paper whitespace-nowrap"
              >
                <Sparkle size={13} weight="fill" aria-hidden />
                Try Liai free
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

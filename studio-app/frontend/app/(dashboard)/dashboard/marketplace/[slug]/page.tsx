"use client";

/**
 * /dashboard/marketplace/[slug] — authenticated manufacturer profile
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Factory,
  Clock,
  Certificate,
  Globe,
  Envelope,
  Sparkle,
  SealCheck,
  ShieldCheck,
  Tag,
  ListBullets,
  Buildings,
} from "@phosphor-icons/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Manufacturer {
  id: string;
  name: string;
  slug: string | null;
  role: string | null;
  category: string | null;
  specialty: string | null;
  capabilities: string[] | null;
  certifications: string[] | null;
  brands: string[] | null;
  moq: number | null;
  lead_time_weeks: number | null;
  location: string | null;
  domestic: boolean | null;
  website: string | null;
  contact_email: string | null;
}

const SWATCHES = [
  "bg-stone-200", "bg-amber-100", "bg-zinc-200", "bg-neutral-200",
  "bg-emerald-100", "bg-stone-300", "bg-amber-50", "bg-sky-100",
  "bg-violet-100", "bg-rose-100",
];

const CERT_LABELS: Record<string, string> = {
  berry_compliant: "Berry Amendment",
  taa: "TAA Compliant",
  wrap: "WRAP Certified",
  sa8000: "SA8000",
  oeko_tex: "OEKO-TEX",
  iso_9001: "ISO 9001",
  gots: "GOTS",
  bluesign: "bluesign®",
  fair_trade: "Fair Trade",
  buy_american: "Buy American",
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
function swatch(name: string) {
  return SWATCHES[(name.charCodeAt(0) + name.length) % SWATCHES.length];
}
function certLabel(cert: string) {
  return CERT_LABELS[cert] ?? cert.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardManufacturerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [mfr, setMfr] = useState<Manufacturer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/manufacturers/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((json) => { if (json) setMfr(json); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
        <div className="mt-8 flex gap-5">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="flex flex-col gap-3">
            <div className="h-6 w-60 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-neutral-100" />)}
        </div>
      </div>
    );
  }

  if (notFound || !mfr) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
        <Factory size={40} weight="thin" className="text-neutral-300" />
        <p className="text-sm font-medium text-neutral-700">Manufacturer not found</p>
        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-ink">
          <ArrowLeft size={13} weight="bold" aria-hidden />
          Back to marketplace
        </Link>
      </div>
    );
  }

  const berryCompliant = (mfr.certifications ?? []).includes("berry_compliant");
  const taaCompliant   = (mfr.certifications ?? []).includes("taa");
  const buyAmerican    = (mfr.certifications ?? []).includes("buy_american");
  const isGovCompliant = berryCompliant || taaCompliant || buyAmerican;

  const briefHref = `/sourcing?brief=${encodeURIComponent(
    `I'm looking for manufacturers similar to ${mfr.name}. They specialize in ${mfr.specialty ?? mfr.category ?? "apparel"}. Can you find me comparable options?`
  )}`;

  return (
    <div className="flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/marketplace"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-800"
            >
              <ArrowLeft size={12} weight="bold" aria-hidden />
              Marketplace
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-medium text-neutral-700">{mfr.name}</span>
          </div>

          <div className="flex items-center gap-3">
            {mfr.website && (
              <a
                href={mfr.website.startsWith("http") ? mfr.website : `https://${mfr.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400"
              >
                <Globe size={12} weight="regular" aria-hidden />
                Website
              </a>
            )}
            <Link
              href={briefHref}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-1.5 text-xs font-medium text-paper transition-all hover:bg-neutral-800"
            >
              <Sparkle size={11} weight="fill" aria-hidden />
              Brief Liai about this
            </Link>
          </div>
        </div>
      </div>

      {/* ── Profile header ──────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-6">
        <div className="flex items-start gap-5">
          <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-ink/70 ${swatch(mfr.name)}`}>
            {initials(mfr.name)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{mfr.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {mfr.location && (
                <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500">
                  <MapPin size={12} weight="regular" aria-hidden />
                  {mfr.location}
                </span>
              )}
              {(mfr.category || mfr.role) && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {[mfr.category, mfr.role].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mfr.domestic && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <SealCheck size={11} weight="fill" aria-hidden />
                  Domestic
                </span>
              )}
              {berryCompliant && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                  <ShieldCheck size={11} weight="fill" aria-hidden />
                  Berry Amendment
                </span>
              )}
              {taaCompliant && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  <ShieldCheck size={11} weight="fill" aria-hidden />
                  TAA Compliant
                </span>
              )}
              {buyAmerican && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <ShieldCheck size={11} weight="fill" aria-hidden />
                  Buy American
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left 2/3 */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {mfr.specialty && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Overview</p>
                <p className="text-sm leading-relaxed text-neutral-700">{mfr.specialty}</p>
              </div>
            )}

            {(mfr.capabilities ?? []).length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ListBullets size={14} weight="regular" className="text-neutral-400" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Capabilities</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(mfr.capabilities ?? []).map((c) => (
                    <span key={c} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {(mfr.certifications ?? []).length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Certificate size={14} weight="regular" className="text-neutral-400" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Certifications & Compliance</p>
                </div>
                {isGovCompliant && (
                  <div className="mb-4 rounded-lg bg-violet-50 px-4 py-3">
                    <p className="text-xs font-medium text-violet-800">
                      Federal procurement eligible — meets Berry Amendment, TAA, and/or Buy American requirements.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(mfr.certifications ?? []).map((c) => (
                    <span
                      key={c}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        c === "berry_compliant" ? "border-violet-200 bg-violet-50 text-violet-700"
                        : c === "taa"           ? "border-sky-200 bg-sky-50 text-sky-700"
                        : c === "buy_american"  ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-neutral-200 text-neutral-600"
                      }`}
                    >
                      <SealCheck size={10} weight="fill" aria-hidden />
                      {certLabel(c)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(mfr.brands ?? []).length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Tag size={14} weight="regular" className="text-neutral-400" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Works With</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(mfr.brands ?? []).map((b) => (
                    <span key={b} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600">{b}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 1/3 */}
          <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">At a glance</p>
              <dl className="flex flex-col gap-3">
                {mfr.location && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Location</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-700">
                      <MapPin size={12} weight="regular" className="text-neutral-400" aria-hidden />
                      {mfr.location}
                    </dd>
                  </div>
                )}
                {mfr.category && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Category</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-700">
                      <Factory size={12} weight="regular" className="text-neutral-400" aria-hidden />
                      {mfr.category}
                    </dd>
                  </div>
                )}
                {mfr.moq != null && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Minimum Order (MOQ)</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-700">
                      <Buildings size={12} weight="regular" className="text-neutral-400" aria-hidden />
                      {mfr.moq.toLocaleString()} units
                    </dd>
                  </div>
                )}
                {mfr.lead_time_weeks != null && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Typical Lead Time</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-700">
                      <Clock size={12} weight="regular" className="text-neutral-400" aria-hidden />
                      {mfr.lead_time_weeks} weeks
                    </dd>
                  </div>
                )}
                {mfr.domestic !== null && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Sourcing</dt>
                    <dd className="mt-0.5 text-sm text-neutral-700">{mfr.domestic ? "Domestic (USA)" : "International"}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contact */}
            {(mfr.contact_email || mfr.website) && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Contact</p>
                <div className="flex flex-col gap-2.5">
                  {mfr.contact_email && (
                    <a
                      href={`mailto:${mfr.contact_email}`}
                      className="inline-flex items-center gap-2 text-sm text-neutral-700 transition-colors hover:text-ink"
                    >
                      <Envelope size={13} weight="regular" className="text-neutral-400" aria-hidden />
                      {mfr.contact_email}
                    </a>
                  )}
                  {mfr.website && (
                    <a
                      href={mfr.website.startsWith("http") ? mfr.website : `https://${mfr.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-neutral-700 transition-colors hover:text-ink"
                    >
                      <Globe size={13} weight="regular" className="text-neutral-400" aria-hidden />
                      {mfr.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Liai CTA */}
            <div className="rounded-xl bg-ink p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Find similar</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                Ask Liai to find manufacturers with the same capabilities and certifications as {mfr.name}.
              </p>
              <Link
                href={briefHref}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-paper px-4 py-2 text-xs font-medium text-ink transition-all hover:bg-neutral-100"
              >
                <Sparkle size={11} weight="fill" aria-hidden />
                Brief Liai
                <ArrowRight size={11} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * /dashboard/marketplace — authenticated manufacturer directory
 *
 * Mirrors the public /manufacturers design but lives behind auth.
 * Full details are unlocked: contact info, website, MOQ, certifications.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlass,
  MapPin,
  Factory,
  Clock,
  Certificate,
  ArrowRight,
  Sparkle,
  SealCheck,
  ShieldCheck,
  X,
  Funnel,
} from "@phosphor-icons/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CERT_FILTERS = [
  { id: "berry_compliant", label: "Berry" },
  { id: "taa",             label: "TAA"   },
  { id: "wrap",            label: "WRAP"  },
  { id: "sa8000",          label: "SA8000"},
  { id: "oeko_tex",        label: "OEKO-TEX" },
];

const CATEGORY_OPTIONS = [
  "Apparel", "Footwear", "Accessories", "Textiles",
  "Outerwear", "Activewear", "Uniforms", "Specialty",
];

const SWATCHES = [
  "bg-stone-200", "bg-amber-100", "bg-zinc-200", "bg-neutral-200",
  "bg-emerald-100", "bg-stone-300", "bg-amber-50", "bg-sky-100",
  "bg-violet-100", "bg-rose-100",
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
function swatch(name: string) {
  return SWATCHES[(name.charCodeAt(0) + name.length) % SWATCHES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardMarketplacePage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [domestic, setDomestic]       = useState<boolean | null>(null);
  const [cert, setCert]               = useState<string | null>(null);
  const [category, setCategory]       = useState<string | null>(null);
  const [viewMode, setViewMode]       = useState<"grid" | "list">("grid");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearch(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 300);
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (domestic !== null) params.set("domestic", String(domestic));
    if (cert) params.set("cert", cert);
    if (category) params.set("category", category);
    params.set("limit", "100");

    fetch(`${API}/manufacturers?${params}`)
      .then((r) => (r.ok ? r.json() : { manufacturers: [] }))
      .then((json) => setManufacturers(json.manufacturers ?? []))
      .catch(() => setManufacturers([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, domestic, cert, category]);

  const activeFilterCount = (domestic !== null ? 1 : 0) + (cert ? 1 : 0) + (category ? 1 : 0);

  function clearFilters() {
    setDomestic(null);
    setCert(null);
    setCategory(null);
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">Marketplace</h1>
            <p className="text-xs text-neutral-500">Browse and brief verified manufacturers</p>
          </div>
          <Link
            href="/sourcing"
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-paper transition-all hover:bg-neutral-800"
          >
            <Sparkle size={12} weight="fill" aria-hidden />
            Brief Liai
          </Link>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <MagnifyingGlass
              size={13}
              weight="regular"
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search manufacturers…"
              className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Funnel size={13} className="text-neutral-400" aria-hidden />

            <button
              type="button"
              onClick={() => setDomestic(domestic === true ? null : true)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                domestic === true
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              Domestic
            </button>

            {CERT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCert(cert === f.id ? null : f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  cert === f.id
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {f.label}
              </button>
            ))}

            <select
              value={category ?? ""}
              onChange={(e) => setCategory(e.target.value || null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium outline-none transition ${
                category
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 transition hover:border-neutral-400"
              >
                <X size={10} weight="bold" aria-hidden />
                Clear {activeFilterCount}
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5">
            {(["grid", "list"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === m ? "bg-neutral-100 text-neutral-800" : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {m === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`animate-pulse rounded-xl bg-neutral-100 ${viewMode === "grid" ? "h-52" : "h-16"}`} />
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Factory size={40} weight="thin" className="text-neutral-300" />
            <div>
              <p className="text-sm font-medium text-neutral-700">No manufacturers found</p>
              <p className="mt-1 text-sm text-neutral-400">
                {activeFilterCount > 0 || debouncedSearch
                  ? "Try removing some filters or broadening your search."
                  : "The manufacturer network loads here once data is seeded."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-neutral-400">
              {manufacturers.length} manufacturer{manufacturers.length !== 1 ? "s" : ""}
              {activeFilterCount > 0 || debouncedSearch ? " matching your filters" : " in the network"}
            </p>

            {viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {manufacturers.map((m) => <ManufacturerCard key={m.id} m={m} />)}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {manufacturers.map((m) => <ManufacturerRow key={m.id} m={m} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid card
// ─────────────────────────────────────────────────────────────────────────────

function ManufacturerCard({ m }: { m: Manufacturer }) {
  const caps  = (m.capabilities  ?? []).slice(0, 4);
  const berryCompliant = (m.certifications ?? []).includes("berry_compliant");
  const taaCompliant   = (m.certifications ?? []).includes("taa");
  const profileHref    = `/dashboard/marketplace/${m.slug ?? m.id}`;

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={profileHref}>
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-ink/70 ${swatch(m.name)}`}>
                {initials(m.name)}
              </div>
            </Link>
            <div>
              <Link href={profileHref} className="text-sm font-semibold text-neutral-900 hover:text-ink transition-colors">
                {m.name}
              </Link>
              {m.location && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-neutral-400">
                  <MapPin size={10} weight="regular" aria-hidden />
                  {m.location}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {m.domestic && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Domestic</span>}
            {berryCompliant && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">Berry</span>}
            {taaCompliant   && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">TAA</span>}
          </div>
        </div>

        {(m.category || m.role) && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {[m.category, m.role].filter(Boolean).join(" · ")}
          </p>
        )}

        {m.specialty && (
          <p className="text-[12px] leading-snug text-neutral-600 line-clamp-2">{m.specialty}</p>
        )}

        {caps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {caps.map((c) => (
              <span key={c} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">{c}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          {m.moq != null && (
            <span className="inline-flex items-center gap-1">
              <Factory size={11} weight="regular" aria-hidden />
              MOQ {m.moq.toLocaleString()}
            </span>
          )}
          {m.lead_time_weeks != null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} weight="regular" aria-hidden />
              {m.lead_time_weeks}w
            </span>
          )}
        </div>
        <Link
          href={profileHref}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 transition-colors hover:text-ink"
        >
          View profile
          <ArrowRight size={10} weight="bold" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List row
// ─────────────────────────────────────────────────────────────────────────────

function ManufacturerRow({ m }: { m: Manufacturer }) {
  const berryCompliant = (m.certifications ?? []).includes("berry_compliant");
  const taaCompliant   = (m.certifications ?? []).includes("taa");
  const profileHref    = `/dashboard/marketplace/${m.slug ?? m.id}`;

  return (
    <Link
      href={profileHref}
      className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-ink/70 ${swatch(m.name)}`}>
          {initials(m.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{m.name}</p>
          <p className="text-[11px] text-neutral-400">{[m.category, m.location].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        {m.domestic      && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Domestic</span>}
        {berryCompliant  && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">Berry</span>}
        {taaCompliant    && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">TAA</span>}
      </div>

      <div className="hidden items-center gap-4 text-xs text-neutral-400 md:flex">
        {m.moq != null && <span>MOQ {m.moq.toLocaleString()}</span>}
        {m.lead_time_weeks != null && <span>{m.lead_time_weeks}w lead</span>}
      </div>

      <ArrowRight size={14} weight="bold" className="flex-shrink-0 text-neutral-300" aria-hidden />
    </Link>
  );
}

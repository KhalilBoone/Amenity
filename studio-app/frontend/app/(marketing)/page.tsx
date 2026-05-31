"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkle,
  Paperclip,
  Storefront,
  MapPin,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

type Role = "user" | "agent";

interface AgentMatch {
  name:       string;
  location:   string;
  capability: string;
  score:      number;
}

interface AgentReply {
  body:     string;
  matches?: AgentMatch[];
  cta?:     { label: string; href: string };
}

interface Message {
  id:       string;
  role:     Role;
  body:     string;
  matches?: AgentMatch[];
  cta?:     { label: string; href: string };
}

interface ManufacturerRow {
  id:             string;
  name:           string;
  category:       string | null;
  specialty:      string | null;
  capabilities:   string[] | null;
  location:       string | null;
  domestic:       boolean | null;
  certifications: string[] | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK CHAT SCRIPT
───────────────────────────────────────────────────────────────────────────── */

const SCRIPT: AgentReply[] = [
  {
    body: "Got it. Based on what you've described I'd start with these three. Each is currently accepting new briefs and matches your capability fit:",
    matches: [
      { name: "Mercer Cut & Sew",      location: "Los Angeles, CA",  capability: "Heavyweight knits · MOQ 100", score: 0.94 },
      { name: "Atlas Knitwear",        location: "Toronto, ON",      capability: "French terry · MOQ 250",      score: 0.89 },
      { name: "House of Hudson",       location: "Brooklyn, NY",     capability: "Cut & sew · MOQ 150",         score: 0.86 },
    ],
  },
  {
    body: "Tightening the filter to domestic + Berry-compliant. These three rank highest on capability fit and lead time:",
    matches: [
      { name: "Liberty Mills",         location: "Greensboro, NC",   capability: "Berry-compliant fleece · MOQ 500", score: 0.92 },
      { name: "Patriot Apparel Co.",   location: "Fall River, MA",   capability: "TAA + Berry · MOQ 300",            score: 0.88 },
      { name: "Heartland Stitchworks", location: "Cedar Rapids, IA", capability: "Domestic cut & sew · MOQ 250",     score: 0.84 },
    ],
  },
  {
    body: "For sub-100 MOQ runs you'll want decorators, not full-package factories. Top three:",
    matches: [
      { name: "North Loop Print",      location: "Minneapolis, MN",  capability: "Screen print · MOQ 12", score: 0.91 },
      { name: "Foundry Embroidery",    location: "Austin, TX",       capability: "Embroidery · MOQ 24",   score: 0.87 },
      { name: "Marin DTG",             location: "Oakland, CA",      capability: "DTG · MOQ 1",           score: 0.83 },
    ],
  },
];

const SUGGESTED_PROMPTS = [
  "Heavyweight French terry hoodies, 500 units, domestic.",
  "Sneakers made in Portugal, leather upper, MOQ 200.",
  "Selvedge denim jeans, 14 oz, small batch run.",
  "Berry-compliant fleece for federal contract.",
  "Embroidery decorator, MOQ under 50.",
];

const BRANDS = [
  "Nike", "Carhartt", "Champion", "Patagonia", "Arc'teryx",
  "Levi's", "Hanes", "Vans", "Dickies", "New Balance",
  "Columbia", "Under Armour", "Filson", "Outerknown", "Outdoor Voices",
];

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <main>
      <ChatSection />
      <ProductsOverview />
      <FeaturedManufacturers />
      <HowItWorks />
      <DarkCta />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HERO / CHAT SECTION
───────────────────────────────────────────────────────────────────────────── */

function ChatSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
      <div className="flex flex-col items-center text-center">
        <Link
          href="/products/liai"
          className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
        >
          <Sparkle size={12} weight="fill" aria-hidden />
          Meet Liai
        </Link>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Find the perfect<br />manufacturing partner.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
          Describe your spec — fabric, capabilities, MOQ, certifications,
          timeline — and Liai returns a ranked shortlist of vetted manufacturers,
          mills, and decorators.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-neutral-400">
          {["Fashion brands", "Government agencies", "Uniform suppliers", "Wholesale buyers", "DTC founders"].map((label) => (
            <span key={label} className="rounded-full border border-neutral-200 px-3 py-1">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <Chat />
        <p className="mt-3 text-center text-xs text-neutral-400">
          Try it free — no credit card required
        </p>
      </div>

      <BrandCarousel />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CHAT WIDGET
───────────────────────────────────────────────────────────────────────────── */

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [thinking, setThinking] = useState(false);
  const [step,     setStep]     = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef   = useRef<HTMLInputElement | null>(null);

  // Typewriter state
  const [displayText,  setDisplayText]  = useState("");
  const [promptIdx,    setPromptIdx]    = useState(0);
  const [charIdx,      setCharIdx]      = useState(0);
  const [isDeleting,   setIsDeleting]   = useState(false);

  const hasMessages = messages.length > 0 || thinking;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  // Typewriter effect
  useEffect(() => {
    if (input) return;
    const prompt = SUGGESTED_PROMPTS[promptIdx];
    if (!isDeleting) {
      if (charIdx < prompt.length) {
        const t = window.setTimeout(() => {
          setDisplayText(prompt.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, 48);
        return () => window.clearTimeout(t);
      } else {
        const t = window.setTimeout(() => setIsDeleting(true), 2000);
        return () => window.clearTimeout(t);
      }
    } else {
      if (charIdx > 0) {
        const t = window.setTimeout(() => {
          setDisplayText(prompt.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        }, 24);
        return () => window.clearTimeout(t);
      } else {
        setIsDeleting(false);
        setPromptIdx((i) => (i + 1) % SUGGESTED_PROMPTS.length);
      }
    }
  }, [charIdx, isDeleting, promptIdx, input]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", body: trimmed }]);
    setInput("");
    setThinking(true);
    const reply = SCRIPT[step % SCRIPT.length];
    setStep((s) => s + 1);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `agent-${Date.now()}`, role: "agent", body: reply.body, matches: reply.matches, cta: reply.cta },
      ]);
      setThinking(false);
    }, 900);
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); send(input); }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {hasMessages && (
        <div
          ref={scrollRef}
          className="flex flex-col gap-4 overflow-y-auto px-5 py-5"
          style={{ maxHeight: 340, minHeight: 120 }}
          aria-live="polite"
        >
          {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
          {thinking && <TypingBubble />}
        </div>
      )}

      <form onSubmit={handleSubmit} className={hasMessages ? "border-t border-neutral-100" : ""}>
        <div className="relative px-5 pb-2 pt-4" style={{ minHeight: 72 }}>
          <input
            ref={fileRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            multiple
            className="hidden"
            aria-label="Attach files"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={thinking}
            rows={3}
            placeholder=" "
            className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-neutral-400 disabled:opacity-50"
          />
          {!input && (
            <span className="pointer-events-none absolute left-5 top-4 text-sm text-neutral-400">
              {displayText}
              <span className="animate-cursor ml-[1px] font-light">|</span>
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={() => (fileRef.current as HTMLInputElement | null)?.click()}
            className="text-neutral-400 transition hover:text-neutral-600"
            aria-label="Attach image or file"
          >
            <Paperclip size={16} weight="regular" aria-hidden />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 transition-all duration-200 hover:bg-neutral-200 disabled:opacity-40 [&:not(:disabled)]:bg-ink [&:not(:disabled)]:text-paper [&:not(:disabled)]:hover:bg-neutral-800"
            aria-label="Send"
          >
            <ArrowRight size={14} weight="bold" aria-hidden className="-rotate-45" />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] flex-col gap-3 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            <Sparkle size={10} weight="fill" aria-hidden /> Liai
          </span>
        )}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-ink text-paper" : "bg-neutral-50 text-neutral-800"}`}>
          {message.body}
        </div>
        {message.matches && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
            {message.matches.map((m) => (
              <div key={m.name} className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-400">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold leading-tight">{m.name}</p>
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    {(m.score * 100).toFixed(0)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">{m.location}</p>
                <p className="text-[11px] leading-snug text-neutral-700">{m.capability}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          <Sparkle size={10} weight="fill" aria-hidden /> Liai
        </span>
        <div className="rounded-2xl bg-neutral-50 px-4 py-3">
          <span className="inline-flex items-center gap-1">
            <Dot delay="0ms" /><Dot delay="120ms" /><Dot delay="240ms" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"
      style={{ animationDelay: delay, animationDuration: "1.2s" }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BRAND CAROUSEL
───────────────────────────────────────────────────────────────────────────── */

function BrandCarousel() {
  const doubled = [...BRANDS, ...BRANDS];
  return (
    <div className="mt-20">
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
        Trusted by your favorite brands
      </p>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
        <div className="flex animate-marquee-left gap-10 whitespace-nowrap">
          {doubled.map((brand, i) => (
            <span key={i} className="inline-flex select-none items-center gap-2 text-sm font-semibold tracking-wide text-neutral-300">
              <span className="h-1 w-1 rounded-full bg-neutral-200" />
              {brand}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCTS OVERVIEW — 3-column product cards
───────────────────────────────────────────────────────────────────────────── */

const PRODUCTS = [
  {
    href:   "/products/liai",
    label:  "Liai",
    sub:    "AI Sourcing Agent",
    blurb:  "Describe what you need. Liai searches our verified manufacturer network and returns a ranked shortlist — no cold emails, no dead ends.",
    Icon:   Sparkle,
    accent: "bg-violet-50 text-violet-600",
    cta:    "Meet Liai",
  },
  {
    href:   "/shop",
    label:  "Blanks Shop",
    sub:    "Wholesale E-Commerce",
    blurb:  "Browse in-stock blanks and wholesale basics. Add to cart, configure quantities, and ship — catalog managed automatically in the background.",
    Icon:   Storefront,
    accent: "bg-emerald-50 text-emerald-600",
    cta:    "Browse the shop",
  },
] as const;

function ProductsOverview() {
  return (
    <section className="border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          The Amenity suite
        </p>
        <h2 className="mb-10 max-w-md font-display text-3xl font-semibold tracking-tight text-neutral-900">
          Source it. Sell it.
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {PRODUCTS.map(({ href, label, sub, blurb, Icon, accent, cta }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col justify-between gap-6 rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-300 hover:shadow-sm"
            >
              <div>
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                  <Icon size={18} weight="fill" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-neutral-900">{label}</p>
                <p className="mb-3 text-xs font-medium text-neutral-400">{sub}</p>
                <p className="text-sm leading-relaxed text-neutral-500">{blurb}</p>
              </div>
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 transition-colors group-hover:text-ink">
                {cta}
                <ArrowRight size={13} weight="bold" aria-hidden />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURED MANUFACTURERS
───────────────────────────────────────────────────────────────────────────── */

function FeaturedManufacturers() {
  const [rows,  setRows]  = useState<ManufacturerRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("manufacturers")
      .select("id, name, category, specialty, capabilities, location, domestic, certifications")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) { setError(true); setRows([]); return; }
        setRows((data as ManufacturerRow[]) ?? []);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="border-t border-neutral-100">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Featured manufacturers
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
              Partners on the network.
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-sm text-neutral-500 sm:max-w-xs sm:text-right">
              Apparel, footwear, and textile manufacturers — Berry, TAA, and domestic-certified partners included.
            </p>
            <Link
              href="/manufacturers"
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 transition-colors hover:text-ink"
            >
              View all manufacturers
              <ArrowRight size={13} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>

        {rows === null && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-400">
            {error
              ? "Couldn't reach the partner database. Try again shortly."
              : "Partner network loads here once the manufacturers table is populated."}
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((m) => <ManufacturerCard key={m.id} row={m} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ManufacturerCard({ row }: { row: ManufacturerRow }) {
  const swatches = [
    "bg-stone-200", "bg-amber-100", "bg-zinc-200", "bg-neutral-200",
    "bg-emerald-100", "bg-stone-300", "bg-amber-50",
  ];
  const swatch = swatches[(row.name.charCodeAt(0) + row.name.length) % swatches.length];
  const caps   = (row.capabilities ?? []).slice(0, 3);

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-neutral-100 bg-white p-5 transition-all duration-200 hover:border-neutral-300 hover:shadow-sm">
      <div className={`flex h-24 items-center justify-center rounded-xl ${swatch}`}>
        <span className="font-display text-2xl text-ink/80">
          {row.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium leading-tight text-neutral-900">{row.name}</p>
        {row.location && (
          <p className="inline-flex items-center gap-1 text-xs text-neutral-400">
            <MapPin size={11} weight="regular" aria-hidden /> {row.location}
          </p>
        )}
      </div>
      {row.specialty && (
        <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500">{row.specialty}</p>
      )}
      {caps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {caps.map((c) => (
            <span key={c} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
              {c}
            </span>
          ))}
        </div>
      )}
      {row.domestic && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          Domestic
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOW IT WORKS — clean numbered layout matching product pages
───────────────────────────────────────────────────────────────────────────── */

const HOW_STEPS = [
  {
    n:     "01",
    title: "Describe what you're making",
    body:  "Type a brief, paste a tech pack, or upload a reference. Liai extracts capabilities, materials, certifications, and MOQ from plain language — no filters, no forms.",
  },
  {
    n:     "02",
    title: "Liai ranks the network",
    body:  "It searches 300+ vetted manufacturers and mills, scoring each on capability fit, lead time, and certifications. The strongest matches surface first.",
  },
  {
    n:     "03",
    title: "Brief and book",
    body:  "Each match arrives with full context — capability tags, prior brands, lead times — so you can reach out the same day without the research overhead.",
  },
];

function HowItWorks() {
  return (
    <section className="border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
        <p className="mb-12 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          How Liai works
        </p>
        <div className="grid gap-8 md:grid-cols-3 md:gap-12">
          {HOW_STEPS.map(({ n, title, body }) => (
            <div key={n}>
              <p className="font-display text-4xl font-light text-neutral-200">{n}</p>
              <h3 className="mt-3 text-base font-semibold text-neutral-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DARK CTA BANNER — matches product page banners exactly
───────────────────────────────────────────────────────────────────────────── */

const TILE_LEFT_POOL  = [
  "photo-1542291026-7eec264c27ff",
  "photo-1556821840-3a63f15732ce",
  "photo-1624378439575-d8705ad7ae80",
  "photo-1602810318383-e386cc2a3ccf",
];
const TILE_RIGHT_POOL = [
  "photo-1618354691373-d851c5c3a990",
  "photo-1551537482-f2075a1d41f2",
  "photo-1588850561407-ed78c282e89b",
  "photo-1547592166-23ac45744acd",
];

function tilePhoto(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&h=850&q=80`;
}

function SwapTile({ pool, intervalMs, startIdx = 0 }: { pool: string[]; intervalMs: number; startIdx?: number }) {
  const [idx, setIdx] = useState(startIdx % pool.length);
  useEffect(() => {
    if (pool.length <= 1) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % pool.length), intervalMs);
    return () => window.clearInterval(t);
  }, [pool, intervalMs]);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-800">
      {pool.map((id, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={tilePhoto(id)}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

function DarkCta() {
  return (
    <section className="bg-ink">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-0 md:py-20">
        {/* 3-col grid on desktop: photo | copy+CTAs | photo */}
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_1.4fr_1fr] md:gap-12">
          <SwapTile pool={TILE_LEFT_POOL}  intervalMs={4000} startIdx={0} />

          <div className="order-first flex flex-col items-center text-center md:order-none">
            <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-paper md:text-4xl lg:text-5xl">
              For any brand,<br />
              no matter what<br />
              you make.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400">
              Whether you&apos;re launching a product line, building a catalog, or
              stocking a wholesale store — Amenity has a tool for that.
            </p>
            <div className="mt-8 flex w-full max-w-[260px] flex-col gap-3">
              <Link
                href="/sourcing"
                className="inline-flex items-center justify-between gap-3 rounded-lg bg-paper px-5 py-3 text-sm font-medium text-ink transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                Try Liai free
                <ArrowRight size={13} weight="bold" aria-hidden />
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-between gap-3 rounded-lg border border-white/20 px-5 py-3 text-sm font-medium text-paper transition-all hover:border-white/40 hover:bg-white/5"
              >
                Shop Blanks
                <ArrowUpRight size={13} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>

          <SwapTile pool={TILE_RIGHT_POOL} intervalMs={5500} startIdx={1} />
        </div>
      </div>
    </section>
  );
}

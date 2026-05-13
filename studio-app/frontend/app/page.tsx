"use client";

/**
 * Homepage — Liai (sourcing agent) + wholesale Shop.
 *
 * Sections, top to bottom:
 *   1. Chat — Liai preview chat (scripted mock today; swap for the live liai
 *      runtime when ready by replacing the SCRIPT/setTimeout block).
 *   2. Featured manufacturers — 4-up grid loaded from Supabase
 *      `manufacturers` (anon RLS read).
 *   3. How Liai works — 3-step explainer.
 *   4. Anchor hero — black panel with crossfading product tiles either side
 *      and stacked Sign Up / Shop Blanks CTAs in the middle.
 *   5. Shop CTA — "Or skip the brief" → single Wholesale tile (Shop is
 *      strictly wholesale).
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkle,
  Paperclip,
  Storefront,
  ChatCircleText,
  ListChecks,
  Lightning,
  MapPin,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

type Role = "user" | "agent";

interface AgentMatch {
  name: string;
  location: string;
  capability: string;
  score: number;
}

interface AgentReply {
  body: string;
  matches?: AgentMatch[];
  cta?: { label: string; href: string };
}

interface Message {
  id: string;
  role: Role;
  body: string;
  matches?: AgentMatch[];
  cta?: { label: string; href: string };
}

interface ManufacturerRow {
  id: string;
  name: string;
  category: string | null;
  specialty: string | null;
  capabilities: string[] | null;
  location: string | null;
  domestic: boolean | null;
  certifications: string[] | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK CHAT SCRIPT
───────────────────────────────────────────────────────────────────────────── */

const SCRIPT: AgentReply[] = [
  {
    body:
      "Got it. Based on what you've described I'd start with these three. Each is currently accepting new briefs and matches your capability fit:",
    matches: [
      { name: "Mercer Cut & Sew",      location: "Los Angeles, CA",   capability: "Heavyweight knits · MOQ 100", score: 0.94 },
      { name: "Atlas Knitwear",        location: "Toronto, ON",       capability: "French terry · MOQ 250",       score: 0.89 },
      { name: "House of Hudson",       location: "Brooklyn, NY",      capability: "Cut & sew · MOQ 150",          score: 0.86 },
    ],
  },
  {
    body:
      "Tightening the filter to domestic + Berry-compliant. These three rank highest on capability fit and lead time:",
    matches: [
      { name: "Liberty Mills",         location: "Greensboro, NC",    capability: "Berry-compliant fleece · MOQ 500", score: 0.92 },
      { name: "Patriot Apparel Co.",   location: "Fall River, MA",    capability: "TAA + Berry · MOQ 300",            score: 0.88 },
      { name: "Heartland Stitchworks", location: "Cedar Rapids, IA",  capability: "Domestic cut & sew · MOQ 250",     score: 0.84 },
    ],
  },
  {
    body:
      "For sub-100 MOQ runs you'll want decorators, not full-package factories. Top three:",
    matches: [
      { name: "North Loop Print",      location: "Minneapolis, MN",   capability: "Screen print · MOQ 12",  score: 0.91 },
      { name: "Foundry Embroidery",    location: "Austin, TX",        capability: "Embroidery · MOQ 24",     score: 0.87 },
      { name: "Marin DTG",             location: "Oakland, CA",       capability: "DTG · MOQ 1",             score: 0.83 },
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
      <FeaturedManufacturers />
      <HowItWorks />
      <AnchorHero />
      <ShopCtas />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CHAT SECTION
───────────────────────────────────────────────────────────────────────────── */

function ChatSection() {
  return (
    <section
      id="chat"
      className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 md:py-20"
    >
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
          <Sparkle size={12} weight="fill" aria-hidden />
          Meet Liai
        </div>
        <h1 className="mt-5 font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
          Brief Liai. Get matched.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
          Describe your spec — fabric, capabilities, MOQ, certifications,
          timeline — and Liai returns a ranked shortlist of vetted manufacturers,
          mills, and decorators.
        </p>
      </div>
      <div className="mt-8 animate-fade-up animate-delay-200 mx-auto max-w-2xl">
        <Chat />
        <p className="mt-3 text-center text-xs text-neutral-400">
          Try it free — no credit card required
        </p>
      </div>
      <BrandCarousel />
    </section>
  );
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [step, setStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Typewriter state
  const [displayText, setDisplayText] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasMessages = messages.length > 0 || thinking;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  // Typewriter effect — type, pause, delete, next prompt
  useEffect(() => {
    if (input) return; // stop animating when user is typing
    const prompt = SUGGESTED_PROMPTS[promptIdx];

    if (!isDeleting) {
      if (charIdx < prompt.length) {
        const t = window.setTimeout(() => {
          setDisplayText(prompt.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, 48);
        return () => window.clearTimeout(t);
      } else {
        // Fully typed — pause 2 s then start deleting
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
        // Fully deleted — move to next prompt
        setIsDeleting(false);
        setPromptIdx((i) => (i + 1) % SUGGESTED_PROMPTS.length);
      }
    }
  }, [charIdx, isDeleting, promptIdx, input]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", body: trimmed },
    ]);
    setInput("");
    setThinking(true);

    const reply = SCRIPT[step % SCRIPT.length];
    setStep((s) => s + 1);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          body: reply.body,
          matches: reply.matches,
          cta: reply.cta,
        },
      ]);
      setThinking(false);
    }, 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Message thread — only rendered once the user starts chatting */}
      {hasMessages && (
        <div
          ref={scrollRef}
          className="flex flex-col gap-4 overflow-y-auto px-5 py-5"
          style={{ maxHeight: 340, minHeight: 120 }}
          aria-live="polite"
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {thinking && <TypingBubble />}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={hasMessages ? "border-t border-neutral-100" : ""}
      >
        {/* Tall input area with typewriter placeholder at top */}
        <div className="relative px-5 pt-4 pb-2" style={{ minHeight: 72 }}>
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
          {/* Typewriter placeholder — only shown when textarea is empty */}
          {!input && (
            <span className="pointer-events-none absolute left-5 top-4 text-sm text-neutral-400">
              {displayText}
              <span className="animate-cursor ml-[1px] font-light">|</span>
            </span>
          )}
        </div>

        {/* Bottom action row — paperclip left, send right */}
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
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser ? "bg-ink text-paper" : "bg-neutral-50 text-neutral-800"
          }`}
        >
          {message.body}
        </div>

        {message.matches && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
            {message.matches.map((m) => (
              <div
                key={m.name}
                className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-400"
              >
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
      <div className="flex flex-col gap-2 items-start">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          <Sparkle size={10} weight="fill" aria-hidden /> Liai
        </span>
        <div className="rounded-2xl bg-neutral-50 px-4 py-3">
          <span className="inline-flex items-center gap-1">
            <Dot delay="0ms" />
            <Dot delay="120ms" />
            <Dot delay="240ms" />
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
   BRAND CAROUSEL — infinite scrolling logo strip
───────────────────────────────────────────────────────────────────────────── */

function BrandCarousel() {
  // Duplicate the list so the marquee can loop seamlessly
  const doubled = [...BRANDS, ...BRANDS];
  return (
    <div className="mt-20 animate-fade-up animate-delay-300">
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
        Trusted by your favorite brands
      </p>
      <div className="relative overflow-hidden">
        {/* Left + right fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

        <div className="flex animate-marquee-left gap-10 whitespace-nowrap">
          {doubled.map((brand, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 tracking-wide select-none"
            >
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
   FEATURED MANUFACTURERS — 4 rows from Supabase `manufacturers`
───────────────────────────────────────────────────────────────────────────── */

function FeaturedManufacturers() {
  const [rows, setRows] = useState<ManufacturerRow[] | null>(null);
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
        if (e) {
          setError(true);
          setRows([]);
          return;
        }
        setRows((data as ManufacturerRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 md:py-16 border-t border-neutral-100">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Featured manufacturers
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
            Partners on the network.
          </h2>
        </div>
        <p className="text-sm text-neutral-500 sm:max-w-xs">
          Briefed by Liai. Pulled live from our partner database.
        </p>
      </div>

      {rows === null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          {error
            ? "Couldn't reach the partner database. Try again shortly."
            : "Partner network loads here once the manufacturers table is populated."}
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((m) => (
            <ManufacturerCard key={m.id} row={m} />
          ))}
        </div>
      )}
    </section>
  );
}

function ManufacturerCard({ row }: { row: ManufacturerRow }) {
  const swatches = [
    "bg-stone-200", "bg-amber-100", "bg-zinc-200", "bg-neutral-200",
    "bg-emerald-100", "bg-stone-300", "bg-amber-50",
  ];
  const swatch =
    swatches[(row.name.charCodeAt(0) + row.name.length) % swatches.length];

  const caps = (row.capabilities ?? []).slice(0, 3);

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-all duration-200 hover:border-neutral-400 hover:shadow-sm">
      <div className={`flex h-24 items-center justify-center rounded-xl ${swatch}`}>
        <span className="font-display text-2xl text-ink/80">
          {row.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("")}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-medium leading-tight">{row.name}</p>
        {row.location && (
          <p className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <MapPin size={11} weight="regular" aria-hidden /> {row.location}
          </p>
        )}
      </div>

      {row.specialty && (
        <p className="text-xs leading-relaxed text-neutral-600 line-clamp-2">
          {row.specialty}
        </p>
      )}

      {caps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {caps.map((c) => (
            <span
              key={c}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
            >
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
   HOW IT WORKS
───────────────────────────────────────────────────────────────────────────── */

function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 md:py-16 border-t border-neutral-100">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">How Liai works</p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
          Three steps from spec to shortlist.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Step
          n={1}
          icon={<ChatCircleText size={20} weight="regular" aria-hidden />}
          title="Describe what you're making"
          body="Type a brief, paste a tech pack, or upload a reference garment. Liai extracts capabilities, materials, certifications, and MOQ from natural language."
        />
        <Step
          n={2}
          icon={<ListChecks size={20} weight="regular" aria-hidden />}
          title="Liai ranks the network"
          body="It searches a curated database of 300+ manufacturers and mills, scores them on capability fit, lead time, and certifications, and surfaces the strongest matches first."
        />
        <Step
          n={3}
          icon={<Lightning size={20} weight="regular" aria-hidden />}
          title="Brief and book"
          body="Each match arrives with the context you'd otherwise spend an hour assembling — capability tags, prior brands, lead times — so you can reach out the same day."
        />
      </div>
    </section>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-6 transition-all duration-200 hover:border-neutral-400 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-ink">
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {`0${n}`}
        </span>
      </div>
      <p className="font-display text-xl">{title}</p>
      <p className="text-sm leading-relaxed text-neutral-600">{body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANCHOR HERO — black panel with two crossfading product tiles + stacked CTAs
───────────────────────────────────────────────────────────────────────────── */

/* Two distinct image pools so left/right tiles never show the same thing at
 * the same time. Each pool rotates on its own interval so the swaps feel
 * organic instead of synced. */
const TILE_LEFT_POOL = [
  "photo-1542291026-7eec264c27ff", // sneaker
  "photo-1556821840-3a63f15732ce", // hoodie
  "photo-1624378439575-d8705ad7ae80", // chino
  "photo-1602810318383-e386cc2a3ccf", // washed fleece
];
const TILE_RIGHT_POOL = [
  "photo-1618354691373-d851c5c3a990", // long sleeve
  "photo-1551537482-f2075a1d41f2",   // bomber
  "photo-1588850561407-ed78c282e89b", // cap
  "photo-1547592166-23ac45744acd",   // track jacket
];

function tilePhoto(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&h=850&q=80`;
}

function AnchorHero() {
  return (
    <section style={{ backgroundColor: "#efe9e7" }} className="text-ink">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1fr_1.2fr_1fr] md:gap-10 md:py-20">
        {/* Left tile */}
        <SwapTile pool={TILE_LEFT_POOL} intervalMs={4000} startIdx={0} />

        {/* Center copy + stacked CTAs */}
        <div className="flex flex-col items-center text-center order-first md:order-none">
          <h2 className="font-display text-3xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            For any brand,
            <br />
            no matter what you make.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600 md:text-base">
            Whether you&apos;re launching a hoodie line or stocking a wholesale
            store, Liai finds the right manufacturer, mill, or decorator — and
            our blanks catalog is one click away.
          </p>

          {/* Stacked CTAs */}
          <div className="mt-6 flex w-full max-w-[280px] flex-col gap-3">
            <PrimaryCTA href="/sign-in" label="Sign Up for Free" tone="light" />
            <SecondaryCTA href="/shop" label="Shop Blanks" tone="light" />
          </div>
        </div>

        {/* Right tile */}
        <SwapTile pool={TILE_RIGHT_POOL} intervalMs={5500} startIdx={1} />
      </div>
    </section>
  );
}

/* Crossfading product tile — show one image at a time, fade between them on
 * a timer. Stagger via intervalMs + startIdx so paired tiles don't sync. */
function SwapTile({
  pool,
  intervalMs,
  startIdx = 0,
}: {
  pool: string[];
  intervalMs: number;
  startIdx?: number;
}) {
  const [idx, setIdx] = useState(startIdx % pool.length);

  useEffect(() => {
    if (pool.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % pool.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [pool, intervalMs]);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100">
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

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED CTA BUTTONS — all CTAs use the round-arrow indicator
───────────────────────────────────────────────────────────────────────────── */

function PrimaryCTA({
  href,
  label,
  tone = "light",
}: {
  href: string;
  label: string;
  tone?: "light" | "onDark";
}) {
  // tone="light"  = dark button on a light page background
  // tone="onDark" = light button on a dark page background
  const cls =
    tone === "onDark"
      ? "bg-paper text-ink hover:bg-neutral-100"
      : "bg-ink text-paper hover:bg-neutral-800";
  const ringCls =
    tone === "onDark"
      ? "border border-ink/20 group-hover:bg-ink group-hover:text-paper"
      : "border border-paper/30 group-hover:bg-paper group-hover:text-ink";
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-between gap-3 rounded-md px-5 py-3 text-sm font-medium transition-all duration-200 ${cls}`}
    >
      {label}
      <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${ringCls}`}>
        <ArrowRight size={11} weight="bold" aria-hidden />
      </span>
    </Link>
  );
}

function SecondaryCTA({
  href,
  label,
  tone = "light",
}: {
  href: string;
  label: string;
  tone?: "light" | "onDark";
}) {
  const cls =
    tone === "onDark"
      ? "border border-paper/40 text-paper hover:border-paper"
      : "border border-ink text-ink hover:bg-neutral-100";
  const ringCls =
    tone === "onDark"
      ? "border border-paper/40 group-hover:bg-paper group-hover:text-ink"
      : "border border-ink/30 group-hover:bg-ink group-hover:text-paper";
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-between gap-3 rounded-md px-5 py-3 text-sm font-medium transition-all duration-200 ${cls}`}
    >
      {label}
      <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${ringCls}`}>
        <ArrowRight size={11} weight="bold" aria-hidden />
      </span>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHOP CTA — single wholesale tile ("or skip the brief")
───────────────────────────────────────────────────────────────────────────── */

function ShopCtas() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 md:py-16 border-t border-neutral-100">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Shop catalog
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
          Shop our wholesale blanks.
        </h2>
      </div>

      <Link
        href="/shop"
        className="group relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-ink p-6 text-paper transition-all duration-200 hover:shadow-md sm:p-8"
        style={{ minHeight: 240 }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-paper">
          <Storefront size={20} weight="regular" aria-hidden />
        </div>

        <div className="flex flex-col gap-2 sm:max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Wholesale
          </p>
          <p className="font-display text-2xl tracking-tight leading-tight md:text-3xl">
            Premium blanks at B2B pricing.
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            Heavyweight tees, hoodies, sweats, and more. Tiered pricing kicks
            in automatically as quantities scale. Domestic stock, ships in 5–7
            days.
          </p>
        </div>

        <span className="inline-flex items-center gap-3 text-sm font-medium text-paper">
          Browse the catalog
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-paper/40 transition-all duration-200 group-hover:bg-paper group-hover:text-ink">
            <ArrowUpRight size={11} weight="bold" aria-hidden />
          </span>
        </span>
      </Link>
    </section>
  );
}

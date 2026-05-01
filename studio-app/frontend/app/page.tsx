"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Scissors,
  Yarn,
  GearSix,
  PaintBrush,
  SealCheck,
  Truck,
  ArrowUpRight,
  Tag,
  Package,
} from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────────────────────────
   HERO
   Left: headline, body, stacked CTAs
   Right: 2×3 image mosaic (placeholder tiles — swap <div> for <Image> once real
          product photos are available)
───────────────────────────────────────────────────────────────────────────── */

/* Hero grid: 1 large image (spans 2 rows) + 4 equal images (2×2 right column)
   Layout:  [ Large ] [ S1 ] [ S2 ]
            [ Large ] [ S3 ] [ S4 ]
   Replace bg classes with <Image> once product photos are available.       */
function HeroImageGrid() {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "1.4fr 1fr 1fr", gridTemplateRows: "1fr 1fr" }}
    >
      {/* Large image — spans both rows */}
      <div
        className="row-span-2 rounded-2xl bg-neutral-200 overflow-hidden
                   transition-transform duration-300 hover:scale-[1.01]"
        style={{ minHeight: "420px" }}
        aria-label="Featured product"
      />
      {/* 4 equal tiles */}
      {[
        { bg: "bg-stone-300",   label: "French Terry Hoodie" },
        { bg: "bg-amber-100",   label: "Washed Chino"        },
        { bg: "bg-neutral-300", label: "Fleece Crewneck"     },
        { bg: "bg-stone-200",   label: "Structured Cap"      },
      ].map((cell) => (
        <div
          key={cell.label}
          className={`${cell.bg} rounded-xl overflow-hidden
                      transition-transform duration-300 hover:scale-[1.02]`}
          aria-label={cell.label}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURED BRANDS / COLLECTIONS
   Category filter pills → 6-up grid of collection cards
   Mirrors the Faire-style "Featured brands" section
───────────────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  "All",
  "Tees & Tops",
  "Hoodies & Fleece",
  "Bottoms",
  "Outerwear",
  "Headwear",
  "Footwear",
  "Accessories",
];

interface CollectionCard {
  name: string;
  location: string;
  category: string;
  bg: string;
}

const COLLECTIONS: CollectionCard[] = [
  { name: "Essentials Tee",        location: "Los Angeles, California", category: "Tees & Tops",      bg: "bg-stone-200"    },
  { name: "Heavyweight Hoodie",    location: "Portland, Oregon",        category: "Hoodies & Fleece", bg: "bg-neutral-200"  },
  { name: "French Terry Crewneck", location: "New York, New York",      category: "Hoodies & Fleece", bg: "bg-amber-100"    },
  { name: "Relaxed Chino",         location: "Nashville, Tennessee",    category: "Bottoms",          bg: "bg-stone-300"    },
  { name: "Structured 6-Panel",    location: "Chicago, Illinois",       category: "Headwear",         bg: "bg-neutral-300"  },
  { name: "Nylon Bomber",          location: "Seattle, Washington",     category: "Outerwear",        bg: "bg-zinc-200"     },
  { name: "Fleece Shorts",         location: "Miami, Florida",          category: "Bottoms",          bg: "bg-amber-50"     },
  { name: "Dad Hat",               location: "Austin, Texas",           category: "Headwear",         bg: "bg-stone-100"    },
  { name: "Long-Sleeve Tee",       location: "Denver, Colorado",        category: "Tees & Tops",      bg: "bg-neutral-100"  },
  { name: "Track Jacket",          location: "San Francisco, California",category: "Outerwear",       bg: "bg-zinc-300"     },
  { name: "Canvas Tote",           location: "Brooklyn, New York",      category: "Accessories",      bg: "bg-amber-100"    },
  { name: "Washed Fleece",         location: "Scottsdale, Arizona",     category: "Hoodies & Fleece", bg: "bg-stone-200"    },
  { name: "Low-Top Sneaker",       location: "Los Angeles, California", category: "Footwear",         bg: "bg-neutral-200"  },
  { name: "Suede Loafer",          location: "New York, New York",      category: "Footwear",         bg: "bg-stone-300"    },
  { name: "Canvas High-Top",       location: "Portland, Oregon",        category: "Footwear",         bg: "bg-amber-50"     },
  { name: "Leather Sandal",        location: "Miami, Florida",          category: "Footwear",         bg: "bg-zinc-200"     },
  { name: "Knit Runner",           location: "Seattle, Washington",     category: "Footwear",         bg: "bg-stone-100"    },
  { name: "Slip-On Mule",          location: "Nashville, Tennessee",    category: "Footwear",         bg: "bg-neutral-300"  },
];

function FeaturedBrands() {
  const [active, setActive] = useState("All");

  const visible = (
    active === "All"
      ? COLLECTIONS
      : COLLECTIONS.filter((c) => c.category === active)
  ).slice(0, 6);

  return (
    <section className="w-full animate-fade-up animate-delay-300" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-0 py-16">
      {/* Header row */}
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl tracking-tight">Featured collections</h2>
        <Link
          href="/blanks"
          className="group inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-ink transition-colors"
        >
          All blanks
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 transition-all duration-200 group-hover:border-ink group-hover:text-ink">
            <ArrowUpRight size={11} weight="bold" aria-hidden />
          </span>
        </Link>
      </div>

      {/* Category pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`pill ${active === cat ? "pill-active" : ""}`}
            aria-pressed={active === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {visible.map((item) => (
          <Link
            key={item.name}
            href="/blanks"
            className="group flex flex-col gap-2"
          >
            {/* Product image tile */}
            <div
              className={`aspect-square w-full rounded-xl ${item.bg}
                          overflow-hidden transition-transform duration-300
                          group-hover:scale-[1.02] group-hover:shadow-sm`}
            >
              {/* Replace with <Image src={item.img} alt={item.name} fill className="object-cover" /> */}
            </div>
            {/* Card label */}
            <div>
              <p className="text-sm font-semibold leading-snug">{item.name}</p>
              <p className="text-xs text-neutral-500 leading-snug">{item.location}</p>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SERVICES GRID
───────────────────────────────────────────────────────────────────────────── */

function ServicesGrid() {
  const services = [
    { icon: <Scissors size={20} weight="regular" aria-hidden />, title: "Tech pack & sampling",
      body: "Send a sketch, reference garment, or tech pack. We return production-ready specs and a sealed sample in days, not weeks." },
    { icon: <Yarn size={20} weight="regular" aria-hidden />, title: "Materials & sourcing",
      body: "Premium fabrics from vetted mills — heavyweight knits, French terry, fleece, twill, denim, and performance fabrics." },
    { icon: <GearSix size={20} weight="regular" aria-hidden />, title: "Production runs",
      body: "Small-batch to volume. Full-package cut-and-sew across knitwear, wovens, outerwear, and accessories." },
    { icon: <PaintBrush size={20} weight="regular" aria-hidden />, title: "Decoration",
      body: "Screen print, embroidery, DTG, and label work. Add your logo to any blanks SKU, or specify it in your Studio brief." },
    { icon: <SealCheck size={20} weight="regular" aria-hidden />, title: "Quality assurance",
      body: "Inline inspection, AQL sampling, and photo QA at every milestone. Defects caught at the factory, not your warehouse." },
    { icon: <Truck size={20} weight="regular" aria-hidden />, title: "Logistics & fulfillment",
      body: "DDP shipping, drop-ship to buyers, and major courier integrations. Returns and exchanges handled end-to-end." },
  ];

  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-0 py-16 border-t border-neutral-100 animate-fade-up animate-delay-400">
      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">What we do</p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Services</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.title}
            className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-6
                       transition-all duration-200 hover:border-neutral-400 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-ink">
              {s.icon}
            </div>
            <p className="font-display text-xl">{s.title}</p>
            <p className="text-sm leading-relaxed text-neutral-600">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <main>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-0 py-16 md:py-24">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">

          {/* Left: copy + stacked CTAs */}
          <div className="flex flex-col justify-center animate-fade-up">
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              Premium blanks.
              <br />
              Custom production.
              <br />
              One studio.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-neutral-600">
              Amenity makes the same heavyweight basics that define modern
              menswear, and produces full cut-and-sew runs for brands that need
              them. No middlemen, no surprises.
            </p>

            {/* Stacked CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:max-w-[280px]">
              <Link
                href="/blanks"
                className="flex items-center justify-between rounded-md bg-ink px-6 py-3.5
                           text-base font-medium text-paper transition-colors
                           hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Shop Blanks Catalog
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-paper/40">
                  <ArrowRight size={12} weight="bold" aria-hidden />
                </span>
              </Link>
              <Link
                href="/sign-in"
                className="flex items-center justify-between rounded-md border border-ink
                           px-6 py-3.5 text-base font-medium text-ink transition-colors
                           hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Sign Up to Customize
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/30">
                  <ArrowRight size={12} weight="bold" aria-hidden />
                </span>
              </Link>
            </div>
          </div>

          {/* Right: image mosaic */}
          <div className="animate-fade-up animate-delay-200">
            <HeroImageGrid />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-0">
        <hr className="border-neutral-100" />
      </div>

      {/* ── FEATURED COLLECTIONS ─────────────────────────────────────────── */}
      <FeaturedBrands />

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <ServicesGrid />

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-0">
        <hr className="border-neutral-100" />
      </div>

      {/* ── SHOP / STUDIO CTAs ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-0 pb-16">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* Blanks — image card */}
          <Link
            href="/blanks"
            className="group relative overflow-hidden rounded-2xl bg-stone-200"
            style={{ minHeight: "420px" }}
          >
            {/* Swap this div for <Image src="..." fill className="object-cover" /> */}
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]" />
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            {/* Text overlay */}
            <div className="absolute bottom-0 left-0 p-8 text-paper">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-2">Blanks</p>
              <p className="font-display text-3xl tracking-tight leading-tight">
                Shop the catalog.
              </p>
              <p className="mt-2 text-sm text-white/70 max-w-xs leading-relaxed">
                Heavyweight basics — tees, hoodies, sweats, and more. B2B pricing, ships in 5–7 days.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition-all duration-200 group-hover:bg-neutral-100">
                Shop Now
                <ArrowRight size={14} weight="bold" aria-hidden />
              </span>
            </div>
          </Link>

          {/* Studio — image card */}
          <Link
            href="/studio"
            className="group relative overflow-hidden rounded-2xl bg-zinc-700"
            style={{ minHeight: "420px" }}
          >
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 text-paper">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-2">Studio</p>
              <p className="font-display text-3xl tracking-tight leading-tight">
                Build your own line.
              </p>
              <p className="mt-2 text-sm text-white/70 max-w-xs leading-relaxed">
                Full-package production with our vetted partner network. Sourcing, sampling, QA, and delivery.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition-all duration-200 group-hover:bg-neutral-100">
                Learn More
                <ArrowRight size={14} weight="bold" aria-hidden />
              </span>
            </div>
          </Link>

        </div>
      </div>

    </main>
  );
}

/* Inline SVG helpers removed — all icons now use @phosphor-icons/react */

import Link from "next/link";

export default function StudioLandingPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-16 md:py-24">
      {/* ---------- hero ---------- */}
      <section className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-neutral-500">
            Amenity Production
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Your line.
            <br />
            Made right.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-neutral-700">
            Production is full-package manufacturing for clothing brands. Send us a
            sketch, a tech pack, or a reference garment — we&apos;ll route it
            to the right partner, manage QA, and ship to your warehouse.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/studio/quote"
              className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper transition hover:bg-accent"
            >
              Start a quote →
            </Link>
            <Link
              href="/blanks"
              className="rounded-md border border-ink px-6 py-3 text-base font-medium text-ink transition hover:bg-neutral-100"
            >
              Or shop Wholesale
            </Link>
          </div>
        </div>

        <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100">
          <div className="flex h-full items-center justify-center text-neutral-400">
            <span className="font-display text-3xl">Production</span>
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="mt-24">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          How Production works
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
          From sketch to door.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Step
            n="01"
            title="Brief"
            body="Submit your RFQ — product type, quantity, materials, target price, deadline, and any reference brands. Tech packs welcome."
          />
          <Step
            n="02"
            title="Make"
            body="We sample, run QA at every milestone, and ship DDP to your warehouse. One contact through the whole run."
          />
        </div>
      </section>

      {/* ---------- capabilities ---------- */}
      <section className="mt-24">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Capabilities
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
          What we make.
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-neutral-200 p-5"
            >
              <p className="font-display text-lg">{c.title}</p>
              <p className="mt-1 text-xs text-neutral-600">{c.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="mt-24 rounded-2xl bg-ink p-10 text-paper md:p-16">
        <p className="text-sm uppercase tracking-[0.2em] text-paper/60">
          Ready when you are
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
          Tell us what you&apos;re making.
        </h2>
        <p className="mt-4 max-w-xl text-paper/80">
          Most projects move from RFQ to first sample in under three weeks.
          Tell us about yours.
        </p>
        <div className="mt-8">
          <Link
            href="/studio/quote"
            className="inline-block rounded-md bg-paper px-6 py-3 text-base font-medium text-ink transition hover:bg-neutral-200"
          >
            Start a quote →
          </Link>
        </div>
      </section>
    </main>
  );
}

const CAPABILITIES = [
  { title: "Knitwear",      sub: "Tees, sweats, hoodies, polos" },
  { title: "Wovens",        sub: "Shirting, trousers, twill" },
  { title: "Outerwear",     sub: "Jackets, coats, vests" },
  { title: "Denim",         sub: "Jeans, jackets, shirts" },
  { title: "Activewear",    sub: "Performance, athleisure" },
  { title: "Loungewear",    sub: "Robes, sets, sleep" },
  { title: "Accessories",   sub: "Hats, bags, scarves" },
  { title: "Headwear",      sub: "Caps, beanies, bucket" },
];

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {n}
      </p>
      <p className="mt-2 font-display text-2xl">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}

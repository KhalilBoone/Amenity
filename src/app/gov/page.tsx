"use client";

import Nav from "@/components/Nav";

const MARQUEE_ITEMS = [
  "Berry Amendment Compliant","TAA Compliant","NAICS 315210","SAM.gov Registered",
  "48 hr Bid Turnaround","USA-Made Production","Rush Capable","Primary Contractor",
  "Spec Compliant","100% Domestic",
];

const SUPPLY_CATALOG = [
  { label: "Service\nUniforms",         psc: "PSC 8405", gradient: "from-[#0b1628] via-[#0f2040] to-[#162d52]" },
  { label: "Tactical\n& BDU",           psc: "PSC 8415", gradient: "from-[#141a10] via-[#1a2210] to-[#1e2a12]" },
  { label: "PPE &\nSafety Gear",        psc: "PSC 8470", gradient: "from-[#1a1010] via-[#280f0f] to-[#2a0d0d]" },
  { label: "Headwear\n& Caps",          psc: "PSC 8450", gradient: "from-[#101018] via-[#18182a] to-[#141422]" },
  { label: "Outerwear\n& Cold Weather", psc: "PSC 8420", gradient: "from-[#101422] via-[#0d1a30] to-[#0b1830]" },
  { label: "Workwear\n& Coveralls",     psc: "PSC 8410", gradient: "from-[#1a160a] via-[#221c08] to-[#1e1800]" },
  { label: "Medical\n& Scrubs",         psc: "PSC 8425", gradient: "from-[#081520] via-[#0c2030] to-[#102840]" },
  { label: "Bags, Packs\n& Footwear",   psc: "PSC 8465", gradient: "from-[#120f20] via-[#1a1430] to-[#1c1235]" },
];

const NAICS = [
  { code: "315210", desc: "Cut & Sew Apparel Contractors", primary: true },
  { code: "315220", desc: "Men's & Boys' Cut & Sew Apparel" },
  { code: "315240", desc: "Women's & Girls' Cut & Sew Apparel" },
  { code: "315280", desc: "Other Cut & Sew Apparel Manufacturing" },
  { code: "316210", desc: "Footwear Manufacturing" },
  { code: "314910", desc: "Textile Bag & Canvas Mills" },
];

const PSC = [
  { code: "8405", desc: "Outerwear, Men's" },
  { code: "8410", desc: "Outerwear, Women's" },
  { code: "8415", desc: "Clothing, Special Purpose" },
  { code: "8420", desc: "Footwear, Men's" },
  { code: "8425", desc: "Footwear, Women's" },
  { code: "8450", desc: "Children's & Infants' Apparel" },
  { code: "8465", desc: "Individual Equipment (Bags, Packs)" },
  { code: "8470", desc: "Armor, Personal" },
];

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] flex-shrink-0" fill="none" stroke="#2b7fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function GovPage() {
  function scrollToContact() {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      {/* ── CREDENTIALS BAR ─────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-[110] bg-[#0b1628] hidden md:flex justify-center items-center h-9 overflow-hidden flex-wrap" style={{ paddingLeft: 48, paddingRight: 48 }}>
        {[
          { label: "UEI",          value: "[YOUR UEI]" },
          { label: "CAGE",         value: "[CAGE CODE]" },
          { label: "Primary NAICS",value: "315210" },
          { label: "Set-Aside",    value: "[Your Set-Aside]" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-[7px] px-5 h-full border-r border-white/[0.07]">
            <span className="text-[10px] font-semibold tracking-[1.2px] uppercase text-white/35">{label}</span>
            <span className="text-[11px] font-bold text-white tracking-[.3px]">{value}</span>
          </div>
        ))}
        <div className="flex items-center gap-[7px] px-5 h-full">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[1.5px] uppercase text-[#22c55e]">
            <span className="w-[5px] h-[5px] rounded-full bg-[#22c55e] animate-pulse" />
            SAM.gov Active &amp; Current
          </div>
        </div>
      </div>

      <Nav variant="gov" />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div className="relative bg-[#0b1628] min-h-screen flex flex-col justify-end px-5 md:px-[60px] pb-16 md:pb-20 overflow-hidden mt-[60px] md:mt-[96px]">
        {/* Blueprint grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[.04]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
          backgroundSize: "80px 80px,80px 80px,16px 16px,16px 16px"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 55% at 85% 35%, rgba(43,127,255,.1) 0%, transparent 65%)" }} />
        <div className="max-w-[1200px] mx-auto w-full relative z-10">
          <div className="inline-flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-7">
            <span className="w-7 h-px bg-[#2b7fff]" />
            Government &amp; Institutional Supply
          </div>
          <h1 className="text-white font-black leading-[.92] tracking-[-4px] mb-12 max-w-[920px]"
              style={{ fontSize: "clamp(52px,8.5vw,106px)" }}>
            American-Made.<br /><em className="not-italic text-[#2b7fff]">Government-Ready.</em>
          </h1>
          <div className="flex items-end justify-between gap-12 flex-wrap">
            <div>
              <p className="text-white/48 leading-[1.85] max-w-[380px]" style={{ fontSize: 15 }}>
                Compliant, on-spec, on-time production across uniforms, tactical apparel, workwear, and PPE — delivered as a primary contractor to federal, state, and municipal agencies.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {["Berry Amendment","TAA Compliant","250K+ Units / Month","Rush Production Available"].map(b => (
                  <span key={b} className="text-[9px] font-extrabold tracking-[2px] uppercase px-2.5 py-[5px] rounded-[3px] border border-white/[.14] text-white/55">{b}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button onClick={scrollToContact}
                className="w-full sm:w-auto text-center bg-white text-[#0b1628] px-[30px] py-[14px] rounded-[5px] text-[13px] font-extrabold uppercase tracking-[.4px] hover:bg-[#2b7fff] hover:text-white transition-all cursor-pointer border-0">
                Contact Us
              </button>
              <a href="#capabilities"
                className="w-full sm:w-auto text-center border border-white/20 text-white/65 px-[30px] py-[14px] rounded-[5px] text-[13px] font-bold uppercase tracking-[.4px] hover:border-white/50 hover:text-white transition-all no-underline">
                View Capabilities
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0f0f0f] overflow-hidden h-[42px] flex items-center border-t border-white/[.06]">
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 36s linear infinite" }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-[10px] px-[22px] text-[10px] font-extrabold tracking-[2.5px] uppercase text-white/70">
              {item}
              {i < MARQUEE_ITEMS.length * 2 - 1 && <span className="text-white/20">·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <div className="bg-[#0f2040] border-t border-white/[.05]">
        <div className="grid grid-cols-2 md:grid-cols-4">
        {[
          { v: "250K+", l: "Units / Month" },
          { v: "4–8 wk", l: "Standard Lead Time" },
          { v: "48 hr",  l: "Bid Turnaround" },
          { v: "100%",   l: "Spec Compliance" },
        ].map(s => (
          <div key={s.l} className="text-center py-8 md:py-9 px-6 md:px-[52px] border-r border-white/[.05] [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r border-b md:border-b-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0">
            <div className="text-[30px] font-black text-white tracking-[-1.5px]">{s.v}</div>
            <div className="text-[10px] text-white/32 mt-[5px] uppercase tracking-[1.8px]">{s.l}</div>
          </div>
        ))}
        </div>
      </div>

      {/* ── SUPPLY CATALOG ──────────────────────────────────────────────── */}
      <section id="catalog" className="bg-white pt-16 md:pt-[100px] pb-16 md:pb-[100px] px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
                <span className="w-5 h-px bg-[#2b7fff]" /> Supply Catalog
              </div>
              <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02]">What we supply</h2>
            </div>
            <p className="text-[#4b5563] leading-[1.75] max-w-[280px]" style={{ fontSize: 14 }}>
              Berry Amendment and TAA compliant production across all major categories.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
          {SUPPLY_CATALOG.map((c) => (
            <button
              key={c.label}
              onClick={scrollToContact}
              className={`relative aspect-[3/4] bg-gradient-to-br ${c.gradient} overflow-hidden cursor-pointer border-0 group`}
              style={{ outline: "1px solid rgba(255,255,255,.04)" }}
            >
              {/* diagonal pattern */}
              <div className="absolute inset-0 opacity-[.035]" style={{
                backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(255,255,255,1) 18px,rgba(255,255,255,1) 19px)"
              }} />
              <div className="absolute inset-0 bg-[rgba(8,18,45,.48)] group-hover:bg-[rgba(8,20,50,.65)] transition-all flex flex-col justify-end p-3 md:p-[22px]">
                <div className="text-[8px] md:text-[9px] font-extrabold tracking-[2.5px] uppercase text-white/35 mb-[7px] text-left">{c.psc}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] md:text-[21px] font-black tracking-[-0.5px] text-white leading-[1.05] whitespace-pre-line text-left">{c.label}</div>
                  <div className="w-[30px] h-[30px] rounded-full border border-white/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#2b7fff] group-hover:border-[#2b7fff] transition-all">
                    <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ────────────────────────────────────────────────── */}
      <section id="capabilities" className="bg-[#f4f5f7] py-16 md:py-[100px] px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-start">
          {/* Left column */}
          <div>
            <div className="text-[11px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f] mb-3.5 pb-2.5 border-b-2 border-[#0f0f0f] flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="#2b7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Production Timelines
            </div>
            {[
              ["Standard Lead Time",          "4–8 weeks"],
              ["Rush Lead Time",              "2–3 weeks"],
              ["RFQ Response Time",           "48 hours"],
              ["Sampling / Prototype",        "1–2 weeks"],
              ["Minimum Order Quantity",      "100 units"],
              ["Monthly Production Capacity", "250,000+ units"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-[11px] border-b border-[#e5e7eb] last:border-0">
                <span className="text-[13px] text-[#4b5563]">{k}</span>
                <span className="text-[13px] font-bold text-[#0f0f0f]">{v}</span>
              </div>
            ))}

            <div className="text-[11px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f] mt-9 mb-3.5 pb-2.5 border-b-2 border-[#0f0f0f] flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="#2b7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Compliance &amp; Certifications
            </div>
            {[
              ["Berry Amendment",          "Compliant"],
              ["TAA (Trade Agreements Act)","Compliant"],
              ["SAM.gov Registration",     "Active"],
              ["100% Domestic Production", "Verified"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-[11px] border-b border-[#e5e7eb] last:border-0">
                <span className="text-[13px] text-[#4b5563]">{k}</span>
                <div className="flex items-center gap-[5px] text-[12px] font-extrabold text-[#2b7fff] tracking-[.3px]">
                  {CHECK_ICON} {v}
                </div>
              </div>
            ))}
          </div>

          {/* Right column */}
          <div>
            <div className="text-[11px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f] mb-3.5 pb-2.5 border-b-2 border-[#0f0f0f] flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="#2b7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Production Capabilities
            </div>
            {[
              "Cut & Sew / CMT",
              "Full Package Production",
              "Screen Print & Embroidery",
              "Sublimation / Dye Print",
              "IR Reflective / Spec Fabric",
              "Labeling & Compliance Tags",
              "Unit Serialization / Barcoding",
              "Custom Packaging & Bagging",
            ].map((k) => (
              <div key={k} className="flex justify-between items-center py-[11px] border-b border-[#e5e7eb] last:border-0">
                <span className="text-[13px] text-[#4b5563]">{k}</span>
                <div className="flex items-center gap-[5px] text-[12px] font-extrabold text-[#2b7fff] tracking-[.3px]">
                  {CHECK_ICON} Available
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NAICS / PSC CODES ───────────────────────────────────────────── */}
      <section id="codes" className="bg-white py-16 md:py-[100px] px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px]">
          {/* NAICS */}
          <div>
            <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
              <span className="w-5 h-px bg-[#2b7fff]" /> Classification Codes
            </div>
            <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] mb-0">NAICS codes</h2>
            <table className="w-full border-collapse text-[13px] mt-6">
              <thead>
                <tr>
                  <th className="bg-[#0b1628] text-white text-left px-3.5 py-[11px] text-[10px] font-extrabold uppercase tracking-[1.2px]">Code</th>
                  <th className="bg-[#0b1628] text-white text-left px-3.5 py-[11px] text-[10px] font-extrabold uppercase tracking-[1.2px]">Description</th>
                </tr>
              </thead>
              <tbody>
                {NAICS.map(n => (
                  <tr key={n.code} className={`hover:bg-[#eff6ff] ${n.primary ? "bg-[#eef4ff]" : ""}`}>
                    <td className={`px-3.5 py-[10px] border-b border-[#e5e7eb] ${n.primary ? "font-semibold" : ""}`}>
                      <strong>{n.code}</strong>
                      {n.primary && (
                        <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-[2px] rounded-[3px] bg-[#2b7fff] text-white uppercase tracking-[.5px]">Primary</span>
                      )}
                    </td>
                    <td className={`px-3.5 py-[10px] border-b border-[#e5e7eb] ${n.primary ? "font-semibold" : ""}`}>{n.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PSC */}
          <div>
            <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
              <span className="w-5 h-px bg-[#2b7fff]" /> PSC Codes
            </div>
            <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] mb-0">PSC codes</h2>
            <table className="w-full border-collapse text-[13px] mt-6">
              <thead>
                <tr>
                  <th className="bg-[#0b1628] text-white text-left px-3.5 py-[11px] text-[10px] font-extrabold uppercase tracking-[1.2px]">Code</th>
                  <th className="bg-[#0b1628] text-white text-left px-3.5 py-[11px] text-[10px] font-extrabold uppercase tracking-[1.2px]">Description</th>
                </tr>
              </thead>
              <tbody>
                {PSC.map(p => (
                  <tr key={p.code} className="hover:bg-[#eff6ff]">
                    <td className="px-3.5 py-[10px] border-b border-[#e5e7eb]"><strong>{p.code}</strong></td>
                    <td className="px-3.5 py-[10px] border-b border-[#e5e7eb]">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── HOW WE WORK ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#0b1628] py-16 md:py-[100px] px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-[88px] items-center">
          <div>
            <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
              <span className="w-5 h-px bg-[#2b7fff]" /> How We Work
            </div>
            <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] text-white">
              We find the opportunity.<br />We bid. We deliver.
            </h2>
            <p className="text-white/42 leading-[1.75] mt-3.5" style={{ fontSize: 15 }}>
              We operate as a primary contractor — actively pursuing federal, state, and municipal contracts so agencies receive compliant, domestic apparel supply without the sourcing burden.
            </p>
            <div className="flex flex-col gap-[34px] mt-12">
              {[
                {
                  n: "01",
                  title: "We Monitor Contract Opportunities",
                  body: "We actively track clothing and footwear solicitations across SAM.gov and agency procurement portals — identifying opportunities that match our NAICS and PSC capabilities daily.",
                },
                {
                  n: "02",
                  title: "We Submit Compliant Bids",
                  body: "Our bid packages include itemized pricing, production timelines, Berry Amendment and TAA compliance documentation, and past performance data — submitted within 48 hours of solicitation close.",
                },
                {
                  n: "03",
                  title: "We Deliver On Award",
                  body: "Production begins immediately upon contract award. We manage all coordination, quality control, labeling, and delivery — on spec and on time, direct to your facility or distribution point.",
                },
              ].map(s => (
                <div key={s.n} className="flex gap-[22px] items-start">
                  <div className="text-[10px] font-extrabold tracking-[1px] text-[#2b7fff] min-w-[24px] pt-[3px] uppercase">{s.n}</div>
                  <div>
                    <div className="text-[16px] font-bold text-white mb-1.5">{s.title}</div>
                    <div className="text-[13px] text-white/38 leading-[1.75]">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual panel */}
          <div className="hidden md:flex bg-[#162d52] border border-white/[.06] rounded-xl overflow-hidden aspect-square items-center justify-center relative">
            <div className="absolute inset-0" style={{
              backgroundImage: "linear-gradient(rgba(43,127,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(43,127,255,.07) 1px,transparent 1px),linear-gradient(rgba(43,127,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(43,127,255,.03) 1px,transparent 1px)",
              backgroundSize: "48px 48px,48px 48px,12px 12px,12px 12px"
            }} />
            <div className="relative text-center px-12">
              <div className="font-black text-white leading-[1.05] tracking-[-2px]" style={{ fontSize: "clamp(30px,4vw,48px)" }}>
                Spec compliant.<br /><em className="not-italic text-[#2b7fff]">On time.</em>
              </div>
              <div className="text-[9px] font-extrabold tracking-[2.5px] uppercase text-white/22 mt-5">
                Berry · TAA · SAM.gov · USA-Made
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────────────── */}
      <section id="contact" className="bg-[#f4f5f7] py-16 md:py-[100px] px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[88px] items-start">
          {/* Left: copy + info cards */}
          <div>
            <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
              <span className="w-5 h-px bg-[#2b7fff]" /> Get In Touch
            </div>
            <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] mb-3.5">Contact us</h2>
            <p className="text-[#4b5563] leading-[1.75]" style={{ fontSize: 15 }}>
              Questions about our capabilities, past performance, or compliance documentation? Reach out directly and we&apos;ll respond within one business day.
            </p>
            <div className="flex flex-col gap-4 mt-9">
              {/* Info card 1 */}
              <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5">
                <div className="flex items-center gap-2 text-[12px] font-extrabold tracking-[.5px] uppercase text-[#0f0f0f] mb-3">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#2b7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  What We Can Provide
                </div>
                {[
                  ["Capability Statement", "Full capability statement with NAICS, PSC, and certifications"],
                  ["Past Performance",     "References, delivery records, and quality documentation"],
                  ["Compliance Documentation","Berry Amendment, TAA, and SAM.gov registration verification"],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-2.5 items-start mb-2.5 last:mb-0">
                    <div className="w-[5px] h-[5px] rounded-full bg-[#2b7fff] flex-shrink-0 mt-[6px]" />
                    <p className="text-[13px] text-[#4b5563] leading-[1.5]"><strong className="text-[#0f0f0f] font-bold">{title}</strong> {desc}</p>
                  </div>
                ))}
              </div>
              {/* Info card 2 */}
              <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5">
                <div className="flex items-center gap-2 text-[12px] font-extrabold tracking-[.5px] uppercase text-[#0f0f0f] mb-3">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#2b7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Direct Contact
                </div>
                {["gov@amenitysupply.co", "[Your Address]"].map(t => (
                  <div key={t} className="flex gap-2.5 items-start mb-2.5 last:mb-0">
                    <div className="w-[5px] h-[5px] rounded-full bg-[#2b7fff] flex-shrink-0 mt-[6px]" />
                    <p className="text-[13px] text-[#4b5563]">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,.06)]">
            <div className="bg-[#0b1628] px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-white">Send Us a Message</div>
                <div className="text-[11px] text-white/45 mt-[2px]">We respond within one business day</div>
              </div>
              <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase bg-[rgba(34,197,94,.15)] text-[#22c55e] border border-[rgba(34,197,94,.25)] px-2.5 py-1 rounded-[3px]">
                1 Business Day
              </div>
            </div>
            <form className="p-6 flex flex-col gap-4"
              onSubmit={e => { e.preventDefault(); alert("Message received — we'll respond within one business day."); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f]">Your Name *</label>
                  <input required className="border border-[#e5e7eb] rounded-md px-3 py-[10px] text-[13px] text-[#0f0f0f] outline-none focus:border-[#2b7fff] transition-colors placeholder-[#9ca3af]" placeholder="Full name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f]">Organization</label>
                  <input className="border border-[#e5e7eb] rounded-md px-3 py-[10px] text-[13px] text-[#0f0f0f] outline-none focus:border-[#2b7fff] transition-colors placeholder-[#9ca3af]" placeholder="Agency or company" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f]">Email Address *</label>
                <input required type="email" className="border border-[#e5e7eb] rounded-md px-3 py-[10px] text-[13px] text-[#0f0f0f] outline-none focus:border-[#2b7fff] transition-colors placeholder-[#9ca3af]" placeholder="name@agency.gov" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f]">Subject</label>
                <select className="border border-[#e5e7eb] rounded-md px-3 py-[10px] text-[13px] text-[#0f0f0f] outline-none focus:border-[#2b7fff] transition-colors bg-white appearance-none cursor-pointer">
                  <option value="" disabled>Select a topic</option>
                  <option>Capability Statement Request</option>
                  <option>Past Performance Documentation</option>
                  <option>Compliance &amp; Certification Verification</option>
                  <option>NAICS / PSC Code Inquiry</option>
                  <option>General Inquiry</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-[#0f0f0f]">Message *</label>
                <textarea required rows={4} className="border border-[#e5e7eb] rounded-md px-3 py-[10px] text-[13px] text-[#0f0f0f] outline-none focus:border-[#2b7fff] transition-colors placeholder-[#9ca3af] resize-none" placeholder="How can we help? Include any relevant details about your inquiry." />
              </div>
              <button type="submit"
                className="w-full bg-[#2b7fff] hover:bg-[#1a60d4] text-white font-bold text-[13px] uppercase tracking-[.8px] py-[13px] rounded-[5px] transition-colors cursor-pointer border-0 justify-center">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
      <section className="bg-[#0b1628] py-16 md:py-24 px-5 md:px-[60px] text-center">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-white/50 mb-3.5">
            <span className="w-5 h-px bg-white/50" /> Get In Touch
          </div>
          <h2 className="font-black text-white tracking-[-2.5px] leading-[1.0] mt-3.5 mb-3" style={{ fontSize: "clamp(34px,5vw,60px)" }}>
            Questions about<br /><em className="not-italic text-[#2b7fff]">our capabilities?</em>
          </h2>
          <p className="text-white/50 leading-[1.75] max-w-[380px] mx-auto mb-10" style={{ fontSize: 15 }}>
            We&apos;re registered in SAM.gov, Berry Amendment and TAA compliant, and actively pursuing contracts nationwide.
          </p>
          <a href="#contact"
            className="inline-flex items-center gap-2.5 bg-[#2b7fff] hover:bg-[#1a60d4] text-white px-[40px] py-4 rounded-[5px] text-[14px] font-extrabold uppercase tracking-[.5px] transition-colors no-underline">
            Contact Us
          </a>
          <div className="text-[11px] text-white/28 mt-5 tracking-[1.5px] uppercase">
            gov@amenitysupply.co · Responds within one business day
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#0f0f0f] border-t border-white/[.05] py-10 px-5 md:px-[60px] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="text-[16px] font-extrabold text-white no-underline">
            Amenity <span className="text-[#2b7fff]">Supply Co.</span>
          </div>
          <div className="text-[10px] text-white/25 mt-[5px] uppercase tracking-[1.8px]">
            Government &amp; Institutional Supply · A product of Amenity
          </div>
          <div className="text-[10px] text-white/18 mt-1 tracking-[.5px]">
            UEI: [YOUR UEI] · CAGE: [CAGE CODE] · NAICS: 315210
          </div>
        </div>
        <div className="flex gap-6 flex-wrap">
          {[
            { label: "Products",       href: "#catalog" },
            { label: "Capabilities",   href: "#capabilities" },
            { label: "Codes",          href: "#codes" },
            { label: "Contact Us",     href: "#contact" },
            { label: "Amenity Studio", href: "/" },
            { label: "gov@amenitysupply.co", href: "mailto:gov@amenitysupply.co" },
          ].map(l => (
            <a key={l.label} href={l.href} className="text-white/36 hover:text-white text-[13px] no-underline transition-colors">{l.label}</a>
          ))}
        </div>
        <p className="text-[11px] text-white/20">© 2026 Amenity. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </>
  );
}

"use client";

import "./studio.css";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";


const CATALOG = [
  { label: "T-Shirts\n& Tops",           image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80" },
  { label: "Hoodies\n& Fleece",          image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80" },
  { label: "Pants\n& Shorts",            image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&w=600&q=80" },
  { label: "Headwear\n& Caps",           image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80" },
  { label: "Jackets\n& Outerwear",       image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80" },
  { label: "Medical\n& Scrubs",          image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=600&q=80" },
  { label: "Uniforms\n& Workwear",       image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=600&q=80" },
  { label: "Screen Print\n& Embroidery", image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=600&q=80" },
];

const MARQUEE_ITEMS = [
  "Cut & Sew","Screen Printing","Embroidery",
  "Private Label","Knitwear","Fleece","Activewear","Denim","Headwear",
];

function StudioPageInner() {
  const searchParams = useSearchParams();
  const [authOpen, setAuthOpen]         = useState(false);
  const [startOrder, setStartOrder]     = useState(false);
  const [quoteModal, setQuoteModal]     = useState(false);
  const [quoteService, setQuoteService] = useState("");
  const [toast, setToast]               = useState("");
  const { user }                        = useAuth();
  const router                          = useRouter();

  useEffect(() => {
    if (searchParams.get("auth") === "1" && !user) setAuthOpen(true);
  }, [searchParams, user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function openQuote(service = "") {
    setQuoteService(service);
    setQuoteModal(true);
  }

  function handleStartOrder() {
    if (user) {
      router.push("/dashboard?newWorkspace=1");
    } else {
      setStartOrder(true);
      setAuthOpen(true);
    }
  }

  function submitQuote() {
    showToast("Request received — we'll be in touch within one business day");
    setTimeout(() => setQuoteModal(false), 1400);
  }

  return (
    <>
      <Nav variant="studio" />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#0f0f0f] min-h-screen flex flex-col justify-end px-5 md:px-15 pb-16 md:pb-20 pt-25 md:pt-30 overflow-hidden hero-grid">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 80% 40%, rgba(43,127,255,.08) 0%, transparent 65%)" }} />
        <div className="max-w-300 mx-auto w-full relative z-10">
          <div className="inline-flex items-center gap-2.5 text-2.75 font-bold tracking-[2.5px] uppercase text-blue-500 mb-7">
            <span className="w-7 h-px bg-blue-500" /> American-Made Production
          </div>
          <h1 className="text-white font-black leading-[.92] tracking-[-4px] mb-10"
              style={{ fontSize: "clamp(56px,9vw,112px)" }}>
            You design it.<br /><em>We build it.</em>
          </h1>
          <div className="flex flex-col md:flex-row gap-8 md:items-end md:justify-between">
            <p className="text-white/55 max-w-120" style={{ fontSize: "clamp(15px,1.5vw,18px)" }}>
              Premium cut &amp; sew, screen printing and embroidery — built to your exact spec.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleStartOrder}
                className="w-full sm:w-auto px-6 py-3 rounded-md font-bold text-3.75 bg-white text-[#0f0f0f] hover:bg-[#e5e7eb] transition-colors cursor-pointer border-0 text-center"
              >
                Start an Order
              </button>
              <a href="#catalog"
                className="w-full sm:w-auto px-6 py-3 rounded-md font-bold text-3.75 border-2 border-white/25 text-white hover:border-white/55 transition-colors no-underline text-center">
                View Catalog
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
      <div className="bg-blue-500 text-white py-3 overflow-hidden whitespace-nowrap">
        <div className="marquee-track inline-flex">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 mx-6 text-white font-semibold text-3.25 tracking-[.5px] uppercase">
              {item} <span className="opacity-50">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── CATALOG GRID ─────────────────────────────────────────────────── */}
      <section id="catalog" className="bg-white pt-16 md:pt-25 pb-16 md:pb-25 px-5 md:px-15">
        <div className="max-w-300 mx-auto">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 text-2.5 font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
                <span className="w-5 h-px bg-blue-500" /> What We Make
              </div>
              <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] text-[#0f0f0f]">Production catalog</h2>
            </div>
            <p className="text-[#4b5563] leading-[1.75] max-w-75" style={{ fontSize: 14 }}>
              From 100-unit sampling runs to 500K+ bulk orders. Tell us what you need.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {CATALOG.map((c) => (
              <button
                key={c.label}
                onClick={() => openQuote(c.label.replace("\n", " "))}
                className="relative aspect-3/4 bg-[#111] overflow-hidden cursor-pointer border-0 group"
                style={{ outline: "1px solid rgba(255,255,255,.06)" }}
              >
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${c.image})` }} />
                <div className="absolute inset-0 bg-[rgba(0,0,0,.48)] group-hover:bg-[rgba(0,0,0,.6)] transition-all flex flex-col justify-end p-3 md:p-5.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-3.5 md:text-5.25 font-black tracking-[-0.5px] text-white leading-[1.05] whitespace-pre-line text-left">{c.label}</div>
                    <div className="w-7.5 h-7.5 rounded-full border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:border-blue-500 transition-all">
                      <svg viewBox="0 0 24 24" className="w-3.25 h-3.25" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* ── ORDER / CHAT ─────────────────────────────────────────────────── */}
      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f0f0f] border-t border-white/6">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { v: "300+",    l: "Products in Catalog" },
            { v: "100%",    l: "Domestic Production" },
            { v: "4–6 wk",  l: "Average Lead Time" },
            { v: "24 hr",   l: "Quote Turnaround" },
          ].map(s => (
            <div key={s.l} className="text-center py-8 md:py-9 px-6 md:px-13 border-r border-white/6 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r border-b md:border-b-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0">
              <div className="text-7.5 font-black text-white tracking-[-1.5px]">{s.v}</div>
              <div className="text-2.5 text-white/35 mt-1.25 uppercase tracking-[1.8px]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <section id="services" className="bg-white py-16 md:py-24 px-5 md:px-15">
        <div className="max-w-300 mx-auto">
          <div className="flex items-end justify-between mb-14 gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 text-2.5 font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
                <span className="w-5 h-px bg-blue-500" /> What We Do
              </div>
              <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] text-[#0f0f0f]">Production services</h2>
            </div>
            <p className="text-[#4b5563] leading-[1.75] max-w-80" style={{ fontSize: 14 }}>
              Every service is handled in-house under one roof — no subcontracting, no surprises.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Cut & Sew",            body: "Full-package and CMT cut & sew for wovens, knits, fleece, and denim. From sampling to bulk — all domestic.",                    tags: ["Wovens", "Knits", "Fleece", "Denim", "Full Package", "CMT"] },
              { title: "Screen Printing",       body: "Plastisol, discharge, water-based, and specialty inks on cut & sew pieces or blanks. Up to 8 colors.",                        tags: ["Plastisol", "Discharge", "Water-Based", "Puff Ink", "Spot Color"] },
              { title: "Embroidery",            body: "Flat, 3D puff, and appliqué embroidery on structured caps, garments, and accessories. Any stitch count.",                     tags: ["Flat Embroidery", "3D Puff", "Appliqué", "Caps", "Patches"] },
              { title: "Garment Washing",       body: "Enzyme, bleach, sun-fade, garment dye, and stone-wash finishing for premium aged or vintage aesthetics.",                      tags: ["Enzyme Wash", "Bleach Wash", "Garment Dye", "Sun-Fade", "Stone Wash"] },
              { title: "Private Label",         body: "Custom labels, hang tags, poly-bagging, and retail-ready packaging. We handle every finish detail.",                           tags: ["Woven Labels", "Hang Tags", "Poly-Bag", "Retail Ready", "Size Runs"] },
              { title: "Tech Packs & Samples", body: "We work from your sketches, references, or rough ideas and develop production-ready tech packs and samples.",                  tags: ["Tech Pack Dev", "Proto Samples", "Fit Samples", "Spec Sheets"] },
            ].map(s => (
              <div key={s.title} className="bg-[#f9fafb] rounded-xl p-8 flex flex-col gap-5">
                <div>
                  <h3 className="text-[#0f0f0f] font-black text-5 tracking-[-0.5px] mb-2">{s.title}</h3>
                  <p className="text-[#4b5563] text-3.5 leading-[1.75]">{s.body}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {s.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-white text-[#374151] text-2.75 font-semibold rounded-1">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#0f0f0f] py-16 md:py-24 px-5 md:px-15 border-t border-white/6">
        <div className="max-w-300 mx-auto">
          <div className="inline-flex items-center gap-2.5 text-2.75 font-bold tracking-0.5 uppercase text-[#2b7fff] mb-5">
            <span className="w-5 h-px bg-[#2b7fff]" /> Process
          </div>
          <h2 className="text-white font-black text-9.5 leading-[1.05] tracking-[-1.5px] mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { n:"01", title:"Submit Your Brief", body:"Tell us what you're making — garment type, quantity, timeline, and any references. We review every brief personally." },
              { n:"02", title:"We Quote & Plan", body:"We review your brief and return a full production quote within one business day." },
              { n:"03", title:"We Produce & Deliver", body:"Your order moves into production under our oversight. We coordinate every step — from samples to final delivery." },
            ].map(s => (
              <div key={s.n}>
                <div className="text-[#2b7fff] font-black text-12 leading-none tracking-[-2px] mb-6">{s.n}</div>
                <h3 className="text-white font-bold text-xl mb-3">{s.title}</h3>
                <p className="text-white/45 text-3.75 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="bg-[#2b7fff] py-16 md:py-20 px-5 md:px-15 text-center">
        <div className="max-w-175 mx-auto">
          <h2 className="text-white font-black text-10.5 leading-[1.1] tracking-[-1.5px] mb-5">
            Ready to build your next drop?
          </h2>
          <p className="text-white/70 text-4.25 mb-9">
            Start an order and our team will review your brief and send a full quote within 24 hours.
          </p>
          <button
            onClick={handleStartOrder}
            className="px-9 py-4 bg-white text-[#2b7fff] font-bold text-4 rounded-md hover:bg-[#f3f4f6] transition-colors cursor-pointer border-0"
          >
            Start an Order
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0a0a0a] border-t border-white/6 py-8 px-5 md:px-15">
        <div className="max-w-300 mx-auto flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <span className="text-white font-bold text-3.75">
            Amenity<span className="text-[#2b7fff]"> Studio</span>
          </span>
          <div className="flex gap-6 items-center">
            <a href="/gov" className="text-white/35 text-3.25 hover:text-white/60 no-underline transition-colors">Amenity Supply Co.</a>
            <span className="text-white/20 text-3.25">© 2025 Amenity. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ── QUOTE MODAL ──────────────────────────────────────────────────── */}
      {quoteModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setQuoteModal(false); }}>
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-135 mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <h3 className="text-white font-bold text-lg">{quoteService ? `${quoteService} — Request Quote` : "Request a Quote"}</h3>
              <button onClick={() => setQuoteModal(false)} className="text-white/40 hover:text-white text-xl bg-transparent border-0 cursor-pointer">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Your Name" />
                <input className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Brand / Company" />
              </div>
              <input type="email" className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Email" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="number" className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Quantity (e.g. 300)" />
                <input type="date" className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" />
              </div>
              <textarea rows={3} className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors resize-none" placeholder='e.g. "300 dad caps with embroidery on front, structured 6-panel, black, adjustable strap."' />
              <input className="bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Reference / Inspiration (optional)" />
            </div>
            <div className="px-6 pb-6">
              <button onClick={submitQuote}
                className="w-full bg-[#2b7fff] hover:bg-[#1a60d4] text-white font-semibold text-sm rounded-lg py-3 transition-colors cursor-pointer border-0">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={authOpen} onClose={() => { setAuthOpen(false); setStartOrder(false); }} startOrder={startOrder} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f0f0f] border border-white/10 text-white text-sm px-5 py-3 rounded-full shadow-xl z-400">
          {toast}
        </div>
      )}
    </>
  );
}

export default function StudioPage() {
  return (
    <Suspense>
      <StudioPageInner />
    </Suspense>
  );
}

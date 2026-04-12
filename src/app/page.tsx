"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// ── Capability data ──────────────────────────────────────────────────────────
const CAPS_WASHED = [
  { name: "Premium Garment Wash", subtitle: "Enzyme, bleach & sun-fade finishing", match: "Top Pick",
    tags: ["Enzyme Wash","Garment Dye","Sun-Fade","Bleach Wash"], certs: ["Premium Finish","Luxury Grade"], moq: "200 units", lead: "10–14 wks" },
  { name: "Fleece Cut & Sew", subtitle: "French terry, fleece & heavyweight cotton", match: "Great Fit",
    tags: ["French Terry","Fleece","Heavyweight Cotton","Full Package"], certs: ["CMT","Full Package"], moq: "300 units", lead: "8–12 wks" },
  { name: "Knitwear Production", subtitle: "Fine knit, rib & sweater-knit construction", match: "Available",
    tags: ["Knitwear","Rib Knit","Fine Knit","Premium Finishing"], certs: ["Luxury Grade"], moq: "500 units", lead: "10–14 wks" },
];
const CAPS_DEFAULT = [
  { name: "Domestic Cut & Sew", subtitle: "US-based production, fast turnaround", match: "Top Pick",
    tags: ["Cut & Sew","Screen Print","Embroidery","Private Label"], certs: ["Berry Compliant","USA-Made"], moq: "100 units", lead: "4–6 wks" },
  { name: "Full Package Production", subtitle: "End-to-end domestic garment production", match: "Great Fit",
    tags: ["Full Package","Fleece","Denim","Activewear"], certs: ["Full Package","ISO 9001"], moq: "500 units", lead: "6–10 wks" },
  { name: "Screen Print & Embroidery", subtitle: "Decoration on cut & sew blanks", match: "Available",
    tags: ["Screen Print","Embroidery","Discharge","Puff Ink"], certs: ["USA-Made","Berry Compliant"], moq: "250 units", lead: "3–5 wks" },
];

function getCaps(q: string) {
  const lq = q.toLowerCase();
  if (["gucci","luxury","sun fad","washed","fade","knit"].some(k => lq.includes(k))) return CAPS_WASHED;
  return CAPS_DEFAULT;
}

const CATALOG = [
  { label: "T-Shirts\n& Tops",             cat: "Category 01", gradient: "from-[#1c1c2e] via-[#16213e] to-[#0f3460]" },
  { label: "Hoodies\n& Fleece",            cat: "Category 02", gradient: "from-[#2e1a1a] via-[#1c0909] to-[#3e1010]" },
  { label: "Pants\n& Shorts",              cat: "Category 03", gradient: "from-[#1a2d1a] via-[#0b1b0b] to-[#0e3d0e]" },
  { label: "Headwear\n& Caps",             cat: "Category 04", gradient: "from-[#1c1c1c] via-[#2a2a2a] to-[#1e1e1e]" },
  { label: "Jackets\n& Outerwear",         cat: "Category 05", gradient: "from-[#1a1c30] via-[#0e1219] to-[#1f2b3e]" },
  { label: "Medical\n& Scrubs",            cat: "Category 06", gradient: "from-[#0a1b2e] via-[#0f2848] to-[#1b3d5e]" },
  { label: "Uniforms\n& Workwear",         cat: "Category 07", gradient: "from-[#2e2c1a] via-[#1b1900] to-[#2f2900]" },
  { label: "Screen Print\n& Embroidery",   cat: "Category 08", gradient: "from-[#1c0a30] via-[#130050] to-[#210075]" },
];

const MARQUEE_ITEMS = [
  "Cut & Sew","Screen Printing","Embroidery","Full Package Production",
  "Private Label","Knitwear","Fleece","Activewear","Denim","Headwear",
];

interface ChatMsg { role: "user" | "ai"; text: string; results?: typeof CAPS_DEFAULT; }

function StudioPageInner() {
  const searchParams = useSearchParams();
  const [authOpen, setAuthOpen]         = useState(false);
  const [startOrder, setStartOrder]     = useState(false);
  const [quoteModal, setQuoteModal]     = useState(false);
  const [quoteService, setQuoteService] = useState("");
  const [toast, setToast]               = useState("");
  const [messages, setMessages]         = useState<ChatMsg[]>([
    { role: "ai", text: "Hi — tell me what you're making and I'll show you what we can build." }
  ]);
  const [inputVal, setInputVal]         = useState("");
  const chatRef                         = useRef<HTMLDivElement>(null);
  const { user }                        = useAuth();
  const router                          = useRouter();

  useEffect(() => {
    if (searchParams.get("auth") === "1" && !user) setAuthOpen(true);
  }, [searchParams, user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function sendChat() {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setTimeout(() => {
      const results = getCaps(text);
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "Here's what we can build for you:", results },
      ]);
    }, 800);
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
      <section className="relative bg-[#0f0f0f] flex flex-col justify-start px-5 md:px-[60px] pb-16 md:pb-20 pt-[100px] md:pt-[120px] overflow-hidden hero-grid">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 80% 40%, rgba(43,127,255,.08) 0%, transparent 65%)" }} />
        <div className="max-w-[1200px] mx-auto w-full relative z-10">
          <div className="inline-flex items-center gap-2.5 text-[11px] font-bold tracking-[2.5px] uppercase text-[#2b7fff] mb-7">
            <span className="w-7 h-px bg-[#2b7fff]" /> American-Made Production
          </div>
          <h1 className="text-white font-black leading-[.92] tracking-[-4px] mb-10"
              style={{ fontSize: "clamp(56px,9vw,112px)" }}>
            You design it.<br /><em>We build it.</em>
          </h1>
          <div className="flex flex-col md:flex-row gap-8 md:items-end md:justify-between">
            <p className="text-white/55 max-w-[480px]" style={{ fontSize: "clamp(15px,1.5vw,18px)" }}>
              Premium cut &amp; sew, screen printing, embroidery, and full-package production — built to your exact spec. Domestic lead times. No middlemen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleStartOrder}
                className="w-full sm:w-auto px-7 py-4 rounded-md font-bold text-[15px] bg-white text-[#0f0f0f] hover:bg-[#e5e7eb] transition-colors cursor-pointer border-0 text-center"
              >
                Start an Order
              </button>
              <a href="#catalog"
                className="w-full sm:w-auto px-7 py-4 rounded-md font-bold text-[15px] border-2 border-white/25 text-white hover:border-white/55 transition-colors no-underline text-center">
                View Catalog
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
      <div className="bg-[#2b7fff] py-3 overflow-hidden whitespace-nowrap">
        <div className="marquee-track inline-flex">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 mx-6 text-white font-semibold text-[13px] tracking-[.5px] uppercase">
              {item} <span className="opacity-50">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── CATALOG GRID ─────────────────────────────────────────────────── */}
      <section id="catalog" className="bg-white pt-16 md:pt-[100px] pb-16 md:pb-[100px] px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[2.5px] uppercase text-[#2b7fff] mb-4">
                <span className="w-5 h-px bg-[#2b7fff]" /> What We Make
              </div>
              <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-[-2px] leading-[1.02] text-[#0f0f0f]">Production catalog</h2>
            </div>
            <p className="text-[#4b5563] leading-[1.75] max-w-[300px]" style={{ fontSize: 14 }}>
              From 100-unit sampling runs to 500K+ bulk orders. Tell us what you need.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {CATALOG.map((c) => (
              <button
                key={c.label}
                onClick={() => openQuote(c.label.replace("\n", " "))}
                className={`relative aspect-[3/4] bg-gradient-to-br ${c.gradient} overflow-hidden cursor-pointer border-0 group`}
                style={{ outline: "1px solid rgba(255,255,255,.04)" }}
              >
                <div className="absolute inset-0 opacity-[.035]" style={{
                  backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(255,255,255,1) 18px,rgba(255,255,255,1) 19px)"
                }} />
                <div className="absolute inset-0 bg-[rgba(0,0,0,.38)] group-hover:bg-[rgba(0,0,0,.58)] transition-all flex flex-col justify-end p-3 md:p-[22px]">
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

      {/* ── ORDER / CHAT ─────────────────────────────────────────────────── */}
      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="bg-[#0f0f0f] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { v: "300+",    l: "Products in Catalog" },
            { v: "100%",    l: "Domestic Production" },
            { v: "4–6 wk",  l: "Average Lead Time" },
            { v: "24 hr",   l: "Quote Turnaround" },
          ].map(s => (
            <div key={s.l} className="text-center py-10 px-6 border-r border-white/[0.06] last:border-r-0 border-b md:border-b-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r md:[&:nth-child(3)]:border-r">
              <div className="text-[28px] font-black text-white tracking-[-1px]">{s.v}</div>
              <div className="text-[11px] text-white/35 mt-1.5 uppercase tracking-[1.5px]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="order" className="bg-[#0f0f0f] py-16 md:py-24 px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <div className="inline-flex items-center gap-2.5 text-[11px] font-bold tracking-[2px] uppercase text-[#2b7fff] mb-5">
              <span className="w-5 h-px bg-[#2b7fff]" /> Production Finder
            </div>
            <h2 className="text-white font-black text-[38px] leading-[1.05] tracking-[-1.5px] mb-5">
              Tell us what you&apos;re building.
            </h2>
            <p className="text-white/45 text-[15px] mb-8">
              Describe your project and our AI shows you exactly what we can build — cut &amp; sew, print, embroidery, or full package.
            </p>
            <div className="flex flex-col gap-2.5">
              {["Cut & Sew + Screen Print","Embroidery on structured caps","Heavyweight fleece crewneck","Washed denim workwear"].map(tag => (
                <button key={tag} onClick={() => setInputVal(tag)}
                  className="self-start px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/10 text-white/60 text-[12px] hover:bg-white/10 hover:text-white transition-colors cursor-pointer border-solid">
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden h-[480px]">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2b7fff]" />
              <span className="text-white/55 text-[13px]">Amenity Production AI</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold
                    ${m.role === "ai" ? "bg-[#2b7fff] text-white" : "bg-white/10 text-white"}`}>
                    {m.role === "ai" ? "A" : "Y"}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px]
                    ${m.role === "ai" ? "bg-white/[0.06] text-white/80" : "bg-[#2b7fff] text-white"}`}>
                    {m.text}
                    {m.results && (
                      <div className="mt-3 flex flex-col gap-2">
                        {m.results.map((r, ri) => (
                          <div key={ri} className="bg-white/[0.06] rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-white font-semibold text-[13px]">{r.name}</span>
                              <span className="text-[#2b7fff] text-[11px] font-bold">{r.match}</span>
                            </div>
                            <p className="text-white/50 text-[11px] mb-2">{r.subtitle}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {r.tags.map(t => (
                                <span key={t} className="px-2 py-0.5 bg-white/[0.08] rounded text-white/60 text-[10px]">{t}</span>
                              ))}
                            </div>
                            <div className="flex gap-4 text-[11px] text-white/40">
                              <span>MOQ {r.moq}</span><span>Lead {r.lead}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/[0.06] flex gap-2">
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Describe your project…"
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-[13px] outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors"
              />
              <button onClick={sendChat}
                className="px-4 py-2.5 bg-[#2b7fff] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1a60d4] transition-colors cursor-pointer border-0">
                Send
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#0f0f0f] py-16 md:py-24 px-5 md:px-[60px] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto">
          <div className="inline-flex items-center gap-2.5 text-[11px] font-bold tracking-[2px] uppercase text-[#2b7fff] mb-5">
            <span className="w-5 h-px bg-[#2b7fff]" /> Process
          </div>
          <h2 className="text-white font-black text-[38px] leading-[1.05] tracking-[-1.5px] mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { n:"01", title:"Submit Your Brief", body:"Tell us what you're making — garment type, quantity, timeline, references. Our AI instantly shows you what we can build." },
              { n:"02", title:"We Quote & Plan", body:"We review your brief and return a full production quote within one business day." },
              { n:"03", title:"We Produce & Deliver", body:"Your order moves into production under our oversight. We coordinate every step — from samples to final delivery." },
            ].map(s => (
              <div key={s.n}>
                <div className="text-[#2b7fff] font-black text-[48px] leading-none tracking-[-2px] mb-6">{s.n}</div>
                <h3 className="text-white font-bold text-xl mb-3">{s.title}</h3>
                <p className="text-white/45 text-[15px] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="bg-[#2b7fff] py-16 md:py-20 px-5 md:px-[60px] text-center">
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-white font-black text-[42px] leading-[1.1] tracking-[-1.5px] mb-5">
            Ready to build your next drop?
          </h2>
          <p className="text-white/70 text-[17px] mb-9">
            Start an order and our team will review your brief and send a full quote within 24 hours.
          </p>
          <button
            onClick={handleStartOrder}
            className="px-9 py-4 bg-white text-[#2b7fff] font-bold text-[16px] rounded-md hover:bg-[#f3f4f6] transition-colors cursor-pointer border-0"
          >
            Start an Order
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0a0a0a] border-t border-white/[0.06] py-8 px-5 md:px-[60px]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <span className="text-white font-bold text-[15px]">
            Amenity<span className="text-[#2b7fff]"> Studio</span>
          </span>
          <div className="flex gap-6 items-center">
            <a href="/gov" className="text-white/35 text-[13px] hover:text-white/60 no-underline transition-colors">Amenity Supply Co.</a>
            <span className="text-white/20 text-[13px]">© 2025 Amenity. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ── QUOTE MODAL ──────────────────────────────────────────────────── */}
      {quoteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setQuoteModal(false); }}>
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-[540px] mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
              <h3 className="text-white font-bold text-lg">{quoteService ? `${quoteService} — Request Quote` : "Request a Quote"}</h3>
              <button onClick={() => setQuoteModal(false)} className="text-white/40 hover:text-white text-xl bg-transparent border-0 cursor-pointer">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Your Name" />
                <input className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Brand / Company" />
              </div>
              <input type="email" className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Email" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="number" className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Quantity (e.g. 300)" />
                <input type="date" className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" />
              </div>
              <textarea rows={3} className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors resize-none" placeholder='e.g. "300 dad caps with embroidery on front, structured 6-panel, black, adjustable strap."' />
              <input className="bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" placeholder="Reference / Inspiration (optional)" />
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f0f0f] border border-white/10 text-white text-sm px-5 py-3 rounded-full shadow-xl z-[400]">
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

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Handbag,
  List,
  X,
  CaretDown,
  Sparkle,
  Storefront,
  Factory,
  Package,
  Info,
  Envelope,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { getLocalCart } from "@/lib/localCart";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import AuthModal from "@/components/AuthModal";
import type { HydratedCart } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Nav data
// ─────────────────────────────────────────────────────────────────────────────

const BRANDS_SERVICES = [
  {
    Icon: Storefront,
    accent: "bg-emerald-500/20 text-emerald-400",
    label: "Marketplace",
    sub: "Shop retail and wholesale blanks",
    href: "/shop",
  },
  {
    Icon: Sparkle,
    accent: "bg-violet-500/20 text-violet-400",
    label: "Liai",
    sub: "Find what you need, fast",
    href: "/products/liai",
  },
];

const BRANDS_RESOURCES = [
  { label: "Use Cases",            href: "/use-cases"   },
  { label: "Manufacturer Network", href: "/manufacturers" },
];

const GOVT_SERVICES = [
  {
    Icon: Package,
    accent: "bg-sky-500/20 text-sky-400",
    label: "Wholesale",
    sub: "Bulk uniform and apparel programs",
    href: "/use-cases/uniform-workwear-suppliers",
  },
  {
    Icon: Factory,
    accent: "bg-amber-500/20 text-amber-400",
    label: "Manufacturing",
    sub: "Berry & TAA-compliant sourcing",
    href: "/use-cases/government-agencies",
  },
];

const COMPANY_LINKS = [
  { Icon: Info,     label: "About",      href: "/about"   },
  { Icon: Envelope, label: "Contact Us", href: "/contact" },
];

type OpenMenu = "brands" | "government" | "company" | null;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SiteHeader() {
  const [signedIn, setSignedIn]   = useState<boolean | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [authOpen, setAuthOpen]   = useState(false);
  const [openMenu, setOpenMenu]   = useState<OpenMenu>(null);

  const [mobileBrandsOpen,  setMobileBrandsOpen]  = useState(false);
  const [mobileGovtOpen,    setMobileGovtOpen]    = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navRef  = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // Floating pill on scroll
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 16);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpenMenu(null);
    setMenuOpen(false);
  }, [pathname]);

  // Cart + auth
  useEffect(() => {
    let cancelled = false;

    const lc0 = getLocalCart();
    const t0  = lc0.reduce((s, i) => s + i.quantity, 0);
    if (t0 > 0) setCartCount(t0);

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      if (data.session) refreshCart();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSignedIn(!!session);
      if (session) refreshCart();
      else {
        const lc = getLocalCart();
        setCartCount(lc.reduce((s, i) => s + i.quantity, 0));
      }
    });

    async function refreshCart() {
      try {
        const c = await apiGet<HydratedCart>("/cart");
        setCartCount((c.items ?? []).reduce((a, i) => a + (i.quantity ?? 0), 0));
      } catch {
        const lc = getLocalCart();
        setCartCount(lc.reduce((s, i) => s + i.quantity, 0));
      }
    }

    function onLocalCartUpdate() {
      const lc = getLocalCart();
      setCartCount(lc.reduce((s, i) => s + i.quantity, 0));
    }
    window.addEventListener("localcart:updated", onLocalCartUpdate);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("localcart:updated", onLocalCartUpdate);
    };
  }, []);

  function toggle(menu: OpenMenu) {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }

  function closeAll() {
    setOpenMenu(null);
    setMenuOpen(false);
    setMobileBrandsOpen(false);
    setMobileGovtOpen(false);
    setMobileCompanyOpen(false);
  }

  function openAuth() {
    closeAll();
    setAuthOpen(true);
  }

  function triggerCls(key: OpenMenu) {
    const isActive =
      key === "brands"
        ? pathname.startsWith("/shop") || pathname.startsWith("/products/liai")
        : key === "government"
        ? pathname.startsWith("/use-cases/government") || pathname.startsWith("/use-cases/uniform")
        : key === "company"
        ? pathname.startsWith("/about") || pathname.startsWith("/contact")
        : false;
    return `inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm transition-colors duration-200 hover:text-white ${
      isActive ? "font-medium text-white" : "text-white/70"
    }`;
  }

  return (
    <>
      {/*
        At top: full-width bar, bg-black/90, border-b.
        On scroll: outer header becomes a transparent runway; inner nav
        contracts into a floating pill with rounded-full + shadow.
      */}
      <header
        ref={navRef}
        className={`sticky top-0 z-30 transition-all duration-300 ease-in-out ${
          scrolled
            ? "bg-transparent py-2"
            : "bg-black/90 backdrop-blur-xl backdrop-saturate-150 border-b border-white/10"
        }`}
      >
        <nav className={`mx-auto flex items-center justify-between transition-all duration-300 ease-in-out ${
          scrolled
            ? "max-w-[1160px] px-5 py-2.5 mx-4 sm:mx-auto rounded-full bg-black/90 backdrop-blur-xl backdrop-saturate-150 shadow-2xl shadow-black/50 ring-1 ring-white/15"
            : "max-w-[1200px] px-4 sm:px-0 py-3"
        }`}>

          {/* ── Left: logo + nav ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0 pr-4" aria-label="Amenity home">
              {/* White mark logo — renders perfectly on dark bg */}
              <img
                src="/logo.svg"
                alt="Amenity"
                width={28}
                height={30}
                className="h-[26px] w-auto"
              />
              <span className="font-display text-lg tracking-tight text-white">Amenity</span>
            </Link>

            {/* Desktop nav items */}
            <ul className="hidden items-center gap-0 md:flex">

              {/* Brands */}
              <li className="relative">
                <button type="button" onClick={() => toggle("brands")} className={triggerCls("brands")}>
                  Brands
                  <CaretDown size={11} weight="bold" aria-hidden
                    className={`transition-transform duration-150 ${openMenu === "brands" ? "rotate-180" : ""}`}
                  />
                </button>
                {openMenu === "brands" && (
                  <MegaDropdown onClose={() => setOpenMenu(null)}>
                    <DropdownHeader label="For Brands" />
                    <div className="grid grid-cols-[1fr_180px] gap-0 p-5 pt-4">
                      <div>
                        <SectionLabel>Services</SectionLabel>
                        <ul className="mt-3 flex flex-col gap-1">
                          {BRANDS_SERVICES.map((s) => (
                            <ServiceItem key={s.href} {...s} onClose={() => setOpenMenu(null)} />
                          ))}
                        </ul>
                      </div>
                      <div className="border-l border-white/10 pl-5">
                        <SectionLabel>Resources</SectionLabel>
                        <ul className="mt-3 flex flex-col gap-1">
                          {BRANDS_RESOURCES.map((r) => (
                            <ResourceItem key={r.href} {...r} onClose={() => setOpenMenu(null)} />
                          ))}
                        </ul>
                      </div>
                    </div>
                  </MegaDropdown>
                )}
              </li>

              {/* Government */}
              <li className="relative">
                <button type="button" onClick={() => toggle("government")} className={triggerCls("government")}>
                  Government
                  <CaretDown size={11} weight="bold" aria-hidden
                    className={`transition-transform duration-150 ${openMenu === "government" ? "rotate-180" : ""}`}
                  />
                </button>
                {openMenu === "government" && (
                  <MegaDropdown onClose={() => setOpenMenu(null)}>
                    <DropdownHeader label="For Government" />
                    <div className="p-5 pt-4">
                      <SectionLabel>Services</SectionLabel>
                      <ul className="mt-3 flex flex-col gap-1">
                        {GOVT_SERVICES.map((s) => (
                          <ServiceItem key={s.href} {...s} onClose={() => setOpenMenu(null)} />
                        ))}
                      </ul>
                    </div>
                  </MegaDropdown>
                )}
              </li>

              {/* Company */}
              <li className="relative">
                <button type="button" onClick={() => toggle("company")} className={triggerCls("company")}>
                  Company
                  <CaretDown size={11} weight="bold" aria-hidden
                    className={`transition-transform duration-150 ${openMenu === "company" ? "rotate-180" : ""}`}
                  />
                </button>
                {openMenu === "company" && (
                  <MegaDropdown align="left" onClose={() => setOpenMenu(null)}>
                    <div className="p-4">
                      <ul className="flex flex-col gap-1">
                        {COMPANY_LINKS.map(({ Icon, label, href }) => (
                          <li key={href}>
                            <Link
                              href={href}
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/10"
                            >
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                                <Icon size={15} weight="regular" className="text-neutral-300" aria-hidden />
                              </div>
                              <span className="text-sm font-medium text-white">{label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </MegaDropdown>
                )}
              </li>

              {/* Shop */}
              <li>
                <Link
                  href="/shop"
                  className={`rounded-full px-3 py-2 text-sm transition-colors duration-200 hover:text-white ${
                    pathname.startsWith("/shop") ? "font-medium text-white" : "text-white/70"
                  }`}
                >
                  Shop
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Right: Sign In + Cart ─────────────────────────────────────── */}
          <div className="hidden items-center gap-3 md:flex">
            {signedIn === null ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
            ) : (
              <button
                type="button"
                onClick={openAuth}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                {signedIn ? "Account" : "Sign In"}
              </button>
            )}
            <CartButton count={cartCount} />
          </div>

          {/* ── Mobile: cart + hamburger ──────────────────────────────────── */}
          <div className="flex items-center gap-3 md:hidden">
            <CartButton count={cartCount} size={22} />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="text-white/70 transition-colors hover:text-white"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen
                ? <X size={22} weight="regular" aria-hidden />
                : <List size={22} weight="regular" aria-hidden />}
            </button>
          </div>
        </nav>

        {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-black/80 px-6 py-5 backdrop-blur-xl md:hidden">
            <ul className="flex flex-col gap-1 text-sm">

              {/* Brands */}
              <MobileSection label="Brands" open={mobileBrandsOpen} onToggle={() => setMobileBrandsOpen((v) => !v)}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Services</p>
                {BRANDS_SERVICES.map(({ Icon, accent, label, sub, href }) => (
                  <Link key={href} href={href} onClick={closeAll}
                    className="flex items-center gap-3 rounded-lg py-2 transition-colors hover:text-white">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}>
                      <Icon size={14} weight="fill" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-white/50">{sub}</p>
                    </div>
                  </Link>
                ))}
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Resources</p>
                  {BRANDS_RESOURCES.map(({ label, href }) => (
                    <Link key={href} href={href} onClick={closeAll}
                      className="flex items-center gap-1.5 py-1.5 text-sm text-white/60 hover:text-white">
                      {label}
                      <ArrowUpRight size={10} weight="bold" aria-hidden />
                    </Link>
                  ))}
                </div>
              </MobileSection>

              {/* Government */}
              <MobileSection label="Government" open={mobileGovtOpen} onToggle={() => setMobileGovtOpen((v) => !v)}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Services</p>
                {GOVT_SERVICES.map(({ Icon, accent, label, sub, href }) => (
                  <Link key={href} href={href} onClick={closeAll}
                    className="flex items-center gap-3 rounded-lg py-2 transition-colors hover:text-white">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}>
                      <Icon size={14} weight="fill" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-white/50">{sub}</p>
                    </div>
                  </Link>
                ))}
              </MobileSection>

              {/* Company */}
              <MobileSection label="Company" open={mobileCompanyOpen} onToggle={() => setMobileCompanyOpen((v) => !v)}>
                {COMPANY_LINKS.map(({ label, href }) => (
                  <Link key={href} href={href} onClick={closeAll}
                    className="block py-1.5 text-sm text-white/70 hover:text-white">
                    {label}
                  </Link>
                ))}
              </MobileSection>

              {/* Shop */}
              <li className="border-t border-white/10 pt-3 mt-1">
                <Link href="/shop" onClick={closeAll}
                  className="block py-1.5 text-sm text-white/70 transition-colors hover:text-white">
                  Shop
                </Link>
              </li>

              {/* Cart */}
              <li>
                <Link href="/shop/cart" onClick={closeAll}
                  className="flex items-center gap-2 py-1.5 text-sm text-white/70 transition-colors hover:text-white">
                  <Handbag size={16} aria-hidden />
                  Cart {cartCount > 0 && <span className="font-semibold text-white">({cartCount})</span>}
                </Link>
              </li>

              {/* Sign In */}
              <li className="mt-3">
                <button type="button" onClick={openAuth}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90">
                  {signedIn ? "Account" : "Sign In"}
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MegaDropdown({
  children,
  align = "left",
  onClose: _onClose,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  onClose: () => void;
}) {
  const posClass =
    align === "right" ? "right-0"
    : align === "center" ? "left-1/2 -translate-x-1/2"
    : "left-0";

  return (
    <div className={`absolute top-full z-50 mt-3 min-w-[300px] rounded-2xl bg-neutral-950/95 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl ${posClass}`}>
      {/* Arrow pip */}
      <div className={`absolute -top-[6px] h-3 w-3 rotate-45 rounded-[2px] bg-neutral-950 ring-1 ring-white/10 ${
        align === "right" ? "right-5" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-5"
      }`} />
      {children}
    </div>
  );
}

function DropdownHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-white/10 px-5 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{children}</p>
  );
}

function ServiceItem({
  Icon,
  accent,
  label,
  sub,
  href,
  onClose,
}: {
  Icon: React.ElementType;
  accent: string;
  label: string;
  sub: string;
  href: string;
  onClose: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-white/8"
      >
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={18} weight="fill" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-white/50">{sub}</p>
        </div>
      </Link>
    </li>
  );
}

function ResourceItem({
  label,
  href,
  onClose,
}: {
  label: string;
  href: string;
  onClose: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-white/50 transition-colors hover:bg-white/8 hover:text-white"
      >
        {label}
        <ArrowUpRight size={11} weight="bold" aria-hidden className="opacity-60" />
      </Link>
    </li>
  );
}

function CartButton({ count, size = 20 }: { count: number; size?: number }) {
  return (
    <Link
      href="/shop/cart"
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition-all duration-200 hover:text-white hover:ring-1 hover:ring-white/30"
      aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
    >
      <Handbag
        size={size}
        weight="regular"
        aria-hidden
        className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-6"
      />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-black">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function MobileSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="border-b border-white/10 py-2 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
      >
        {label}
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="mt-2 pb-2 pl-1">{children}</div>}
    </li>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

interface NavProps {
  variant?: "studio" | "gov";
  autoOpenAuth?: boolean;
  startOrder?: boolean;
}

export default function Nav({ variant = "studio", autoOpenAuth, startOrder }: NavProps) {
  const { user, signOut, loading } = useAuth();
  const [authOpen, setAuthOpen]     = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpenAuth && !loading && !user) setAuthOpen(true);
  }, [autoOpenAuth, loading, user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isGov    = variant === "gov";
  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  // Gov nav: always navy glassmorphism; Studio nav: always dark glassmorphism
  const navBg = !isGov
    ? "bg-[rgba(15,15,15,0.96)] backdrop-blur-xl border-b border-white/[0.07]"
    : "bg-[#0b1628]/80 backdrop-blur-xl border-b border-white/[0.1]";

  // eyebrow is h-9 = 36px; .gov-nav-top positions nav at 48px on desktop (36px eyebrow + 12px gap)
  const navTop = isGov ? "gov-nav-top" : "top-0";

  const logoColor  = "text-white";
  const govBadgeBg = "bg-white/15";
  const linkColor  = isGov
    ? "text-white/70 hover:text-white border-transparent hover:border-white"
    : "text-white/55 hover:text-white";
  const hamColor   = "bg-white";

  const govLinkBase = "text-[12px] font-bold uppercase tracking-[.8px] no-underline transition-colors border-b-2 pb-[2px]";
  const studioLink  = `text-[13px] font-medium no-underline transition-colors ${linkColor}`;

  return (
    <>
      <nav className={`fixed w-full z-[100] flex items-center justify-between px-5 md:px-12 h-[60px] transition-all duration-300 ${navTop} ${navBg}`}>

        {/* Logo */}
        <Link href={isGov ? "/gov" : "/"} className={`flex items-center gap-2.5 text-[16px] font-extrabold tracking-tight no-underline transition-colors duration-300 ${logoColor}`}>
          {isGov ? (
            <>
              <span className={`${govBadgeBg} text-white text-[9px] font-extrabold tracking-[2px] uppercase px-[7px] py-[3px] rounded-[3px] transition-colors duration-300`}>Gov</span>
              Amenity <span className="text-[#2b7fff]">Supply Co.</span>
            </>
          ) : (
            <>Amenity<span className="text-[#2b7fff]"> Studio</span></>
          )}
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-7 list-none m-0 p-0">
          {isGov ? (
            <>
              <li><a href="#catalog"      className={`${govLinkBase} ${linkColor}`}>Products</a></li>
              <li><a href="#capabilities" className={`${govLinkBase} ${linkColor}`}>Capabilities</a></li>
              <li><a href="#codes"        className={`${govLinkBase} ${linkColor}`}>NAICS &amp; Codes</a></li>
              <li><a href="#contact"      className={`${govLinkBase} ${linkColor}`}>Contact Us</a></li>
              <li><Link href="/"          className={`${govLinkBase} ${linkColor}`}>Amenity Studio</Link></li>
            </>
          ) : (
            <>
              <li><a href="#catalog"      className={studioLink}>Catalog</a></li>
              <li><a href="#services"     className={studioLink}>Services</a></li>
              <li><a href="#how-it-works" className={studioLink}>How It Works</a></li>
              <li><Link href="/gov"       className={studioLink}>Amenity Supply Co.</Link></li>
            </>
          )}
        </ul>

        {/* Desktop CTA / user */}
        <div className="hidden md:flex items-center gap-2.5">
          {isGov ? (
            <>
              <a href="#capabilities"
                className="inline-flex items-center px-4 py-[9px] rounded-[5px] text-[12px] font-bold uppercase tracking-[.6px] cursor-pointer border-2 border-white/40 bg-transparent text-white hover:bg-white hover:text-[#0b1628] transition-all no-underline">
                Capability Statement
              </a>
              <a href="#contact"
                className="inline-flex items-center px-4 py-[9px] rounded-[5px] text-[12px] font-bold uppercase tracking-[.6px] cursor-pointer border-0 bg-[#2b7fff] text-white hover:bg-[#1a60d4] transition-all no-underline">
                Contact Us
              </a>
            </>
          ) : loading ? (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : user ? (
            <>
              <Link href="/dashboard"
                className="inline-flex items-center px-[18px] py-2 rounded-md text-[13px] font-semibold bg-[#2b7fff] text-white no-underline hover:bg-[#1a60d4] transition-colors">
                Dashboard
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen((v) => !v)}
                  className="w-8 h-8 rounded-full bg-[#2b7fff] flex items-center justify-center text-[12px] font-bold text-white cursor-pointer border-0">
                  {initials}
                </button>
                {menuOpen && (
                  <div className="absolute top-[calc(100%+10px)] right-0 bg-[#1a1a1a] border border-white/10 rounded-xl min-w-[180px] overflow-hidden shadow-2xl">
                    <div className="px-3.5 py-3 border-b border-white/[0.08]">
                      <p className="text-[13px] font-semibold text-white">{user.displayName ?? "Studio Member"}</p>
                      <p className="text-[11px] text-white/40 mt-0.5">{user.email}</p>
                    </div>
                    <Link href="/dashboard" className="block px-3.5 py-2.5 text-[13px] text-white/70 hover:bg-white/5 hover:text-white no-underline transition-colors">
                      My Workspaces
                    </Link>
                    <button onClick={() => { signOut(); setMenuOpen(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-400/[0.08] transition-colors bg-transparent border-0 cursor-pointer">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setAuthOpen(true)}
                className="inline-flex items-center px-[18px] py-2 rounded-md text-[13px] font-semibold cursor-pointer border transition-colors bg-transparent text-white/65 border-white/20 hover:border-white/45 hover:text-white">
                Sign In
              </button>
              <button onClick={() => setAuthOpen(true)}
                className="inline-flex items-center px-[18px] py-2 rounded-md text-[13px] font-semibold bg-[#2b7fff] text-white hover:bg-[#1a60d4] cursor-pointer border-0 transition-colors">
                Start Order
              </button>
            </>
          )}
        </div>

        {/* Mobile: quick CTA + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {!isGov && !loading && !user && (
            <button onClick={() => setAuthOpen(true)}
              className="px-3.5 py-1.5 rounded-md text-[12px] font-semibold bg-[#2b7fff] text-white border-0 cursor-pointer">
              Start Order
            </button>
          )}
          {isGov && (
            <a href="#contact" className="px-3.5 py-1.5 rounded-md text-[12px] font-semibold bg-[#2b7fff] text-white no-underline">
              Contact
            </a>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="w-9 h-9 flex flex-col justify-center items-center gap-[5px] bg-transparent border-0 cursor-pointer outline-none">
            <span className={`block h-[1.5px] w-[20px] transition-all origin-center ${hamColor} ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
            <span className={`block h-[1.5px] w-[20px] transition-all ${hamColor} ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-[1.5px] w-[20px] transition-all origin-center ${hamColor} ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={`fixed left-0 right-0 z-[99] md:hidden py-3 px-5 flex flex-col top-[60px] ${
          isGov
            ? "bg-[#0b1628]/85 backdrop-blur-2xl border-b border-white/[0.1]"
            : "bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10"
        }`}>
          {isGov ? (
            <>
              {[
                { href: "#catalog",      label: "Products" },
                { href: "#capabilities", label: "Capabilities" },
                { href: "#codes",        label: "NAICS & Codes" },
                { href: "#contact",      label: "Contact Us" },
              ].map(({ href, label }) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="text-white/80 text-[14px] font-bold uppercase tracking-[.8px] no-underline py-3 border-b border-white/[0.1] last:border-b-0">
                  {label}
                </a>
              ))}
              <Link href="/" className="text-white/45 text-[14px] font-bold uppercase tracking-[.8px] no-underline pt-3">
                Amenity Studio →
              </Link>
            </>
          ) : (
            <>
              {[
                { href: "#catalog",      label: "Catalog" },
                { href: "#services",     label: "Services" },
                { href: "#how-it-works", label: "How It Works" },
              ].map(({ href, label }) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="text-white/70 text-[15px] font-medium no-underline py-3 border-b border-white/[0.08]">
                  {label}
                </a>
              ))}
              <Link href="/gov" className="text-white/70 text-[15px] font-medium no-underline py-3 border-b border-white/[0.08]">
                Amenity Supply Co.
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="text-white text-[15px] font-semibold no-underline py-3 border-b border-white/[0.08]">
                    My Dashboard
                  </Link>
                  <button onClick={() => { signOut(); setMobileOpen(false); }}
                    className="text-left text-red-400 text-[14px] font-medium py-3 bg-transparent border-0 cursor-pointer">
                    Sign Out
                  </button>
                </>
              ) : (
                <button onClick={() => { setMobileOpen(false); setAuthOpen(true); }}
                  className="text-left text-white/55 text-[15px] font-medium py-3 bg-transparent border-0 cursor-pointer">
                  Sign In
                </button>
              )}
            </>
          )}
        </div>
      )}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} startOrder={startOrder} />
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

interface NavProps {
  variant?: "studio" | "gov";
  /** If true, open auth modal immediately (e.g. redirected from /dashboard) */
  autoOpenAuth?: boolean;
  /** If true, redirect to dashboard with new workspace after auth */
  startOrder?: boolean;
}

export default function Nav({ variant = "studio", autoOpenAuth, startOrder }: NavProps) {
  const { user, signOut, loading } = useAuth();
  const [authOpen, setAuthOpen]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef                   = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <nav className={`fixed w-full z-[100] flex items-center justify-between px-12 h-[60px] ${isGov ? "top-9" : "top-0"} ${
        isGov
          ? "bg-white border-b-2 border-black"
          : "bg-[rgba(15,15,15,0.96)] backdrop-blur-xl border-b border-white/[0.07]"
      }`}>
        {/* Logo */}
        <Link href={isGov ? "/gov" : "/"} className={`flex items-center gap-2.5 text-[16px] font-extrabold tracking-tight no-underline ${isGov ? "text-black" : "text-white"}`}>
          {isGov ? (
            <>
              <span className="bg-[#0b1628] text-white text-[9px] font-extrabold tracking-[2px] uppercase px-[7px] py-[3px] rounded-[3px]">Gov</span>
              Amenity <span className="text-[#2b7fff]">Supply Co.</span>
            </>
          ) : (
            <>Amenity<span className="text-[#2b7fff]"> Studio</span></>
          )}
        </Link>

        {/* Links */}
        <ul className="flex gap-7 list-none m-0 p-0">
          {isGov ? (
            <>
              <li><a href="#catalog"       className="text-[#4b5563] hover:text-black text-[12px] font-bold uppercase tracking-[.8px] no-underline transition-colors border-b-2 border-transparent hover:border-[#2b7fff] pb-[2px]">Products</a></li>
              <li><a href="#capabilities"  className="text-[#4b5563] hover:text-black text-[12px] font-bold uppercase tracking-[.8px] no-underline transition-colors border-b-2 border-transparent hover:border-[#2b7fff] pb-[2px]">Capabilities</a></li>
              <li><a href="#codes"         className="text-[#4b5563] hover:text-black text-[12px] font-bold uppercase tracking-[.8px] no-underline transition-colors border-b-2 border-transparent hover:border-[#2b7fff] pb-[2px]">NAICS &amp; Codes</a></li>
              <li><a href="#contact"       className="text-[#4b5563] hover:text-black text-[12px] font-bold uppercase tracking-[.8px] no-underline transition-colors border-b-2 border-transparent hover:border-[#2b7fff] pb-[2px]">Contact Us</a></li>
              <li><Link href="/"           className="text-[#4b5563] hover:text-black text-[12px] font-bold uppercase tracking-[.8px] no-underline transition-colors border-b-2 border-transparent hover:border-[#2b7fff] pb-[2px]">Amenity Studio</Link></li>
</>
          ) : (
            <>
              <li><a href="#catalog"       className="text-white/55 hover:text-white text-[13px] font-medium no-underline transition-colors">Catalog</a></li>
              <li><a href="#order"         className="text-white/55 hover:text-white text-[13px] font-medium no-underline transition-colors">Get a Quote</a></li>
              <li><a href="#how-it-works"  className="text-white/55 hover:text-white text-[13px] font-medium no-underline transition-colors">How It Works</a></li>
              <li><Link href="/gov"        className="text-white/55 hover:text-white text-[13px] font-medium no-underline transition-colors">Amenity Supply Co.</Link></li>
            </>
          )}
        </ul>

        {/* CTA / user */}
        <div className="flex items-center gap-2.5">
          {isGov ? (
            <>
              <a href="#capabilities"
                className="inline-flex items-center px-4 py-[9px] rounded-[5px] text-[12px] font-bold uppercase tracking-[.6px] cursor-pointer border-2 border-black bg-transparent text-black hover:bg-black hover:text-white transition-all no-underline">
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
              <Link
                href="/dashboard"
                className="inline-flex items-center px-[18px] py-2 rounded-md text-[13px] font-semibold bg-[#2b7fff] text-white no-underline hover:bg-[#1a60d4] transition-colors"
              >
                Dashboard
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-8 h-8 rounded-full bg-[#2b7fff] flex items-center justify-center text-[12px] font-bold text-white cursor-pointer border-0"
                >
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
                    <button
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-400/[0.08] transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className={`inline-flex items-center px-[18px] py-2 rounded-md text-[13px] font-semibold cursor-pointer border transition-colors ${
                  isGov
                    ? "bg-transparent text-gray-600 border-black/30 hover:border-black hover:text-black"
                    : "bg-transparent text-white/65 border-white/20 hover:border-white/45 hover:text-white"
                }`}
              >
                Sign In
              </button>
              {!isGov && (
                <button
                  onClick={() => { setAuthOpen(true); }}
                  className="inline-flex items-center px-[18px] py-2 rounded-md text-[13px] font-semibold bg-[#2b7fff] text-white hover:bg-[#1a60d4] cursor-pointer border-0 transition-colors"
                >
                  Start Order
                </button>
              )}
            </>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        startOrder={startOrder}
      />
    </>
  );
}

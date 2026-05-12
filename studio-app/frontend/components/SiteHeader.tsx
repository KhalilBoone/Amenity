"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Handbag,
  List,
  X,
} from "@phosphor-icons/react";
import { getLocalCart } from "@/lib/localCart";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import AuthModal from "@/components/AuthModal";
import type { HydratedCart } from "@/types";

export function SiteHeader() {
  const [signedIn, setSignedIn]     = useState<boolean | null>(null);
  const [cartCount, setCartCount]   = useState<number>(0);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [authOpen, setAuthOpen]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Seed cart count from localStorage immediately (no auth needed)
    function syncLocalCount() {
      const local = getLocalCart();
      const total = local.reduce((s, i) => s + i.quantity, 0);
      if (total > 0) setCartCount(total);
    }
    syncLocalCount();

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
        const local = getLocalCart();
        setCartCount(local.reduce((s, i) => s + i.quantity, 0));
      }
    });

    async function refreshCart() {
      try {
        const c = await apiGet<HydratedCart>("/cart");
        const total = (c.items ?? []).reduce((acc, i) => acc + (i.quantity ?? 0), 0);
        setCartCount(total);
      } catch {
        const local = getLocalCart();
        setCartCount(local.reduce((s, i) => s + i.quantity, 0));
      }
    }

    function onLocalCartUpdate() {
      const local = getLocalCart();
      setCartCount(local.reduce((s, i) => s + i.quantity, 0));
    }
    window.addEventListener("localcart:updated", onLocalCartUpdate);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("localcart:updated", onLocalCartUpdate);
    };
  }, []);

  function openAuth() {
    setMenuOpen(false);
    setAuthOpen(true);
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-paper/80 backdrop-blur">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-0 py-4">

          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl tracking-tight"
            aria-label="Amenity home"
          >
            Amenity
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-6 text-sm md:flex">
            <li>
              <Link href="/shop" className="text-neutral-600 transition-colors duration-200 hover:text-ink hover:[text-shadow:0_0_0.6px_currentColor,0_0_0.6px_currentColor]">
                Shop
              </Link>
            </li>

            {/* Sign In + Cart — grouped tightly */}
            <li className="flex items-center gap-3">
              {signedIn === null ? (
                <div className="h-8 w-20 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <button
                  type="button"
                  onClick={openAuth}
                  className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {signedIn ? "Account" : "Sign In"}
                </button>
              )}

              <Link
                href="/shop/cart"
                className="group relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition-all duration-200 hover:ring-1 hover:ring-ink"
                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              >
                <Handbag size={20} weight="regular" aria-hidden className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-6" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-paper">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </li>
          </ul>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/shop/cart"
              className="group relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition-all duration-200 hover:ring-1 hover:ring-ink"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            >
              <Handbag size={22} weight="regular" aria-hidden className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-6" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-paper">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="text-neutral-600 transition-colors hover:text-ink"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen
                ? <X size={22} weight="regular" aria-hidden />
                : <List size={22} weight="regular" aria-hidden />
              }
            </button>
          </div>
        </nav>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="border-t border-neutral-100 bg-paper px-6 py-5 md:hidden">
            <ul className="flex flex-col gap-4 text-sm">
              <li>
                <Link href="/shop" onClick={() => setMenuOpen(false)} className="block text-neutral-700 transition-colors hover:text-ink">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/shop/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-neutral-700 transition-colors hover:text-ink">
                  <Handbag size={16} aria-hidden />
                  Cart {cartCount > 0 && <span className="font-semibold">({cartCount})</span>}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openAuth}
                  className="inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-neutral-800"
                >
                  {signedIn ? "Account" : "Sign In"}
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>

      {/* Auth modal — rendered outside the header so it's not clipped */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

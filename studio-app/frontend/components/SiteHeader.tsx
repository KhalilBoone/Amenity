"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Handbag,
  SignIn,
  SignOut,
  List,
  X,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import type { HydratedCart } from "@/types";

export function SiteHeader() {
  const [signedIn, setSignedIn]   = useState<boolean | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      if (data.session) refreshCart();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSignedIn(!!session);
      if (session) refreshCart();
      else setCartCount(0);
    });

    async function refreshCart() {
      try {
        const c = await apiGet<HydratedCart>("/cart");
        const total = (c.items ?? []).reduce(
          (acc, i) => acc + (i.quantity ?? 0),
          0
        );
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    }

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
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
            <Link href="/blanks" className="text-neutral-600 transition-colors hover:text-ink">
              Blanks
            </Link>
          </li>
          <li>
            <Link href="/studio" className="text-neutral-600 transition-colors hover:text-ink">
              Studio
            </Link>
          </li>

          {/* Cart */}
          <li>
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-1.5 text-neutral-600 transition-colors hover:text-ink"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            >
              <Handbag size={20} weight="regular" aria-hidden />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-paper">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </li>

          {/* Auth */}
          <li>
            {signedIn === null ? (
              <div className="h-4 w-14 animate-pulse rounded bg-neutral-200" />
            ) : signedIn ? (
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="inline-flex items-center gap-1.5 text-neutral-600 transition-colors hover:text-ink"
                aria-label="Sign out"
              >
                <SignOut size={18} weight="regular" aria-hidden />
                <span>Sign out</span>
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-neutral-600 transition-colors hover:text-ink"
              >
                <SignIn size={18} weight="regular" aria-hidden />
                <span>Sign in</span>
              </Link>
            )}
          </li>
        </ul>

        {/* Mobile: cart + hamburger */}
        <div className="flex items-center gap-4 md:hidden">
          <Link
            href="/cart"
            className="relative text-neutral-600 transition-colors hover:text-ink"
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
          >
            <Handbag size={22} weight="regular" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-paper">
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
              <Link href="/blanks" onClick={() => setMenuOpen(false)} className="block text-neutral-700 transition-colors hover:text-ink">
                Blanks
              </Link>
            </li>
            <li>
              <Link href="/studio" onClick={() => setMenuOpen(false)} className="block text-neutral-700 transition-colors hover:text-ink">
                Studio
              </Link>
            </li>
            <li>
              <Link href="/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-neutral-700 transition-colors hover:text-ink">
                <Handbag size={16} aria-hidden />
                Cart {cartCount > 0 && <span className="font-semibold">({cartCount})</span>}
              </Link>
            </li>
            <li>
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-neutral-700 transition-colors hover:text-ink"
                >
                  <SignOut size={16} aria-hidden /> Sign out
                </button>
              ) : (
                <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-neutral-700 transition-colors hover:text-ink">
                  <SignIn size={16} aria-hidden /> Sign in
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

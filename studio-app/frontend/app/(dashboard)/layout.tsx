"use client";

/**
 * Dashboard layout — wraps all /pim/*, /dashboard/marketplace/*, /dashboard/orders/*, /dashboard/invoices/*
 *
 * Sidebar sections:
 *   Marketplace — Marketplace, Orders, Invoices
 *   Workspace   — Products (PIM), Settings, Team
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Sliders,
  Users,
  ArrowLeft,
  Buildings,
  SignOut,
  Storefront,
  Receipt,
  ClipboardText,
  List,
  X,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Org { id: string; name: string; slug: string; my_role: string }
interface UserInfo { email: string | null; name: string | null }

// ─────────────────────────────────────────────────────────────────────────────
// Nav config
// ─────────────────────────────────────────────────────────────────────────────

const MARKETPLACE_NAV = [
  { href: "/dashboard/marketplace", label: "Marketplace", Icon: Storefront  },
  { href: "/dashboard/orders",      label: "Orders",      Icon: ClipboardText },
  { href: "/dashboard/invoices",    label: "Invoices",    Icon: Receipt     },
];

const WORKSPACE_NAV = [
  { href: "/pim",               label: "Products",  Icon: Package  },
  { href: "/pim/settings",      label: "Settings",  Icon: Sliders  },
  { href: "/pim/settings/team", label: "Team",      Icon: Users    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [ready,     setReady]     = useState(false);
  const [user,      setUser]      = useState<UserInfo | null>(null);
  const [orgs,      setOrgs]      = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/sign-in?next=" + encodeURIComponent(pathname));
        return;
      }
      const u = data.session.user;
      setUser({
        email: u.email ?? null,
        name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
      });
      setReady(true);

      apiGet<{ orgs: Org[] }>("/pim/orgs").then((r) => {
        setOrgs(r.orgs);
        if (r.orgs.length > 0) setActiveOrg(r.orgs[0]);
      }).catch(() => {});
    });
  }, [pathname, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }

  function NavItem({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
    // Marketplace root needs exact match; others use startsWith
    const active = href === "/dashboard/marketplace"
      ? pathname === href || pathname.startsWith(href + "/")
      : href === "/pim"
      ? pathname === href
      : pathname.startsWith(href);
    return (
      <li>
        <Link
          href={href}
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            active
              ? "bg-neutral-100 font-medium text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          <Icon size={15} weight={active ? "fill" : "regular"} aria-hidden />
          {label}
        </Link>
      </li>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-ink text-paper">
              <Buildings size={14} weight="fill" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-800">
                {activeOrg?.name ?? "Amenity"}
              </p>
              {orgs.length > 1 && (
                <p className="text-[10px] text-neutral-400">{orgs.length} workspaces</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-neutral-400 hover:text-neutral-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Org switcher */}
        {orgs.length > 1 && (
          <div className="border-b border-neutral-100 px-3 py-2">
            <select
              value={activeOrg?.id ?? ""}
              onChange={(e) => {
                const org = orgs.find((o) => o.id === e.target.value);
                if (org) setActiveOrg(org);
              }}
              className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
          {/* Marketplace section */}
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Marketplace
            </p>
            <ul className="flex flex-col gap-0.5">
              {MARKETPLACE_NAV.map((item) => <NavItem key={item.href} {...item} />)}
            </ul>
          </div>

          {/* Workspace section */}
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Workspace
            </p>
            <ul className="flex flex-col gap-0.5">
              {WORKSPACE_NAV.map((item) => <NavItem key={item.href} {...item} />)}
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-100 p-3">
          {user && (
            <div className="mb-3 rounded-lg bg-neutral-50 px-3 py-2.5">
              <p className="truncate text-xs font-medium text-neutral-800">
                {user.name ?? user.email ?? "Account"}
              </p>
              {user.name && user.email && (
                <p className="truncate text-[11px] text-neutral-400">{user.email}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
            >
              <ArrowLeft size={13} weight="regular" aria-hidden />
              Back to Amenity
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-red-600"
            >
              <SignOut size={13} weight="regular" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-600 hover:text-neutral-900"
            aria-label="Open sidebar"
          >
            <List size={20} weight="regular" />
          </button>
          <p className="text-sm font-semibold text-neutral-800">
            {activeOrg?.name ?? "Amenity"}
          </p>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

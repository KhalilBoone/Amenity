"use client";

/**
 * /pim — PIM product list
 *
 * Lists all products for the user's current org.
 * Supports search, status filter, and category filter.
 * Links to /pim/products/[id] for edit and /pim/products/new for create.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Plus,
  Package,
  ArrowRight,
  FunnelSimple,
  Buildings,
} from "@phosphor-icons/react";
import { apiGet, apiPost } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Org {
  id: string;
  name: string;
  slug: string;
  my_role: string;
}

interface PimProduct {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived" | "discontinued";
  category_id: string | null;
  attributes: Record<string, unknown>;
  updated_at: string;
  pim_categories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:        { label: "Draft",        cls: "bg-neutral-100 text-neutral-600" },
  active:       { label: "Active",       cls: "bg-emerald-50 text-emerald-700"  },
  archived:     { label: "Archived",     cls: "bg-neutral-200 text-neutral-500" },
  discontinued: { label: "Discontinued", cls: "bg-red-50 text-red-600"          },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PimPage() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [products, setProducts] = useState<PimProduct[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  // Load orgs on mount
  useEffect(() => {
    apiGet<{ orgs: Org[] }>("/pim/orgs").then((res) => {
      setOrgs(res.orgs);
      if (res.orgs.length > 0) setActiveOrg(res.orgs[0]);
    });
  }, []);

  // Load categories when org changes
  useEffect(() => {
    if (!activeOrg) return;
    apiGet<{ categories: Category[] }>(`/pim/orgs/${activeOrg.id}/categories`)
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, [activeOrg]);

  const loadProducts = useCallback(() => {
    if (!activeOrg) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category_id", categoryFilter);
    apiGet<{ products: PimProduct[] }>(
      `/pim/orgs/${activeOrg.id}/products?${params.toString()}`
    )
      .then((res) => setProducts(res.products))
      .finally(() => setLoading(false));
  }, [activeOrg, search, statusFilter, categoryFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const org = await apiPost<Org>("/pim/orgs", { name: newOrgName.trim() });
    setOrgs((prev) => [...(prev ?? []), org]);
    setActiveOrg(org);
    setCreatingOrg(false);
    setNewOrgName("");
  }

  // ── No orgs yet ─────────────────────────────────────────────────────────────
  if (orgs !== null && orgs.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <Buildings size={40} weight="thin" className="text-neutral-300" />
        <div>
          <h2 className="font-display text-2xl">Create your first workspace</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Products are organised by workspace (organisation). Create one to get started.
          </p>
        </div>
        {creatingOrg ? (
          <form onSubmit={handleCreateOrg} className="flex gap-3">
            <input
              autoFocus
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Workspace name"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              Create
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreatingOrg(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper"
          >
            <Plus size={14} weight="bold" /> New workspace
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Product catalog
          </p>
          <h1 className="mt-1 font-display text-2xl tracking-tight">
            Products
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Org switcher */}
          {orgs && orgs.length > 1 && (
            <select
              value={activeOrg?.id ?? ""}
              onChange={(e) => {
                const org = orgs.find((o) => o.id === e.target.value);
                if (org) setActiveOrg(org);
              }}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <Link
            href={activeOrg ? `/pim/products/new?org=${activeOrg.id}` : "/pim/products/new"}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-neutral-800"
          >
            <Plus size={13} weight="bold" /> Add product
          </Link>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass
            size={14}
            weight="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-neutral-200 py-2 pl-8 pr-4 text-sm outline-none transition focus:border-neutral-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <FunnelSimple size={14} className="text-neutral-400" aria-hidden />
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="discontinued">Discontinued</option>
          </select>
          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Product table ────────────────────────────────────────────────── */}
      {loading || products === null ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyProducts orgId={activeOrg?.id} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Product
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 sm:table-cell">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 md:table-cell">
                  Updated
                </th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} orgId={activeOrg?.id ?? ""} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product row
// ─────────────────────────────────────────────────────────────────────────────

function ProductRow({ product, orgId }: { product: PimProduct; orgId: string }) {
  const cfg = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.draft;
  const updated = new Date(product.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <tr className="group transition-colors hover:bg-neutral-50">
      <td className="px-4 py-3">
        <Link
          href={`/pim/products/${product.id}?org=${orgId}`}
          className="flex items-center gap-3"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
            <Package size={14} weight="regular" aria-hidden />
          </div>
          <div>
            <p className="font-medium leading-tight text-neutral-900 group-hover:underline">
              {product.name}
            </p>
            <p className="text-[11px] text-neutral-400">/{product.slug}</p>
          </div>
        </Link>
      </td>
      <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell">
        {product.pim_categories?.name ?? <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
          {cfg.label}
        </span>
      </td>
      <td className="hidden px-4 py-3 text-right text-[11px] text-neutral-400 md:table-cell">
        {updated}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/pim/products/${product.id}?org=${orgId}`}
          className="text-neutral-400 transition hover:text-neutral-700"
          aria-label="Edit product"
        >
          <ArrowRight size={13} weight="regular" />
        </Link>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyProducts({ orgId }: { orgId?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-neutral-300 py-16 text-center">
      <Package size={36} weight="thin" className="text-neutral-300" />
      <div>
        <p className="font-medium text-neutral-700">No products yet</p>
        <p className="mt-1 text-sm text-neutral-500">
          Add your first product to start building your catalog.
        </p>
      </div>
      <Link
        href={orgId ? `/pim/products/new?org=${orgId}` : "/pim/products/new"}
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
      >
        <Plus size={13} weight="bold" /> Add product
      </Link>
    </div>
  );
}

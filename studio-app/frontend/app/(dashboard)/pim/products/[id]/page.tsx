"use client";

/**
 * /pim/products/[id] — edit a PIM product
 *
 * Sections:
 *   - Core fields (name, slug, description, status, category)
 *   - Attributes (flexible key/value pairs)
 *   - Variants (SKU matrix)
 *   - Media
 */

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FloppyDisk,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { ProductForm, type ProductFormValues } from "@/components/pim/ProductForm";
import { MediaGallery, type PimMedia } from "@/components/pim/MediaGallery";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PimProduct {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  attributes: Record<string, unknown>;
  supplier_id: string | null;
  hs_code: string | null;
  country_of_origin: string | null;
  meta_title: string | null;
  meta_description: string | null;
  pim_variants: PimVariant[];
  pim_media: PimMedia[];
  pim_categories?: { name: string; slug: string } | null;
}

interface PimVariant {
  id: string;
  sku: string;
  name: string | null;
  price: number | null;
  cost: number | null;
  inventory_count: number | null;
  attributes: Record<string, unknown>;
  position: number;
}

interface Category {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org") ?? "";

  const [product, setProduct] = useState<PimProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "variants" | "media">("details");

  // New variant form state
  const [addingVariant, setAddingVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({ sku: "", name: "", price: "" });

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      apiGet<PimProduct>(`/pim/orgs/${orgId}/products/${id}`),
      apiGet<{ categories: Category[] }>(`/pim/orgs/${orgId}/categories`),
    ]).then(([p, cats]) => {
      setProduct(p);
      setCategories(cats.categories);
    });
  }, [id, orgId]);

  async function handleSave(values: ProductFormValues) {
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<PimProduct>(
        `/pim/orgs/${orgId}/products/${id}`,
        values
      );
      setProduct(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !newVariant.sku) return;
    const v = await apiPost<PimVariant>(
      `/pim/orgs/${orgId}/products/${id}/variants`,
      {
        sku: newVariant.sku,
        name: newVariant.name || null,
        price: newVariant.price ? parseFloat(newVariant.price) : null,
      }
    );
    setProduct((p) =>
      p ? { ...p, pim_variants: [...p.pim_variants, v] } : p
    );
    setNewVariant({ sku: "", name: "", price: "" });
    setAddingVariant(false);
  }

  async function handleDeleteVariant(variantId: string) {
    if (!orgId) return;
    await apiDelete(`/pim/orgs/${orgId}/products/${id}/variants/${variantId}`);
    setProduct((p) =>
      p
        ? { ...p, pim_variants: p.pim_variants.filter((v) => v.id !== variantId) }
        : p
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-3">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pim"
            className="text-neutral-400 transition hover:text-neutral-700"
            aria-label="Back"
          >
            <ArrowLeft size={16} weight="regular" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Edit product
            </p>
            <h1 className="mt-0.5 font-display text-xl tracking-tight">
              {product.name}
            </h1>
          </div>
        </div>
        <span
          className={`mt-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            product.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : product.status === "archived"
              ? "bg-neutral-200 text-neutral-500"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {product.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-neutral-200">
        {(["details", "variants", "media"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? "border-b-2 border-ink text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab}
            {tab === "variants" && product.pim_variants.length > 0 && (
              <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                {product.pim_variants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Details tab ─────────────────────────────────────────────────── */}
      {activeTab === "details" && (
        <ProductForm
          initialValues={{
            name: product.name,
            slug: product.slug,
            description: product.description ?? "",
            short_description: product.short_description ?? "",
            category_id: product.category_id ?? "",
            status: product.status,
            attributes: product.attributes,
            hs_code: product.hs_code ?? "",
            country_of_origin: product.country_of_origin ?? "",
            meta_title: product.meta_title ?? "",
            meta_description: product.meta_description ?? "",
          }}
          categories={categories}
          onSave={handleSave}
          saving={saving}
          saveLabel={
            <span className="inline-flex items-center gap-2">
              <FloppyDisk size={14} weight="regular" /> Save changes
            </span>
          }
        />
      )}

      {/* ── Media tab ────────────────────────────────────────────────────── */}
      {activeTab === "media" && (
        <MediaGallery
          orgId={orgId}
          productId={id}
          initial={product.pim_media ?? []}
        />
      )}

      {/* ── Variants tab ─────────────────────────────────────────────────── */}
      {activeTab === "variants" && (
        <div className="flex flex-col gap-4">
          {product.pim_variants.length === 0 && !addingVariant && (
            <p className="text-sm text-neutral-500">No variants yet.</p>
          )}

          {product.pim_variants.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">SKU</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Name</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Price</th>
                    <th className="w-8 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {product.pim_variants
                    .sort((a, b) => a.position - b.position)
                    .map((v) => (
                      <tr key={v.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-mono text-xs text-neutral-700">{v.sku}</td>
                        <td className="px-4 py-3 text-neutral-700">{v.name ?? <span className="text-neutral-300">—</span>}</td>
                        <td className="px-4 py-3 text-right text-neutral-700">
                          {v.price != null ? `$${v.price.toFixed(2)}` : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteVariant(v.id)}
                            className="text-neutral-400 transition hover:text-red-500"
                            aria-label="Delete variant"
                          >
                            <Trash size={13} weight="regular" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {addingVariant ? (
            <form
              onSubmit={handleAddVariant}
              className="rounded-xl border border-neutral-200 p-4"
            >
              <p className="mb-3 text-sm font-medium text-neutral-700">New variant</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="mb-1 block text-xs text-neutral-500">SKU *</label>
                  <input
                    autoFocus
                    required
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant((v) => ({ ...v, sku: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="mb-1 block text-xs text-neutral-500">Name</label>
                  <input
                    value={newVariant.name}
                    onChange={(e) => setNewVariant((v) => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. Black / L"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="mb-1 block text-xs text-neutral-500">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant((v) => ({ ...v, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAddingVariant(false)}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingVariant(true)}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              <Plus size={13} weight="bold" /> Add variant
            </button>
          )}
        </div>
      )}

    </div>
  );
}

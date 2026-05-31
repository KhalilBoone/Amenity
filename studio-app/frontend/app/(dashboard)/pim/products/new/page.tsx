"use client";

/**
 * /pim/products/new — create a new PIM product
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FloppyDisk } from "@phosphor-icons/react";
import { apiGet, apiPost } from "@/lib/api";
import { ProductForm, type ProductFormValues } from "@/components/pim/ProductForm";

interface Category {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get("org") ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    apiGet<{ categories: Category[] }>(`/pim/orgs/${orgId}/categories`)
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, [orgId]);

  async function handleSave(values: ProductFormValues) {
    if (!orgId) {
      setError("No workspace selected. Go back and try again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const product = await apiPost<{ id: string }>(
        `/pim/orgs/${orgId}/products`,
        values
      );
      router.push(`/pim/products/${product.id}?org=${orgId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create product.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/pim"
          className="text-neutral-400 transition hover:text-neutral-700"
          aria-label="Back to products"
        >
          <ArrowLeft size={16} weight="regular" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            New product
          </p>
          <h1 className="mt-0.5 font-display text-xl tracking-tight">
            Create product
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ProductForm
        categories={categories}
        onSave={handleSave}
        saving={saving}
        saveLabel={
          <span className="inline-flex items-center gap-2">
            <FloppyDisk size={14} weight="regular" /> Save product
          </span>
        }
      />
    </div>
  );
}

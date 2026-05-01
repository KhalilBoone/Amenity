"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { computeCustomPrice } from "@/lib/pricing";
import { PlacementPicker } from "@/components/PlacementPicker";
import type {
  ArtworkPlacement,
  ArtworkUpload,
  CustomizationPricing,
  DecorationTechnique,
  Product,
  ProductVariant,
} from "@/types";

type ProductDetail = Product & { product_variants: ProductVariant[] };

const TECHNIQUES: { id: DecorationTechnique; label: string; sub: string }[] = [
  { id: "screen_print", label: "Screen print", sub: "Best for 24+, vibrant flat colors" },
  { id: "embroidery",   label: "Embroidery",   sub: "Premium feel, ideal for logos" },
  { id: "dtg",          label: "DTG",          sub: "Photo-quality, great at qty 1" },
];

const ACCEPT = "image/png,image/jpeg,application/pdf,image/svg+xml,application/postscript";
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export default function CustomizePage() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const router = useRouter();

  const initialVariantId = params.get("variant");
  const initialQty = parseInt(params.get("qty") ?? "12", 10);

  // ---- product + pricing ----
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [pricingRules, setPricingRules] = useState<CustomizationPricing[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---- selection state ----
  const [variantId, setVariantId] = useState<string | null>(initialVariantId);
  const [quantity, setQuantity] = useState<number>(
    Number.isFinite(initialQty) && initialQty > 0 ? initialQty : 12
  );
  const [technique, setTechnique] = useState<DecorationTechnique>("screen_print");
  const [colors, setColors] = useState<number>(1);
  const [placement, setPlacement] = useState<ArtworkPlacement | null>("front_chest");

  // ---- upload state ----
  const [artwork, setArtwork] = useState<ArtworkUpload | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- fetch product + pricing ----
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<ProductDetail>(`/products/${slug}`),
      apiGet<{ pricing: CustomizationPricing[] }>("/customization/pricing"),
    ])
      .then(([p, pr]) => {
        if (cancelled) return;
        setProduct(p);
        setPricingRules(pr.pricing ?? []);
        if (!variantId && p.product_variants.length) {
          setVariantId(p.product_variants[0].id);
        }
      })
      .catch((e) => !cancelled && setLoadError(String(e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const variant = useMemo<ProductVariant | null>(
    () =>
      product?.product_variants.find((v) => v.id === variantId) ?? null,
    [product, variantId]
  );

  // ---- live price ----
  const price = useMemo(
    () =>
      computeCustomPrice({
        blankUnitPrice: variant?.price ?? 0,
        technique,
        colors,
        quantity,
        rules: pricingRules,
      }),
    [variant, technique, colors, quantity, pricingRules]
  );

  // ---- upload flow ----
  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUploadError("File is over 25MB.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      // 1. ask the API where to upload to
      const intent = await apiPost<{
        artwork_id: string;
        bucket: string;
        file_path: string;
      }>("/uploads/artwork/intent", {
        filename: file.name,
        mime: file.type,
      });

      // 2. upload to Supabase Storage with the user's JWT (RLS-gated)
      const { error: upErr } = await supabase.storage
        .from(intent.bucket)
        .upload(intent.file_path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (upErr) throw upErr;

      // 3. register the artwork row
      const row = await apiPost<ArtworkUpload>("/uploads/artwork", {
        file_path: intent.file_path,
        original_filename: file.name,
        mime: file.type,
        size_bytes: file.size,
      });
      setArtwork(row);
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploading(false);
    }
  }

  // ---- add to cart ----
  async function addToCart() {
    if (!variant || !artwork || !placement) return;
    setSubmitting(true);
    try {
      await apiPost("/cart/items", {
        variant_id: variant.id,
        quantity,
        customization: {
          artwork_id: artwork.id,
          placement,
          technique,
          colors: technique === "screen_print" ? colors : undefined,
          setup_fee: price.band?.setup_fee ?? 0,
          unit_cost: price.band?.unit_cost ?? 0,
        },
      });
      router.push("/cart");
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ---- render ----
  if (loadError) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-8">
        <p className="text-red-700">Couldn&apos;t load. {loadError}</p>
      </main>
    );
  }
  if (!product) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-8">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  const ready = !!variant && !!artwork && !!placement && !!price.band;
  const moqWarning =
    technique === "screen_print" && quantity < 24
      ? "Heads up: screen printing is most cost-effective at 24+. Below that, setup fees dominate the per-unit price."
      : technique === "embroidery" && quantity < 24
      ? "Embroidery digitization fee is fixed — orders under 24 units carry a higher per-unit cost."
      : null;

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-0 py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-neutral-500">
            Customize
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            {product.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/blanks/${slug}`)}
          className="text-sm underline"
        >
          ← Back to product
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_360px]">
        {/* ============== LEFT: design panes ============== */}
        <div className="flex flex-col gap-10">
          {/* ---- 1. upload ---- */}
          <section className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-wider text-neutral-500">
              1. Upload your artwork
            </p>
            <label
              htmlFor="artwork-file"
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition ${
                artwork
                  ? "border-ink bg-neutral-50"
                  : "border-neutral-300 hover:border-neutral-500"
              }`}
            >
              <input
                id="artwork-file"
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={onFileChosen}
                disabled={uploading}
              />
              {uploading ? (
                <span className="text-sm text-neutral-500">Uploading…</span>
              ) : artwork ? (
                <>
                  <span className="text-sm font-medium">
                    {artwork.original_filename ?? "artwork.png"}
                  </span>
                  <span className="text-xs text-neutral-500">
                    Click to replace
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">
                    Drop a PNG, PDF, SVG, or AI file
                  </span>
                  <span className="text-xs text-neutral-500">
                    Max 25MB · Vector preferred for screen print
                  </span>
                </>
              )}
            </label>
            {uploadError && (
              <p className="text-sm text-red-700">{uploadError}</p>
            )}
          </section>

          {/* ---- 2. placement ---- */}
          <section>
            <PlacementPicker value={placement} onChange={setPlacement} />
          </section>

          {/* ---- 3. technique ---- */}
          <section className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-wider text-neutral-500">
              3. Decoration technique
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {TECHNIQUES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTechnique(t.id)}
                  className={`rounded-md border p-4 text-left transition ${
                    technique === t.id
                      ? "border-ink bg-ink text-paper"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="mt-1 text-xs opacity-80">{t.sub}</p>
                </button>
              ))}
            </div>

            {technique === "screen_print" && (
              <div className="mt-2">
                <label className="text-sm uppercase tracking-wider text-neutral-500">
                  Ink colors
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={colors}
                  onChange={(e) =>
                    setColors(
                      Math.min(6, Math.max(1, parseInt(e.target.value || "1", 10)))
                    )
                  }
                  className="ml-3 w-20 rounded-md border border-neutral-300 px-3 py-2"
                />
                <span className="ml-2 text-xs text-neutral-500">
                  ${price.band?.setup_fee ?? 0} setup × {colors} color
                  {colors > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </section>

          {/* ---- quantity ---- */}
          <section className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-wider text-neutral-500">
              4. Quantity
            </p>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value || "1", 10)))
              }
              className="w-32 rounded-md border border-neutral-300 px-3 py-2"
            />
            {moqWarning && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                {moqWarning}
              </p>
            )}
          </section>
        </div>

        {/* ============== RIGHT: sticky price summary ============== */}
        <aside className="self-start md:sticky md:top-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-display text-xl">Estimate</h2>

            <Row label="Blank">
              ${price.blankSubtotal.toFixed(2)} ({quantity} ×{" "}
              ${variant?.price.toFixed(2) ?? "—"})
            </Row>
            <Row label="Setup">
              ${price.setupTotal.toFixed(2)}
              {technique === "screen_print" && colors > 1 && ` (${colors}c)`}
            </Row>
            <Row label="Decoration">
              ${price.decorationTotal.toFixed(2)} (${
                price.band?.unit_cost.toFixed(2) ?? "—"
              } × {quantity})
            </Row>
            <hr className="border-neutral-200" />
            <Row label="Total" emphasis>
              ${price.total.toFixed(2)}
            </Row>
            <p className="text-xs text-neutral-500">
              ≈ ${price.unitAllIn.toFixed(2)} all-in per unit. Excludes shipping
              and tax.
            </p>

            <button
              type="button"
              onClick={addToCart}
              disabled={!ready || submitting}
              className="mt-2 w-full rounded-md bg-ink px-6 py-4 text-base font-medium text-paper transition hover:bg-accent disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add customized to cart"}
            </button>
            {!ready && (
              <p className="text-xs text-neutral-500">
                Upload artwork and pick a placement to enable.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Row({
  label,
  children,
  emphasis,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between ${
        emphasis ? "text-lg font-medium" : "text-sm"
      }`}
    >
      <span className={emphasis ? "" : "text-neutral-500"}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

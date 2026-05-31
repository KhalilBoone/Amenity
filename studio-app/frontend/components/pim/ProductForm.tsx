"use client";

/**
 * Shared product create/edit form used by:
 *   /pim/products/new        → no initialValues
 *   /pim/products/[id]       → initialValues pre-populated
 *
 * Sections:
 *   1. Core — name, slug (auto-derived), description, short description
 *   2. Organisation — status, category
 *   3. Sourcing / compliance — country of origin, HS code
 *   4. Attributes — flexible key/value pairs stored as JSON
 *   5. SEO — meta title, meta description
 */

import { useState, useEffect } from "react";
import { Plus, Trash } from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category_id: string;
  status: string;
  attributes: Record<string, unknown>;
  hs_code: string;
  country_of_origin: string;
  meta_title: string;
  meta_description: string;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  initialValues?: Partial<ProductFormValues>;
  categories: Category[];
  onSave: (values: ProductFormValues) => void;
  saving: boolean;
  saveLabel: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Attribute row type
// ─────────────────────────────────────────────────────────────────────────────

interface AttrRow {
  key: string;
  value: string;
}

function attrsToRows(attrs: Record<string, unknown>): AttrRow[] {
  return Object.entries(attrs).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
}

function rowsToAttrs(rows: AttrRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, value } of rows) {
    if (key.trim()) out[key.trim()] = value;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProductForm({
  initialValues,
  categories,
  onSave,
  saving,
  saveLabel,
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initialValues?.slug);
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [shortDesc, setShortDesc] = useState(initialValues?.short_description ?? "");
  const [status, setStatus] = useState(initialValues?.status ?? "draft");
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? "");
  const [hsCode, setHsCode] = useState(initialValues?.hs_code ?? "");
  const [country, setCountry] = useState(initialValues?.country_of_origin ?? "");
  const [metaTitle, setMetaTitle] = useState(initialValues?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(initialValues?.meta_description ?? "");
  const [attrRows, setAttrRows] = useState<AttrRow[]>(
    attrsToRows(initialValues?.attributes ?? {})
  );

  // Auto-derive slug from name (unless the user has manually edited it)
  useEffect(() => {
    if (!slugManual) setSlug(slugify(name));
  }, [name, slugManual]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      slug,
      description,
      short_description: shortDesc,
      category_id: categoryId,
      status,
      attributes: rowsToAttrs(attrRows),
      hs_code: hsCode,
      country_of_origin: country,
      meta_title: metaTitle,
      meta_description: metaDesc,
    });
  }

  function addAttrRow() {
    setAttrRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateAttrRow(idx: number, field: "key" | "value", val: string) {
    setAttrRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );
  }

  function removeAttrRow(idx: number) {
    setAttrRows((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* ── Core ─────────────────────────────────────────────────────── */}
      <Section title="Core">
        <Field label="Product name" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Heavyweight Fleece Hoodie"
            className={inputCls}
          />
        </Field>

        <Field label="Slug" hint="Used in URLs. Auto-derived from name.">
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            placeholder="heavyweight-fleece-hoodie"
            className={`${inputCls} font-mono text-xs`}
          />
        </Field>

        <Field label="Short description" hint="One-liner shown in listings.">
          <input
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            placeholder="Premium 400gsm French terry hoodie"
            className={inputCls}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Full product description…"
            className={`${inputCls} resize-y`}
          />
        </Field>
      </Section>

      {/* ── Organisation ─────────────────────────────────────────────── */}
      <Section title="Organisation">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* ── Sourcing / compliance ─────────────────────────────────────── */}
      <Section title="Sourcing & compliance">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country of origin">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              className={inputCls}
            />
          </Field>

          <Field label="HS code" hint="Harmonised tariff code for customs.">
            <input
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              placeholder="e.g. 6110.20"
              className={`${inputCls} font-mono text-xs`}
            />
          </Field>
        </div>
      </Section>

      {/* ── Attributes ───────────────────────────────────────────────── */}
      <Section title="Attributes" hint="Flexible key/value pairs — fabric weight, fit, material, etc.">
        <div className="flex flex-col gap-2">
          {attrRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.key}
                onChange={(e) => updateAttrRow(i, "key", e.target.value)}
                placeholder="Key (e.g. fabric_weight)"
                className={`${inputCls} flex-1 font-mono text-xs`}
              />
              <input
                value={row.value}
                onChange={(e) => updateAttrRow(i, "value", e.target.value)}
                placeholder="Value (e.g. 400gsm)"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeAttrRow(i)}
                className="flex-shrink-0 text-neutral-400 transition hover:text-red-500"
                aria-label="Remove attribute"
              >
                <Trash size={14} weight="regular" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAttrRow}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 transition hover:border-neutral-400"
          >
            <Plus size={11} weight="bold" /> Add attribute
          </button>
        </div>
      </Section>

      {/* ── SEO ──────────────────────────────────────────────────────── */}
      <Section title="SEO">
        <Field label="Meta title" hint="Defaults to product name if blank.">
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder={name || "Product name"}
            className={inputCls}
          />
        </Field>
        <Field label="Meta description">
          <textarea
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            rows={2}
            placeholder="150–160 characters for search results."
            className={`${inputCls} resize-none`}
          />
        </Field>
      </Section>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            saveLabel
          )}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-5">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {title}
      </legend>
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400 placeholder:text-neutral-300";

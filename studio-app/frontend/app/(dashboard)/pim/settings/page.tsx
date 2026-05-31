"use client";

/**
 * /pim/settings — PIM workspace settings
 *
 * Tabs:
 *   Attributes  — define the flexible attribute schema for products
 *   Team        — manage org members (links to /pim/settings/team)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Users,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
} from "@phosphor-icons/react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Org { id: string; name: string; my_role: string }

interface AttributeDef {
  id: string;
  name: string;
  key: string;
  type: string;
  unit: string | null;
  options: string[];
  required: boolean;
  position: number;
}

type Tab = "attributes" | "team";

const ATTR_TYPES = [
  "text", "number", "boolean", "select", "multi_select", "date", "url", "color",
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PimSettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [tab, setTab] = useState<Tab>("attributes");

  useEffect(() => {
    apiGet<{ orgs: Org[] }>("/pim/orgs").then((r) => {
      if (r.orgs.length > 0) setOrg(r.orgs[0]);
    });
  }, []);

  if (!org) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    );
  }

  const isAdmin = org.my_role === "owner" || org.my_role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {org.name}
        </p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-neutral-200">
        {(
          [
            { id: "attributes", label: "Attributes", Icon: Sliders },
            { id: "team",       label: "Team",        Icon: Users },
          ] as { id: Tab; label: string; Icon: React.ElementType }[]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "border-b-2 border-ink text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon size={13} weight="regular" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "attributes" && (
        <AttributesPanel orgId={org.id} isAdmin={isAdmin} />
      )}
      {tab === "team" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Manage workspace members and roles.
          </p>
          <Link
            href="/pim/settings/team"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
          >
            <Users size={14} weight="regular" aria-hidden />
            Open team settings
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attributes panel
// ─────────────────────────────────────────────────────────────────────────────

function AttributesPanel({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const [attrs, setAttrs] = useState<AttributeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // new-row form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newUnit, setNewUnit] = useState("");
  const [newRequired, setNewRequired] = useState(false);

  useEffect(() => {
    apiGet<{ attributes: AttributeDef[] }>(`/pim/orgs/${orgId}/attributes`)
      .then((r) => setAttrs(r.attributes))
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = await apiPost<AttributeDef>(`/pim/orgs/${orgId}/attributes`, {
      name: newName,
      type: newType,
      unit: newUnit || null,
      required: newRequired,
    });
    setAttrs((p) => [...p, created]);
    setNewName(""); setNewType("text"); setNewUnit(""); setNewRequired(false);
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await apiDelete(`/pim/orgs/${orgId}/attributes/${id}`);
    setAttrs((p) => p.filter((a) => a.id !== id));
  }

  if (loading) return <Skeleton />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Attributes define the flexible properties that appear on every product —
        fabric weight, fit, material, GSM, etc. Members can set values;
        admins manage the schema here.
      </p>

      {attrs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Key</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Unit</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Req</th>
                {isAdmin && <th className="w-16 px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {attrs.map((a) => (
                <AttributeRow
                  key={a.id}
                  attr={a}
                  orgId={orgId}
                  isAdmin={isAdmin}
                  editing={editId === a.id}
                  onEdit={() => setEditId(editId === a.id ? null : a.id)}
                  onDelete={() => handleDelete(a.id)}
                  onSaved={(updated) => {
                    setAttrs((p) => p.map((x) => (x.id === updated.id ? updated : x)));
                    setEditId(null);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {attrs.length === 0 && !adding && (
        <p className="text-sm text-neutral-400">No attributes defined yet.</p>
      )}

      {isAdmin && (
        adding ? (
          <form
            onSubmit={handleAdd}
            className="rounded-xl border border-neutral-200 p-4"
          >
            <p className="mb-3 text-sm font-medium text-neutral-700">New attribute</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Name *</label>
                <input
                  autoFocus required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Fabric Weight"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className={inputCls}>
                  {ATTR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Unit</label>
                <input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="gsm, oz, cm…"
                  className={inputCls}
                />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />
              Required on all products
            </label>
            <div className="mt-3 flex gap-2">
              <button type="submit" className={btnPrimary}>Add</button>
              <button type="button" onClick={() => setAdding(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className={btnDashed}>
            <Plus size={12} weight="bold" /> Add attribute
          </button>
        )
      )}
    </div>
  );
}

function AttributeRow({
  attr, orgId, isAdmin, editing, onEdit, onDelete, onSaved,
}: {
  attr: AttributeDef;
  orgId: string;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSaved: (updated: AttributeDef) => void;
}) {
  const [name, setName] = useState(attr.name);
  const [unit, setUnit] = useState(attr.unit ?? "");
  const [required, setRequired] = useState(attr.required);

  async function save() {
    const updated = await apiPatch<AttributeDef>(
      `/pim/orgs/${orgId}/attributes/${attr.id}`,
      { name, unit: unit || null, required }
    );
    onSaved(updated);
  }

  if (editing) {
    return (
      <tr className="bg-neutral-50">
        <td className="px-4 py-2" colSpan={5}>
          <div className="flex items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} flex-1`} />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unit" className={`${inputCls} w-24`} />
            <label className="flex items-center gap-1 text-xs text-neutral-600 whitespace-nowrap">
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Req
            </label>
            <button onClick={save} className="text-emerald-600 transition hover:text-emerald-800" aria-label="Save"><Check size={14} weight="bold" /></button>
            <button onClick={onEdit} className="text-neutral-400 transition hover:text-neutral-700" aria-label="Cancel"><X size={14} weight="bold" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-neutral-50">
      <td className="px-4 py-3 font-medium text-neutral-800">{attr.name}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{attr.key}</td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
          {attr.type}
        </span>
      </td>
      <td className="px-4 py-3 text-neutral-500">{attr.unit ?? <span className="text-neutral-300">—</span>}</td>
      <td className="px-4 py-3 text-center">
        {attr.required
          ? <Check size={13} className="mx-auto text-emerald-600" weight="bold" />
          : <span className="text-neutral-300">—</span>}
      </td>
      {isAdmin && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <button onClick={onEdit} className="text-neutral-400 hover:text-neutral-700" aria-label="Edit"><PencilSimple size={13} /></button>
            <button onClick={onDelete} className="text-neutral-400 hover:text-red-500" aria-label="Delete"><Trash size={13} /></button>
          </div>
        </td>
      )}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
      ))}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400";
const btnPrimary =
  "rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-neutral-800";
const btnSecondary =
  "rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:border-neutral-400";
const btnDashed =
  "inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900";

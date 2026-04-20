"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Workspace, WorkspaceStatus } from "@/lib/types";

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<WorkspaceStatus, string> = {
  "Draft":         "badge-draft",
  "Quoted":        "badge-quoted",
  "In Production": "badge-in-production",
  "Delivered":     "badge-delivered",
};

function Badge({ status }: { status: WorkspaceStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-2.75 font-semibold ${STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(user: { displayName?: string | null; email?: string | null }) {
  if (user.displayName) {
    return user.displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() ?? "?";
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center py-32">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#0f0f0f] border border-white/10 flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <h3 className="text-white font-bold text-xl mb-2">No workspaces yet</h3>
        <p className="text-white/40 text-sm mb-6">Create your first workspace to start managing a production order.</p>
        <button onClick={onCreate}
          className="px-5 py-2.5 bg-[#2b7fff] text-white font-semibold text-sm rounded-lg hover:bg-[#1a60d4] transition-colors cursor-pointer border-0">
          Create Workspace
        </button>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function DashboardInner() {
  const { user, signOut, loading } = useAuth();
  const router                     = useRouter();
  const searchParams               = useSearchParams();

  const [workspaces, setWorkspaces]   = useState<Workspace[]>([]);
  const [wsLoading, setWsLoading]     = useState(true);
  const [selected, setSelected]       = useState<Workspace | null>(null);
  const [activeTab, setActiveTab]     = useState<"brief" | "quote" | "notes">("brief");

  // Create/Edit modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Workspace | null>(null);
  const [formName, setFormName]       = useState("");
  const [formBrand, setFormBrand]     = useState("");
  const [formStatus, setFormStatus]   = useState<WorkspaceStatus>("Draft");
  const [formDesc, setFormDesc]       = useState("");
  const [saving, setSaving]           = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  // Notes save
  const [notesVal, setNotesVal]       = useState("");
  const [refVal, setRefVal]           = useState("");

  // Open create modal if ?newWorkspace=1
  useEffect(() => {
    if (searchParams.get("newWorkspace") === "1" && !loading && user) {
      openCreate();
      // Clean up the query param
      router.replace("/dashboard");
    }
  }, [searchParams, loading, user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time Firestore listener
  useEffect(() => {
    if (!user || !db) { setWsLoading(false); return; }
    const q = query(
      collection(db, "workspaces"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
        } as Workspace;
      });
      setWorkspaces(docs);
      setWsLoading(false);
      // Update selected if it was mutated
      if (selected) {
        const refreshed = docs.find(w => w.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    });
    return unsub;
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Sync notes/ref inputs when selected changes
  useEffect(() => {
    if (selected) {
      setNotesVal(selected.notes ?? "");
      setRefVal(selected.references ?? "");
    }
  }, [selected?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Show spinner while:
  // (a) Firebase is still resolving auth state, OR
  // (b) context user is null but auth.currentUser is set — this is a transient
  //     concurrent-render race right after sign-in + client-side navigation.
  if (loading || (!user && auth?.currentUser)) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2b7fff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
        <p className="text-white font-semibold text-lg">Sign in to view your dashboard</p>
        <Link href="/"
          className="px-5 py-2.5 bg-[#2b7fff] text-white text-sm font-semibold rounded-lg hover:bg-[#1a60d4] transition-colors no-underline">
          Go to Studio
        </Link>
      </div>
    );
  }

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setFormName(""); setFormBrand(""); setFormStatus("Draft"); setFormDesc("");
    setModalOpen(true);
  }

  function openEdit(ws: Workspace, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(ws);
    setFormName(ws.name); setFormBrand(ws.brand); setFormStatus(ws.status); setFormDesc(ws.desc ?? "");
    setModalOpen(true);
  }

  async function saveWorkspace() {
    if (!formName.trim() || !formBrand.trim() || !db) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, "workspaces", editTarget.id), {
          name: formName.trim(), brand: formBrand.trim(),
          status: formStatus, desc: formDesc.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const uid = user!.uid;
        const newRef = await addDoc(collection(db, "workspaces"), {
          userId: uid, name: formName.trim(), brand: formBrand.trim(),
          status: formStatus, desc: formDesc.trim(),
          notes: "", references: "", chatHistory: [], quote: null,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        // Auto-select new workspace
        setSelected({ id: newRef.id, userId: uid, name: formName.trim(), brand: formBrand.trim(),
          status: formStatus, desc: formDesc.trim(), notes: "", references: "", chatHistory: [], quote: null,
          createdAt: null, updatedAt: null });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !db) return;
    await deleteDoc(doc(db, "workspaces", deleteTarget.id));
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
  }

  async function saveNotes() {
    if (!selected || !db) return;
    await updateDoc(doc(db, "workspaces", selected.id), {
      notes: notesVal, references: refVal,
      updatedAt: serverTimestamp(),
    });
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex">

      {/* SIDEBAR */}
      <aside className="w-60 shrink-0 bg-[#0a0a0a] border-r border-white/7 flex flex-col">
        {/* Logo */}
        <div className="px-5 h-15 flex items-center border-b border-white/7">
          <Link href="/" className="text-3.75 font-extrabold text-white no-underline tracking-tight">
            Amenity<span className="text-[#2b7fff]"> Studio</span>
          </Link>
        </div>
        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 pt-4">
          <a className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/8 text-white font-semibold text-3.25 no-underline">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Workspaces
          </a>
          <Link href="/studio#catalog" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/45 hover:text-white hover:bg-white/5 text-3.25 no-underline transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="6" height="6"/><rect x="9" y="3" width="6" height="6"/><rect x="16" y="3" width="6" height="6"/>
              <rect x="2" y="10" width="6" height="6"/><rect x="9" y="10" width="6" height="6"/><rect x="16" y="10" width="6" height="6"/>
            </svg>
            Catalog
          </Link>
        </nav>
        {/* User */}
        <div className="p-4 border-t border-white/7">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2b7fff] flex items-center justify-center text-3 font-bold text-white shrink-0">
              {initials(user)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-3.25 font-semibold truncate">{user.displayName ?? "Studio Member"}</p>
              <p className="text-white/35 text-2.75 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={signOut}
            className="mt-3 w-full text-left text-white/35 text-3 hover:text-red-400 transition-colors bg-transparent border-0 cursor-pointer">
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-15 border-b border-white/7 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-white font-bold text-4.5">Workspaces</h1>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#2b7fff] text-white font-semibold text-3.25 rounded-lg hover:bg-[#1a60d4] transition-colors cursor-pointer border-0">
            <span className="text-4 leading-none">+</span> New Workspace
          </button>
        </header>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Workspace list */}
          <div className={`flex flex-col ${selected ? "w-105 shrink-0" : "flex-1"} border-r border-white/7 overflow-y-auto`}>
            {wsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-[#2b7fff] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : workspaces.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="p-4 flex flex-col gap-2">
                {workspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => { setSelected(ws); setActiveTab("brief"); }}
                    className={`group relative p-4 rounded-xl border cursor-pointer transition-all
                      ${selected?.id === ws.id
                        ? "bg-white/8 border-white/20"
                        : "bg-white/3 border-white/7 hover:bg-white/6 hover:border-white/15"
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold text-3.5">{ws.name}</p>
                        <p className="text-white/40 text-3 mt-0.5">{ws.brand}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={ws.status} />
                        <div className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(ws, e); }}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/40 hover:text-white bg-transparent border-0 cursor-pointer transition-opacity rounded"
                            title="Edit"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(ws); }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/40 hover:text-red-400 bg-transparent border-0 cursor-pointer transition-opacity rounded"
                          title="Delete"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {ws.desc && <p className="text-white/30 text-3 line-clamp-1 mt-1">{ws.desc}</p>}
                    <p className="text-white/25 text-2.75 mt-2">Updated {fmtDate(ws.updatedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Panel header */}
              <div className="px-8 py-5 border-b border-white/7 flex items-start justify-between shrink-0">
                <div>
                  <h2 className="text-white font-bold text-4.5">{selected.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/40 text-3.25">{selected.brand}</span>
                    <Badge status={selected.status} />
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  className="text-white/30 hover:text-white text-xl bg-transparent border-0 cursor-pointer mt-1">✕</button>
              </div>
              {/* Tabs */}
              <div className="flex border-b border-white/7 px-8 shrink-0">
                {(["brief","quote","notes"] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`mr-6 py-3 text-3.25 font-semibold border-b-2 transition-colors cursor-pointer bg-transparent capitalize
                      ${activeTab === t ? "text-white border-[#2b7fff]" : "text-white/35 border-transparent hover:text-white/60"}`}>
                    {t === "brief" ? "Production Brief" : t === "quote" ? "Quote Details" : "Notes & References"}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-8">
                {activeTab === "brief" && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <p className="text-white/40 text-2.75 font-semibold tracking-[1px] uppercase mb-2">Description</p>
                      <p className="text-white/70 text-3.5">{selected.desc || <span className="text-white/25">No description added yet.</span>}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/4 rounded-xl p-4">
                        <p className="text-white/40 text-2.75 uppercase tracking-[1px] mb-1">Status</p>
                        <Badge status={selected.status} />
                      </div>
                      <div className="bg-white/4 rounded-xl p-4">
                        <p className="text-white/40 text-2.75 uppercase tracking-[1px] mb-1">Created</p>
                        <p className="text-white text-3.5 font-medium">{fmtDate(selected.createdAt)}</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button onClick={() => openEdit(selected, { stopPropagation: () => {} } as unknown as React.MouseEvent)}
                        className="px-4 py-2 border border-white/15 text-white/60 text-3.25 font-medium rounded-lg hover:border-white/35 hover:text-white transition-colors cursor-pointer bg-transparent">
                        Edit Brief
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "quote" && (
                  <div className="flex flex-col gap-4">
                    {selected.quote ? (
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          ["Quantity", selected.quote.qty],
                          ["Target Delivery", selected.quote.targetDelivery],
                          ["Description", selected.quote.desc],
                          ["Reference", selected.quote.reference],
                        ].map(([label, value]) => value ? (
                          <div key={String(label)} className="bg-white/4 rounded-xl p-4">
                            <p className="text-white/40 text-2.75 uppercase tracking-[1px] mb-1">{String(label)}</p>
                            <p className="text-white text-3.5">{String(value)}</p>
                          </div>
                        ) : null)}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-white/30 text-sm mb-4">No quote details yet.</p>
                        <p className="text-white/20 text-xs">Quote details will appear here once a production quote has been issued.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "notes" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="text-white/40 text-2.75 uppercase tracking-[1px] font-semibold block mb-2">Notes</label>
                      <textarea
                        value={notesVal}
                        onChange={e => setNotesVal(e.target.value)}
                        rows={6}
                        placeholder="Add production notes, reminders, or context…"
                        className="w-full bg-white/4 border border-white/10 rounded-xl p-4 text-white text-3.5 resize-none outline-none focus:border-[#2b7fff] transition-colors placeholder-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-2.75 uppercase tracking-[1px] font-semibold block mb-2">References</label>
                      <textarea
                        value={refVal}
                        onChange={e => setRefVal(e.target.value)}
                        rows={3}
                        placeholder="Links, image references, or inspiration notes…"
                        className="w-full bg-white/4 border border-white/10 rounded-xl p-4 text-white text-3.5 resize-none outline-none focus:border-[#2b7fff] transition-colors placeholder-white/20"
                      />
                    </div>
                    <button onClick={saveNotes}
                      className="self-start px-5 py-2.5 bg-[#2b7fff] text-white font-semibold text-3.25 rounded-lg hover:bg-[#1a60d4] transition-colors cursor-pointer border-0">
                      Save Notes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-115 mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <h3 className="text-white font-bold text-4">{editTarget ? "Edit Workspace" : "New Workspace"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-white/40 hover:text-white text-xl bg-transparent border-0 cursor-pointer">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-white/50 text-3 uppercase tracking-[1px] font-semibold block mb-1.5">Workspace Name *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Summer Drop 2026"
                  className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-3 uppercase tracking-[1px] font-semibold block mb-1.5">Brand / Company *</label>
                <input value={formBrand} onChange={e => setFormBrand(e.target.value)}
                  placeholder="e.g. Palace"
                  className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-3 uppercase tracking-[1px] font-semibold block mb-1.5">Status</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value as WorkspaceStatus)}
                  className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none focus:border-[#2b7fff] transition-colors">
                  {(["Draft","Quoted","In Production","Delivered"] as WorkspaceStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-3 uppercase tracking-[1px] font-semibold block mb-1.5">Description</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  rows={3} placeholder="Brief description of this order…"
                  className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 border border-white/15 text-white/60 text-sm font-medium rounded-lg hover:border-white/35 hover:text-white transition-colors cursor-pointer bg-transparent">
                Cancel
              </button>
              <button onClick={saveWorkspace} disabled={saving || !formName.trim() || !formBrand.trim()}
                className="flex-1 py-2.5 bg-[#2b7fff] hover:bg-[#1a60d4] disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer border-0">
                {saving ? "Saving…" : (editTarget ? "Save Changes" : "Create Workspace")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-95 mx-4 p-6">
            <h3 className="text-white font-bold text-4 mb-2">Delete workspace?</h3>
            <p className="text-white/50 text-3.25 mb-6">
              &ldquo;{deleteTarget.name}&rdquo; will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-white/15 text-white/60 text-sm font-medium rounded-lg hover:border-white/35 hover:text-white transition-colors cursor-pointer bg-transparent">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer border-0">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}

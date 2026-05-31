"use client";

/**
 * /pim/settings/team — manage workspace members
 *
 * Lists current members with roles.
 * Admins can remove members and change roles (owner → admin → member).
 * Invite flow: enter an email → looks up the Supabase user by email
 * via a service-role API call, then inserts an org_members row.
 *
 * Note: for a proper invite-by-email flow you'd send a magic link;
 * for now we create the membership row directly (user must already
 * have an account). This is the MVP path.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Trash,
  Crown,
  ShieldCheck,
  User,
} from "@phosphor-icons/react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Org { id: string; name: string; my_role: string }

interface OrgMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  email?: string;     // enriched client-side from auth if available
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
  owner:  { label: "Owner",  Icon: Crown,       cls: "bg-amber-50 text-amber-700"   },
  admin:  { label: "Admin",  Icon: ShieldCheck,  cls: "bg-blue-50 text-blue-700"     },
  member: { label: "Member", Icon: User,         cls: "bg-neutral-100 text-neutral-600" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    apiGet<{ orgs: Org[] }>("/pim/orgs").then((r) => {
      const o = r.orgs[0];
      if (!o) return;
      setOrg(o);
      return apiGet<{ members: OrgMember[] }>(`/pim/orgs/${o.id}/members`);
    }).then((r) => {
      if (r) setMembers(r.members);
    }).finally(() => setLoading(false));
  }, []);

  const isAdmin = org?.my_role === "owner" || org?.my_role === "admin";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const member = await apiPost<OrgMember>(
        `/pim/orgs/${org.id}/members/invite`,
        { email: inviteEmail.trim(), role: inviteRole }
      );
      setMembers((p) => [...p, member]);
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (e: unknown) {
      setInviteError(
        e instanceof Error ? e.message : "Couldn't find a user with that email."
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!org) return;
    await apiDelete(`/pim/orgs/${org.id}/members/${memberId}`);
    setMembers((p) => p.filter((m) => m.id !== memberId));
  }

  if (loading || !org) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/pim/settings"
          className="text-neutral-400 transition hover:text-neutral-700"
          aria-label="Back to settings"
        >
          <ArrowLeft size={16} weight="regular" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {org.name}
          </p>
          <h1 className="mt-0.5 font-display text-xl tracking-tight">Team</h1>
        </div>
      </div>

      {/* Member list */}
      <div className="mb-6 overflow-hidden rounded-xl border border-neutral-200">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">
            No members yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {members.map((m) => {
              const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.member;
              const Icon = cfg.Icon;
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar placeholder */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                    <User size={14} weight="regular" aria-hidden />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {m.email ?? m.user_id.slice(0, 8) + "…"}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Joined {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
                    <Icon size={10} weight="fill" aria-hidden />
                    {cfg.label}
                  </span>

                  {isAdmin && m.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="flex-shrink-0 text-neutral-400 transition hover:text-red-500"
                      aria-label={`Remove ${m.email ?? "member"}`}
                    >
                      <Trash size={14} weight="regular" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Invite form — admins only */}
      {isAdmin && (
        <div className="rounded-xl border border-neutral-200 p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={16} weight="regular" className="text-neutral-500" aria-hidden />
            <h2 className="text-sm font-semibold text-neutral-700">Invite a teammate</h2>
          </div>
          <p className="mb-4 text-xs text-neutral-500">
            The person must already have an Amenity account. Enter their email
            address and they&apos;ll gain access immediately.
          </p>

          <form onSubmit={handleInvite} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {inviteError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Member added successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {inviting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <UserPlus size={13} weight="regular" aria-hidden />
              )}
              {inviting ? "Adding…" : "Add to workspace"}
            </button>
          </form>
        </div>
      )}

      {/* Role legend */}
      <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Role permissions</p>
        <div className="flex flex-col gap-1.5 text-xs text-neutral-600">
          <p><span className="font-medium text-amber-700">Owner</span> — full access; can transfer ownership</p>
          <p><span className="font-medium text-blue-700">Admin</span> — can manage members, categories, attributes, stages</p>
          <p><span className="font-medium text-neutral-700">Member</span> — can create and edit products and variants</p>
        </div>
      </div>
    </div>
  );
}

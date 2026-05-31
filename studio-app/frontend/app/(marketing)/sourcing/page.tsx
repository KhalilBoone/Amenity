"use client";

/**
 * /sourcing — Liai sourcing agent
 *
 * Full-page chat interface connected to the live /sourcing/chat API.
 * Stream format: newline-delimited JSON
 *   {"type":"matches","data":[...]}  — manufacturer cards, arrives first
 *   {"type":"token","data":"..."}    — streamed prose tokens
 *   {"type":"done"}                  — stream complete
 *
 * Layout (desktop): left panel = chat thread | right panel = match cards
 * Layout (mobile):  stacked; match cards appear below the latest message
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Sparkle,
  Paperclip,
  MapPin,
  Certificate,
  Factory,
  Clock,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ManufacturerMatch {
  id: string;
  name: string;
  role: string;
  category: string | null;
  specialty: string | null;
  capabilities: string[];
  certifications: string[];
  brands: string[];
  moq: number | null;
  lead_time_weeks: number | null;
  website: string | null;
  contact_email: string | null;
  location: string | null;
  domestic: boolean;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  matches?: ManufacturerMatch[];
  streaming?: boolean;
}

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const SUGGESTED = [
  "Heavyweight French terry hoodies, 500 units, domestic only.",
  "Cut & sew activewear, MOQ under 200, quick turnaround.",
  "Berry-compliant fleece blanks for a federal contract.",
  "Selvedge denim jeans, 14 oz, small batch, Portugal or Japan.",
  "Screen print decorator, sub-50 MOQ, full-color DTG fallback.",
  "Sneakers, leather upper, Made in Portugal, MOQ 200–500.",
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SourcingPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeMatches, setActiveMatches] = useState<ManufacturerMatch[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchParams = useSearchParams();
  const briefFired = useRef(false);

  const hasMessages = messages.length > 0;

  // Build conversation history from messages (for multi-turn context)
  const buildHistory = useCallback((): HistoryItem[] => {
    return messages
      .filter((m) => !m.streaming)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));
  }, [messages]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Fire a pre-filled brief from ?brief= query param (e.g. from manufacturer cards)
  useEffect(() => {
    if (briefFired.current) return;
    const prefill = searchParams.get("brief");
    if (prefill) {
      briefFired.current = true;
      // Small delay so the page has mounted and the API is ready
      const t = window.setTimeout(() => send(prefill), 400);
      return () => window.clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setInput("");
    setBusy(true);

    const userMsgId = `user-${Date.now()}`;
    const agentMsgId = `agent-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: trimmed },
      { id: agentMsgId, role: "agent", text: "", streaming: true },
    ]);

    const history = buildHistory();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/sourcing/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const frame = JSON.parse(line);

            if (frame.type === "matches") {
              const matches: ManufacturerMatch[] = frame.data;
              setActiveMatches(matches);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId ? { ...m, matches } : m
                )
              );
            } else if (frame.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? { ...m, text: m.text + frame.data }
                    : m
                )
              );
            } else if (frame.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId ? { ...m, streaming: false } : m
                )
              );
            }
          } catch {
            // Malformed JSON line — skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? {
                ...m,
                text: "Something went wrong reaching the sourcing network. Please try again.",
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left: Chat panel ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-neutral-100 lg:max-w-[560px]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3">
          <Link
            href="/"
            className="text-neutral-400 transition hover:text-neutral-700"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} weight="regular" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkle size={14} weight="fill" className="text-neutral-500" />
            <span className="text-sm font-medium">Liai</span>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {activeMatches.length > 0
              ? `${activeMatches.length} matches`
              : "Live network"}
          </span>
        </div>

        {/* Message thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-6"
        >
          {!hasMessages && <EmptyState onPrompt={send} />}
          {hasMessages && (
            <div className="flex flex-col gap-5">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-neutral-100 bg-white px-4 pb-4 pt-3"
        >
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow focus-within:shadow-md focus-within:border-neutral-400">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              placeholder="Describe what you're sourcing — fabric, category, MOQ, certifications, quantity…"
              rows={2}
              className="w-full resize-none px-4 pt-3 pb-2 text-sm leading-relaxed outline-none placeholder:text-neutral-400 disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <p className="text-[11px] text-neutral-400">
                Shift+Enter for new line
              </p>
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 transition-all duration-200 hover:bg-neutral-200 disabled:opacity-40 [&:not(:disabled)]:bg-ink [&:not(:disabled)]:text-paper [&:not(:disabled)]:hover:bg-neutral-800"
                aria-label="Send"
              >
                {busy ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ArrowRight size={13} weight="bold" className="-rotate-45" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Right: Manufacturer results panel ────────────────────────── */}
      <div className="hidden flex-1 flex-col overflow-hidden lg:flex">
        <div className="border-b border-neutral-100 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Matched manufacturers
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeMatches.length === 0 ? (
            <EmptyMatchPanel />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {activeMatches.map((m) => (
                <ManufacturerCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state — shown before first message
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onPrompt }: { onPrompt: (t: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
          <Sparkle size={11} weight="fill" aria-hidden /> Liai
        </div>
        <h1 className="mt-4 font-display text-2xl leading-snug tracking-tight">
          Describe what you&apos;re sourcing.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Fabric, category, quantity, certifications, timeline — the more detail
          you give, the sharper the match.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Try a prompt
        </p>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => onPrompt(s)}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyMatchPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Factory size={32} weight="thin" className="text-neutral-300" />
      <p className="text-sm text-neutral-400">
        Manufacturer matches will appear here
        <br />
        as you describe your needs.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[90%] flex-col gap-3 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {!isUser && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            <Sparkle size={10} weight="fill" aria-hidden /> Liai
          </span>
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-ink text-paper"
              : "bg-neutral-50 text-neutral-800"
          }`}
        >
          {message.text || (message.streaming ? null : "…")}
          {message.streaming && (
            <span className="ml-1 inline-block h-3 w-[2px] animate-pulse bg-neutral-400" />
          )}
        </div>

        {/* Mobile match cards — shown inline on small screens */}
        {message.matches && message.matches.length > 0 && (
          <div className="flex flex-col gap-2 w-full lg:hidden">
            {message.matches.map((m) => (
              <ManufacturerCard key={m.id} match={m} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manufacturer card
// ─────────────────────────────────────────────────────────────────────────────

const SWATCHES = [
  "bg-stone-200", "bg-amber-100", "bg-zinc-200", "bg-neutral-200",
  "bg-emerald-100", "bg-stone-300", "bg-amber-50", "bg-sky-100",
];

function ManufacturerCard({
  match,
  compact = false,
}: {
  match: ManufacturerMatch;
  compact?: boolean;
}) {
  const swatch =
    SWATCHES[
      (match.name.charCodeAt(0) + match.name.length) % SWATCHES.length
    ];

  const caps = (match.capabilities ?? []).slice(0, 3);
  const certs = (match.certifications ?? []).slice(0, 2);
  const score = Math.round((match.similarity ?? 0) * 100);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-sm ${
        compact ? "text-xs" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-ink/70 ${swatch}`}
          >
            {match.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("")}
          </div>
          <div>
            <p className="font-semibold leading-tight text-sm">{match.name}</p>
            {match.location && (
              <p className="inline-flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5">
                <MapPin size={10} weight="regular" aria-hidden />
                {match.location}
              </p>
            )}
          </div>
        </div>
        <span className="flex-shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
          {score}%
        </span>
      </div>

      {/* Specialty */}
      {match.specialty && (
        <p className="text-[11px] leading-snug text-neutral-600 line-clamp-2">
          {match.specialty}
        </p>
      )}

      {/* Capabilities */}
      {caps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {caps.map((c) => (
            <span
              key={c}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
        {match.moq != null && (
          <span className="inline-flex items-center gap-1">
            <Factory size={11} weight="regular" aria-hidden />
            MOQ {match.moq.toLocaleString()}
          </span>
        )}
        {match.lead_time_weeks != null && (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} weight="regular" aria-hidden />
            {match.lead_time_weeks}w lead
          </span>
        )}
        {match.domestic && (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            Domestic
          </span>
        )}
      </div>

      {/* Certs */}
      {certs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {certs.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-600"
            >
              <Certificate size={9} weight="regular" aria-hidden />
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Website link */}
      {match.website && (
        <a
          href={match.website.startsWith("http") ? match.website : `https://${match.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          Visit website
          <ArrowRight size={9} weight="bold" className="-rotate-45" />
        </a>
      )}
    </div>
  );
}

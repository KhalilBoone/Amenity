"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When true, creating a workspace is triggered after sign-in */
  startOrder?: boolean;
}

type Tab = "signin" | "signup";

const FRIENDLY: Record<string, string> = {
  "auth/user-not-found":        "No account found with that email.",
  "auth/wrong-password":        "Incorrect password.",
  "auth/invalid-credential":    "Incorrect email or password.",
  "auth/email-already-in-use":  "That email is already registered.",
  "auth/invalid-email":         "Please enter a valid email address.",
  "auth/weak-password":         "Password is too weak.",
  "auth/popup-closed-by-user":  "Sign-in was cancelled.",
  "auth/popup-blocked":         "Pop-up was blocked by your browser. Allow pop-ups for this site.",
  "auth/network-request-failed":"Network error — check your connection.",
  "auth/unauthorized-domain":   "Sign-in is not enabled for this domain.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/too-many-requests":     "Too many attempts — try again later.",
};

function googleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function AuthModal({ isOpen, onClose, startOrder }: Props) {
  const [tab, setTab]           = useState<Tab>("signin");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  // sign-in fields
  const [siEmail, setSiEmail]   = useState("");
  const [siPass, setSiPass]     = useState("");

  // sign-up fields
  const [suName, setSuName]     = useState("");
  const [suEmail, setSuEmail]   = useState("");
  const [suPass, setSuPass]     = useState("");

  const { signInEmail, signUpEmail, signInGoogle } = useAuth();

  const dest = startOrder ? "/studio" : "/dashboard";

  // Reset form on open
  useEffect(() => {
    if (isOpen) { setError(""); setBusy(false); }
  }, [isOpen]);

  if (!isOpen) return null;

  const wrap = async (fn: () => Promise<void>) => {
    setError(""); setBusy(true);
    try {
      await fn();
      onClose();
      window.location.href = dest;
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      setError(FRIENDLY[code] ?? "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-300 flex items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="relative w-full max-w-sm mx-4 bg-[#141414] border border-white/10 rounded-2xl p-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none bg-transparent border-0 cursor-pointer"
        >✕</button>

        {/* Logo */}
        <p className="text-lg font-extrabold text-white tracking-tight mb-1">
          Amenity<span className="text-[#2b7fff]"> Studio</span>
        </p>
        <p className="text-xs text-white/40 mb-7">
          {startOrder ? "Sign in to start your order." : "Sign in to manage your workspaces."}
        </p>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`mr-5 pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer bg-transparent
                ${tab === t ? "text-white border-[#2b7fff]" : "text-white/40 border-transparent"}`}
            >
              {t === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        {/* Sign In */}
        {tab === "signin" && (
          <div className="flex flex-col gap-3">
            <input
              className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors"
              type="email" placeholder="Email address" value={siEmail}
              onChange={e => setSiEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && wrap(() => signInEmail(siEmail, siPass))}
            />
            <input
              className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors"
              type="password" placeholder="Password" value={siPass}
              onChange={e => setSiPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && wrap(() => signInEmail(siEmail, siPass))}
            />
            <button
              disabled={busy}
              onClick={() => wrap(() => signInEmail(siEmail, siPass))}
              className="w-full bg-[#2b7fff] hover:bg-[#1a60d4] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-3 transition-colors cursor-pointer border-0 mt-1"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
            <div className="flex items-center gap-3 text-white/25 text-xs my-1">
              <span className="flex-1 h-px bg-white/10" />or<span className="flex-1 h-px bg-white/10" />
            </div>
            <button
              disabled={busy}
              onClick={() => wrap(signInGoogle)}
              className="w-full bg-white hover:opacity-90 text-gray-900 font-semibold text-sm rounded-lg py-3 flex items-center justify-center gap-2.5 transition-opacity cursor-pointer border-0"
            >
              {googleIcon()} Continue with Google
            </button>
          </div>
        )}

        {/* Sign Up */}
        {tab === "signup" && (
          <div className="flex flex-col gap-3">
            <input
              className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors"
              type="text" placeholder="Your name" value={suName}
              onChange={e => setSuName(e.target.value)}
            />
            <input
              className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors"
              type="email" placeholder="Email address" value={suEmail}
              onChange={e => setSuEmail(e.target.value)}
            />
            <input
              className="w-full bg-white/6 border border-white/10 rounded-lg text-white text-sm px-3.5 py-3 outline-none placeholder-white/25 focus:border-[#2b7fff] transition-colors"
              type="password" placeholder="Password (min 8 chars)" value={suPass}
              onChange={e => setSuPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && wrap(() => signUpEmail(suName, suEmail, suPass))}
            />
            <button
              disabled={busy}
              onClick={() => wrap(() => signUpEmail(suName, suEmail, suPass))}
              className="w-full bg-[#2b7fff] hover:bg-[#1a60d4] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-3 transition-colors cursor-pointer border-0 mt-1"
            >
              {busy ? "Creating account…" : "Create Account"}
            </button>
            <div className="flex items-center gap-3 text-white/25 text-xs my-1">
              <span className="flex-1 h-px bg-white/10" />or<span className="flex-1 h-px bg-white/10" />
            </div>
            <button
              disabled={busy}
              onClick={() => wrap(signInGoogle)}
              className="w-full bg-white hover:opacity-90 text-gray-900 font-semibold text-sm rounded-lg py-3 flex items-center justify-center gap-2.5 transition-opacity cursor-pointer border-0"
            >
              {googleIcon()} Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

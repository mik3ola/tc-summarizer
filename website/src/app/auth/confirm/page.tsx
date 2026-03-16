"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://rsxvxezucgczesplmjiw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHZ4ZXp1Y2djemVzcGxtaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcwNjYsImV4cCI6MjA4MzU0MzA2Nn0.1umoIH60gsytGtmfbgfxr1OZJs_L-62wT_BWVaMt5lw";

// Development unpacked extension ID — update to the Chrome Web Store ID once published.
const EXTENSION_ID = "hhcahilgcmhkdlemlahmgchbjacohahm";

type Status = "verifying" | "success" | "error" | "already_confirmed";

export default function ConfirmPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("The confirmation link is invalid or has expired.");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") ?? "signup";

    // If Supabase already verified and just redirected (no token in URL), show success
    if (!tokenHash) {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage("No confirmation token found. Please use the link from your email.");
      }
      return;
    }

    fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ token_hash: tokenHash, type }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          if (data.error === "Email link is invalid or has expired") {
            setStatus("already_confirmed");
          } else {
            setStatus("error");
            setErrorMessage(data.error_description ?? data.error ?? "Verification failed.");
          }
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      });
  }, []);

  const openExtension = () => {
    if (EXTENSION_ID) {
      window.open(`chrome-extension://${EXTENSION_ID}/src/options.html`, "_blank");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <Image src="/logo.png" alt="TermsDigest" width={36} height={36} />
        <span className="font-display text-xl font-bold tracking-tight">TermsDigest</span>
      </div>

      <div className="max-w-md w-full">
        {status === "verifying" && <Verifying />}
        {status === "success" && <Success onOpenExtension={EXTENSION_ID ? openExtension : null} />}
        {status === "already_confirmed" && <AlreadyConfirmed onOpenExtension={EXTENSION_ID ? openExtension : null} />}
        {status === "error" && <ErrorState message={errorMessage} />}
      </div>
    </main>
  );
}

// ─── States ──────────────────────────────────────────────────────────────────

function Verifying() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-3">Confirming your email…</h1>
      <p className="text-gray-400 text-sm">Just a moment.</p>
    </div>
  );
}

function Success({ onOpenExtension }: { onOpenExtension: (() => void) | null }) {
  return (
    <div className="text-center">
      {/* Tick */}
      <div className="relative w-20 h-20 mx-auto mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-green-500/20 animate-ping" />
      </div>

      <h1 className="font-display text-3xl font-bold mb-3">
        Email <span className="gradient-text">confirmed</span>
      </h1>
      <p className="text-gray-400 text-sm mb-10">
        Your TermsDigest account is ready. Sign in from the extension to start summarising.
      </p>

      <div className="glass-card rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-semibold text-white/80 mb-4">Next step</p>
        {onOpenExtension ? (
          <>
            <button
              onClick={onOpenExtension}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-semibold text-white text-sm mb-4"
            >
              Open TermsDigest → Sign In
            </button>
            <p className="text-gray-500 text-xs text-center leading-relaxed">
              Can&apos;t see the page? Open the <strong className="text-gray-300">extensions menu</strong> in your browser toolbar
              (Chrome/Edge: 🧩 puzzle piece; Firefox: puzzle piece or ≡ menu), then pin and open <strong className="text-gray-300">TermsDigest</strong>.
            </p>
          </>
        ) : (
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
              <span>Open the <strong className="text-white">extensions menu</strong> in your toolbar (top-right, next to the address bar). In Chrome or Edge, it&apos;s the 🧩 puzzle piece; in Firefox, the puzzle piece or ≡ menu.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
              <span>Find <strong className="text-white">TermsDigest</strong> in the list and pin it (📌) to your toolbar so it&apos;s easy to access.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
              <span>Click the <strong className="text-white">TermsDigest icon</strong> and sign in with your email and password.</span>
            </li>
          </ol>
        )}
      </div>

      <p className="text-gray-600 text-xs">You can close this tab after signing in.</p>
    </div>
  );
}

function AlreadyConfirmed({ onOpenExtension }: { onOpenExtension: (() => void) | null }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
        <svg className="w-9 h-9 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
        </svg>
      </div>

      <h1 className="font-display text-2xl font-bold mb-3">Already confirmed</h1>
      <p className="text-gray-400 text-sm mb-8">
        Your email has already been verified. Go ahead and sign in.
      </p>

      {onOpenExtension ? (
        <>
          <button
            onClick={onOpenExtension}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-semibold text-white text-sm mb-4"
          >
            Open TermsDigest → Sign In
          </button>
          <p className="text-gray-500 text-xs text-center leading-relaxed">
            Can&apos;t see the page? Open the <strong className="text-gray-300">extensions menu</strong> in your browser toolbar
            (Chrome/Edge: 🧩 puzzle piece; Firefox: puzzle piece or ≡ menu), then pin and open <strong className="text-gray-300">TermsDigest</strong>.
          </p>
        </>
      ) : (
        <div className="glass-card rounded-2xl p-5 text-left">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
              <span>Open the <strong className="text-white">extensions menu</strong> in your toolbar (top-right, next to the address bar). In Chrome or Edge, it&apos;s the 🧩 puzzle piece; in Firefox, the puzzle piece or ≡ menu.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
              <span>Find <strong className="text-white">TermsDigest</strong> in the list and pin it (📌) to your toolbar so it&apos;s easy to access.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
              <span>Click the <strong className="text-white">TermsDigest icon</strong> and sign in with your email and password.</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
        <svg className="w-9 h-9 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>

      <h1 className="font-display text-2xl font-bold mb-3">Confirmation failed</h1>
      <p className="text-gray-400 text-sm mb-8">{message}</p>

      <div className="glass-card rounded-2xl p-5 text-left mb-6">
        <p className="text-sm text-gray-400 leading-relaxed">
          Try signing in from the extension — if your account was already created it may work regardless. Otherwise, create a new account.
        </p>
      </div>

      <a
        href="https://termsdigest.com/support"
        className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
      >
        Contact support
      </a>
    </div>
  );
}

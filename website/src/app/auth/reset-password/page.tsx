"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SUPABASE_URL = "https://rsxvxezucgczesplmjiw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHZ4ZXp1Y2djemVzcGxtaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcwNjYsImV4cCI6MjA4MzU0MzA2Nn0.1umoIH60gsytGtmfbgfxr1OZJs_L-62wT_BWVaMt5lw";

type Stage = "form" | "loading" | "success" | "error" | "invalid";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("invalid");
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Supabase puts the access_token in the URL hash after redirect
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const token = params.get("access_token");
    const type = params.get("type");

    if (token && type === "recovery") {
      setAccessToken(token);
      setStage("form");
    } else {
      setStage("invalid");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStage("loading");

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setStage("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message ?? data?.error_description ?? "Password update failed.");
        setStage("form");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStage("form");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <Image src="/logo.png" alt="TermsDigest" width={36} height={36} />
        <span className="font-display text-xl font-bold tracking-tight">TermsDigest</span>
      </div>

      <div className="max-w-md w-full">
        {stage === "invalid" && <InvalidLink />}
        {stage === "success" && <Success />}
        {(stage === "form" || stage === "loading") && (
          <ResetForm
            password={password}
            confirm={confirm}
            errorMsg={errorMsg}
            loading={stage === "loading"}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </main>
  );
}

function ResetForm({
  password, confirm, errorMsg, loading,
  onPasswordChange, onConfirmChange, onSubmit,
}: {
  password: string;
  confirm: string;
  errorMsg: string;
  loading: boolean;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Set new password</h1>
        <p className="text-gray-400 text-sm">Choose a strong password for your TermsDigest account.</p>
      </div>

      <form onSubmit={onSubmit} className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="At least 8 characters"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="Repeat your new password"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {errorMsg && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-white text-sm"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function Success() {
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-green-500/20 animate-ping" />
      </div>

      <h1 className="font-display text-2xl font-bold mb-3">Password updated</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Your password has been changed successfully.
      </p>

      <div className="glass-card rounded-2xl p-5 text-left">
        <p className="text-sm font-semibold text-white/80 mb-3">Next step</p>
        <ol className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
            <span>Open the <strong className="text-white">extensions menu</strong> in your browser toolbar.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
            <span>Click <strong className="text-white">TermsDigest</strong> and sign in with your new password.</span>
          </li>
        </ol>
      </div>

      <p className="text-gray-600 text-xs mt-6">You can close this tab.</p>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
        <svg className="w-9 h-9 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold mb-3">Link invalid or expired</h1>
      <p className="text-gray-400 mb-6 text-sm">
        This password reset link has expired or already been used. Reset links are valid for 1 hour.
      </p>
      <p className="text-gray-500 text-sm">
        Open the <strong className="text-white">TermsDigest extension</strong>, click <strong className="text-white">Login</strong>, and use <strong className="text-white">Forgot password?</strong> to request a new link.
      </p>
    </div>
  );
}

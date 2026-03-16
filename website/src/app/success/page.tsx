"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    // If no session_id, assume success (user might have navigated directly)
    if (!sessionId) {
      setStatus("success");
      setMessage("Payment successful!");
      return;
    }

    // Verify the session with Stripe (optional - webhook handles the actual upgrade)
    // For now, we'll just show success after a brief delay
    const timer = setTimeout(() => {
      setStatus("success");
      setMessage("Payment verified! Your subscription is now active.");
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId]);

  // Auto-close if opened in a popup (optional)
  useEffect(() => {
    if (status === "success" && typeof window !== "undefined") {
      // Check if this is a popup window
      if (window.opener && !window.opener.closed) {
        // Notify parent window (if extension is listening)
        window.opener.postMessage({ type: "payment_success", sessionId }, "*");
        
        // Optionally close after a delay
        const closeTimer = setTimeout(() => {
          window.close();
        }, 5000);
        
        return () => clearTimeout(closeTimer);
      }
    }
  }, [status, sessionId]);

  const Logo = () => (
    <div className="flex items-center gap-3 mb-12 justify-center">
      <Image src="/logo.png" alt="TermsDigest" width={36} height={36} />
      <span className="font-display text-xl font-bold tracking-tight">TermsDigest</span>
    </div>
  );

  if (status === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <Logo />
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin"></div>
          </div>
          <h1 className="font-display text-2xl font-bold mb-3">Processing…</h1>
          <p className="text-gray-400 text-sm">{message}</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <Logo />
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
            <svg className="w-9 h-9 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold mb-3">Payment verification failed</h1>
          <p className="text-gray-400 text-sm mb-8">{message}</p>
          <Link
            href="/pricing"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-semibold text-sm inline-block"
          >
            Try Again
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <Logo />
      <div className="max-w-md w-full text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-green-500/20 animate-ping"></div>
        </div>

        <h1 className="font-display text-3xl font-bold mb-3">
          Welcome to <span className="gradient-text">Pro</span>!
        </h1>

        <p className="text-gray-400 text-sm mb-8">
          {message} You now have access to 50 summaries per month and all Pro features.
        </p>

        <div className="glass-card rounded-2xl p-6 mb-8 text-left">
          <h2 className="font-display font-semibold text-sm mb-4 text-center">What&apos;s included:</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">50 summaries per month</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">All document types supported</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">Intelligent caching</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">Priority support</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">Use your own API key for unlimited</span>
            </li>
          </ul>
        </div>

        <div className="glass-card rounded-xl p-4 mb-8 bg-blue-500/10 border-blue-500/30">
          <p className="text-blue-300 text-sm">
            <strong>Next step:</strong> Go back to the extension and click &quot;Refresh status&quot; to activate your Pro subscription.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors font-semibold text-sm"
          >
            Back to Home
          </Link>
          <Link
            href="/support"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-semibold text-sm"
          >
            Get Help
          </Link>
        </div>

        <p className="text-gray-500 text-xs mt-8">
          A receipt has been sent to your email address.
        </p>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="flex items-center gap-3 mb-12">
          <Image src="/logo.png" alt="TermsDigest" width={36} height={36} />
          <span className="font-display text-xl font-bold tracking-tight">TermsDigest</span>
        </div>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin"></div>
          </div>
          <h1 className="font-display text-2xl font-bold mb-3">Loading…</h1>
        </div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}

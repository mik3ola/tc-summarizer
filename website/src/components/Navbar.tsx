"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-6">
      <nav className={`w-full max-w-6xl rounded-2xl backdrop-blur-md border shadow-xl transition-colors ${isDark ? "bg-black/65 border-white/10" : "bg-white/85 border-gray-200/80"}`}>
        <div className="px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="TermsDigest" width={36} height={36} className="w-9 h-9" />
            <span className={`font-semibold text-lg tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>TermsDigest</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className={`text-sm font-medium transition-colors ${isDark ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>Features</Link>
            <Link href="/#pricing" className={`text-sm font-medium transition-colors ${isDark ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>Pricing</Link>
            <Link href="/support" className={`text-sm font-medium transition-colors ${isDark ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>Support</Link>
            <ThemeToggle />
            <a
              href="https://chrome.google.com/webstore/detail/termsdigest"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-5 py-2 rounded text-sm font-medium transition-all text-white"
            >
              Install Free
            </a>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            >
              {menuOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className={`md:hidden border-t rounded-b-2xl px-8 py-5 flex flex-col gap-4 ${isDark ? "border-white/10" : "border-gray-200"}`}>
            <Link href="/#features" onClick={() => setMenuOpen(false)} className={`text-sm font-medium transition-colors ${isDark ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900"}`}>Features</Link>
            <Link href="/#pricing" onClick={() => setMenuOpen(false)} className={`text-sm font-medium transition-colors ${isDark ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900"}`}>Pricing</Link>
            <Link href="/support" onClick={() => setMenuOpen(false)} className={`text-sm font-medium transition-colors ${isDark ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900"}`}>Support</Link>
            <a
              href="https://chrome.google.com/webstore/detail/termsdigest"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-4 py-2.5 rounded text-sm font-medium transition-all text-white text-center"
            >
              Install Free
            </a>
          </div>
        )}
      </nav>
    </div>
  );
}

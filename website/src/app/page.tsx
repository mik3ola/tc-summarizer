"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollAnimations from "@/components/ScrollAnimations";
import Navbar from "@/components/Navbar";
import NeuralNetworkHero from "@/components/NeuralNetworkHero";
import GlobeFeatureSection from "@/components/ui/globe-feature-section";
import FlickeringFooter from "@/components/ui/flickering-footer";
import PricingSection from "@/components/PricingSection";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use dark as default for SSR, then switch to actual theme after mount
  const isDark = mounted ? theme === "dark" : true;

  return (
    <main className="min-h-screen">
      <ScrollAnimations />
      <Navbar />

      {/* Hero Section */}
      <NeuralNetworkHero
        title="Stop Blindly Accepting Terms & Conditions"
        description="Hover over any legal link and get an instant AI-powered summary. Understand what you're agreeing to - costs, cancellation, data sharing, and hidden gotchas."
        badgeText="AI-powered summaries"
        badgeLabel="New"
        ctaButtons={[
          { text: "Get Instant Summaries - Free", href: "https://chromewebstore.google.com/detail/elkhddigpcopldfijeaedkehfacdegeh", primary: true, external: true },
          { text: "See it in action", href: "#demo" }
        ]}
        microDetails={["5 free summaries/month", "No credit card", "Privacy first"]}
      />

      {/* Demo Preview */}
      <section className="py-12 px-6 scroll-mt-24" id="demo">
        <div className="max-w-[640px] mx-auto animate-on-scroll">
          <div className="text-center mb-8">
            <p className={`text-sm font-medium uppercase tracking-widest mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Real example</p>
            <h2 className={`text-2xl md:text-3xl font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>See it in action</h2>
          </div>
          <div className="relative">
            {/* Ambient glow (dark mode only) — simulates light pooling behind the video */}
            {isDark && (
              <>
                <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.22),rgba(139,92,246,0.14)_40%,transparent_70%)] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-10 bg-black/70 rounded-[50%] blur-2xl" />
              </>
            )}
            <video
              className={`relative w-full h-auto block rounded-xl ${
                isDark
                  ? 'ring-1 ring-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_60px_-10px_rgba(59,130,246,0.35)]'
                  : 'shadow-2xl'
              }`}
              src="/demo-pin-sample.mp4"
              poster="/demo-pin-sample.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Demo: TermsDigest summarising the Terms & Conditions on a retailer checkout page"
            />
          </div>
          <p
            className={`text-xs text-center mt-4 ${
              isDark ? 'text-white/70' : 'text-gray-500'
            }`}
          >
            TermsDigest is not affiliated with or endorsed by any third-party site shown.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll">
            <p className={`text-sm font-medium uppercase tracking-widest mb-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>How it works</p>
            <h2 className={`text-3xl md:text-4xl font-light tracking-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Understand Any Legal Document</h2>
            <p className={`text-base font-light max-w-xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Three simple steps to never miss a hidden clause again</p>
          </div>

          {/* 3-step cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                  </svg>
                ),
                step: "01",
                title: "Hover over any legal link",
                desc: "Simply hover over any Terms, Privacy Policy, EULA, or refund policy link on any website. No clicking required.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
                    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
                    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
                    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
                    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
                    <path d="M6 18a4 4 0 0 1-1.967-.516" />
                    <path d="M19.967 17.484A4 4 0 0 1 18 18" />
                  </svg>
                ),
                step: "02",
                title: "AI reads and analyses it",
                desc: "Our AI instantly reads the full document and extracts what matters - costs, cancellation terms, data sharing, and red flags.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                step: "03",
                title: "Decide with confidence",
                desc: "Read a plain-English summary in seconds. Know exactly what you're agreeing to before you click accept.",
              },
            ].map(({ icon, step, title, desc }, i) => (
              <div
                key={step}
                style={{
                  ["--glow" as string]: "59,130,246",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                } as React.CSSProperties}
                className={`relative rounded-2xl p-6 transition-all duration-[1800ms] group animate-on-scroll ${i > 0 ? `delay-${i}00` : ''} hover:-translate-y-1 ${
                  isDark
                    ? 'border bg-white/[0.02] border-white/30 shadow-[0_0_18px_-8px_rgba(var(--glow),0.15),inset_0_0_22px_rgba(255,255,255,0.025)] hover:border-[rgba(var(--glow),0.95)] hover:shadow-[0_0_36px_-6px_rgba(var(--glow),0.45),inset_0_0_26px_rgba(255,255,255,0.04)]'
                    : 'border border-transparent bg-white shadow-[0_10px_38px_-11px_rgba(15,23,42,0.18),0_3px_12px_-4px_rgba(15,23,42,0.09)] hover:shadow-[0_22px_48px_-11px_rgba(15,23,42,0.26),0_6px_16px_-4px_rgba(15,23,42,0.11)]'
                }`}
              >
                {/* Step number */}
                <div className={`absolute top-5 right-5 text-xs font-mono font-bold ${isDark ? 'text-white/20' : 'text-gray-200'}`}>{step}</div>
                {/* Centred icon */}
                <div className={`flex justify-center mb-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {icon}
                </div>
                <h3 className={`text-base font-semibold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm leading-relaxed text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Feature cards 2×2 */}
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                ),
                title: "Smart Detection",
                desc: "Automatically detects Terms, Privacy, EULA, Refund policies - on any website. Recognised links are marked with a subtle glow and animated underline so you can spot them at a glance.",
                iconColor: isDark ? "text-purple-400" : "text-purple-600",
                glow: "168,85,247",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: "Instant Analysis",
                desc: "Get summaries in seconds, not minutes. Our AI processes legal text blazingly fast.",
                iconColor: isDark ? "text-yellow-400" : "text-yellow-600",
                glow: "234,179,8",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
                title: "Privacy First",
                desc: "We never store the pages you visit. Your browsing history stays completely private.",
                iconColor: isDark ? "text-green-400" : "text-green-600",
                glow: "34,197,94",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                ),
                title: "Plain English",
                desc: "No legal jargon. Every summary is written in clear, easy-to-understand language.",
                iconColor: isDark ? "text-blue-400" : "text-blue-600",
                glow: "59,130,246",
              },
            ].map(({ icon, title, desc, iconColor, glow }, i) => (
              <div
                key={title}
                style={{
                  ["--glow" as string]: glow,
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                } as React.CSSProperties}
                className={`flex gap-4 p-5 rounded-xl transition-all duration-[1800ms] animate-on-scroll ${i > 0 ? `delay-${i}00` : ''} hover:-translate-y-1 ${
                  isDark
                    ? 'border bg-white/[0.02] border-white/30 shadow-[0_0_18px_-8px_rgba(var(--glow),0.15),inset_0_0_22px_rgba(255,255,255,0.025)] hover:border-[rgba(var(--glow),0.95)] hover:shadow-[0_0_36px_-6px_rgba(var(--glow),0.45),inset_0_0_26px_rgba(255,255,255,0.04)]'
                    : 'border border-transparent bg-white shadow-[0_10px_38px_-11px_rgba(15,23,42,0.18),0_3px_12px_-4px_rgba(15,23,42,0.09)] hover:shadow-[0_22px_48px_-11px_rgba(15,23,42,0.26),0_6px_16px_-4px_rgba(15,23,42,0.11)]'
                }`}
              >
                <div className={`flex-shrink-0 ${iconColor}`}>
                  {icon}
                </div>
                <div>
                  <h3 className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section with Globe */}
      <GlobeFeatureSection />

      {/* Footer with Flickering Grid */}
      <FlickeringFooter />
    </main>
  );
}

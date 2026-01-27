"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollAnimations from "@/components/ScrollAnimations";
import ThemeToggle from "@/components/ThemeToggle";
import NeuralNetworkHero from "@/components/NeuralNetworkHero";
import GlobeFeatureSection from "@/components/ui/globe-feature-section";
import FlickeringFooter from "@/components/ui/flickering-footer";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Only used for components that absolutely need JS-based theme detection
  const isDark = mounted ? theme === "dark" : true;

  return (
    <main className="min-h-screen">
      <ScrollAnimations />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b bg-white/70 dark:bg-black/50 border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="TermsDigest" width={32} height={32} className="w-8 h-8" />
            <span className="font-semibold text-lg tracking-tight text-gray-900 dark:text-white">TermsDigest</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#features" className="text-sm font-light tracking-tight transition-colors text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">Features</Link>
            <span className="text-sm text-gray-300 dark:text-white/30">|</span>
            <Link href="#pricing" className="text-sm font-light tracking-tight transition-colors text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">Pricing</Link>
            <span className="text-sm text-gray-300 dark:text-white/30">|</span>
            <Link href="/support" className="text-sm font-light tracking-tight transition-colors text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">Support</Link>
            <span className="text-sm text-gray-300 dark:text-white/30">|</span>
            <ThemeToggle />
            <a 
              href="https://chrome.google.com/webstore/detail/termsdigest" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-4 py-2 rounded-xl text-sm font-medium transition-colors text-white"
            >
              Install Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <NeuralNetworkHero
        title="Stop Blindly Accepting Terms & Conditions"
        description="Hover over any legal link and get an instant AI-powered summary. Understand what you're agreeing to - costs, cancellation, data sharing, and hidden gotchas."
        badgeText="AI-powered summaries"
        badgeLabel="New"
        ctaButtons={[
          { text: "Add to Chrome - Free", href: "https://chrome.google.com/webstore/detail/termsdigest", primary: true, external: true },
          { text: "See it in action", href: "#demo" }
        ]}
        microDetails={["5 free summaries/month", "No credit card", "Privacy first"]}
      />

      {/* Demo Preview */}
      <section className="py-12 px-6 scroll-mt-24" id="demo">
        <div className="max-w-4xl mx-auto animate-on-scroll">
          <div className="rounded-2xl p-1 glow bg-white dark:glass-card shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-200 dark:border-white/10">
            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900">
              <div className="px-4 py-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">example.com/checkout</span>
                </div>
              </div>
              <div className="p-8 relative min-h-[420px]">
                <div className="mb-4 text-gray-700 dark:text-gray-300">
                  <p className="mb-2">Complete your purchase</p>
                  <p className="text-sm text-gray-500">By continuing, you agree to our{" "}
                    <span className="text-blue-500 underline cursor-pointer relative group">
                      Terms of Service
                      <span className="absolute -right-2 -top-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                    </span>
                  </p>
                </div>
                
                {/* Simulated popover - always dark like the actual extension */}
                <div className="absolute right-4 top-20 w-96 rounded-xl overflow-hidden float bg-slate-800/95 backdrop-blur-md border border-slate-700/50 shadow-2xl" style={{ colorScheme: 'dark' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 gap-3">
                    <span className="font-semibold text-sm text-white">Example Terms Summary</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">Confidence:</span>
                      <span className="text-xs bg-green-500/20 text-green-500 px-2.5 py-1 rounded-full border border-green-500/30 whitespace-nowrap">high</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-5 pb-3">
                    <div className="text-sm mb-3 text-gray-400">
                      Standard e-commerce terms with auto-renewal subscription.
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span>💰</span>
                        <span className="text-gray-300">Monthly billing, auto-renews at £9.99/month</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>↩️</span>
                        <span className="text-gray-300">Cancel anytime, no refunds for partial months</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>🚩</span>
                        <span className="text-red-500">Arbitration clause - cannot sue in court</span>
                      </div>
                    </div>
                    
                    {/* Note */}
                    <p className="text-xs text-gray-500 mt-4">
                      Note: This is an automated summary.{" "}
                      <span className="text-blue-400 cursor-pointer hover:underline">View full content</span>.
                    </p>
                  </div>
                  
                  {/* Footer stats */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-green-500">
                        <span className="font-medium">5/50</span>
                        <span className="text-gray-500 ml-1">Used</span>
                      </div>
                      <div className="text-green-500">
                        <span className="font-medium">~8</span>
                        <span className="text-gray-500 ml-1">Mins saved</span>
                      </div>
                    </div>
                    {/* Settings gear icon */}
                    <svg className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4 text-gray-900 dark:text-white">How It Works</h2>
            <p className="text-lg font-light text-gray-600 dark:text-white/60">Three simple steps to never miss a hidden clause again</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl p-8 transition-all animate-on-scroll bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50">
              <div className="text-4xl mb-4">🖱️</div>
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">Hover</h3>
              <p className="font-light text-gray-600 dark:text-gray-400">Simply hover over any Terms, Privacy Policy, or legal link on any website.</p>
            </div>
            <div className="rounded-2xl p-8 transition-all animate-on-scroll delay-100 bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">AI Summarizes</h3>
              <p className="font-light text-gray-600 dark:text-gray-400">Our AI instantly reads and analyzes the full document, extracting key information.</p>
            </div>
            <div className="rounded-2xl p-8 transition-all animate-on-scroll delay-200 bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">Decide Informed</h3>
              <p className="font-light text-gray-600 dark:text-gray-400">See costs, cancellation terms, data usage, and red flags before you agree.</p>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 rounded-xl animate-on-scroll bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="font-medium mb-1 text-gray-900 dark:text-white">Instant Analysis</h3>
                <p className="text-sm font-light text-gray-600 dark:text-gray-400">Get summaries in seconds, not minutes. Our AI processes legal text blazingly fast.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-xl animate-on-scroll delay-100 bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="font-medium mb-1 text-gray-900 dark:text-white">Privacy First</h3>
                <p className="text-sm font-light text-gray-600 dark:text-gray-400">We never store the pages you visit. Your browsing stays completely private.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-xl animate-on-scroll delay-200 bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="font-medium mb-1 text-gray-900 dark:text-white">Smart Detection</h3>
                <p className="text-sm font-light text-gray-600 dark:text-gray-400">Automatically detects legal links — Terms, Privacy, EULA, Refund policies, and more.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-xl animate-on-scroll delay-300 bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-medium mb-1 text-gray-900 dark:text-white">Plain English</h3>
                <p className="text-sm font-light text-gray-600 dark:text-gray-400">No legal jargon. Every summary is written in clear, easy-to-understand language.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-50/50 dark:from-blue-900/10 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4 text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
            <p className="text-lg font-light text-gray-600 dark:text-white/60">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-2xl p-8 flex flex-col animate-on-scroll bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10">
              <div className="text-sm mb-2 text-gray-500 dark:text-gray-400">Free</div>
              <div className="text-4xl font-light mb-1 text-gray-900 dark:text-white">£0</div>
              <div className="text-sm mb-6 text-gray-500">Forever</div>
              
              <ul className="space-y-3 mb-8 text-sm flex-1 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>5 summaries per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>All document types</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Summary caching</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                  <span className="text-gray-400 dark:text-gray-600">✕</span>
                  <span>Unlimited with own API key</span>
                </li>
              </ul>

              <a 
                href="https://chrome.google.com/webstore/detail/termsdigest" 
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl border transition-colors font-medium mt-auto border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white"
              >
                Get Started Free
              </a>
            </div>

            {/* Pro Plan */}
            <div className="rounded-2xl p-8 relative flex flex-col animate-on-scroll delay-100 bg-white dark:glass-card shadow-xl dark:shadow-none border-2 border-blue-500 dark:border-blue-500/50">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-medium px-3 py-1 rounded-full text-white">
                  MOST POPULAR
                </span>
              </div>
              
              <div className="text-sm text-blue-500 mb-2">Pro</div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-light text-gray-900 dark:text-white">£4.99</span>
                <span className="line-through text-lg text-gray-400 dark:text-gray-500">£9.99</span>
              </div>
              <div className="text-sm mb-1 text-gray-500">per year</div>
              <div className="text-green-500 text-xs mb-6">50% OFF — Launch Special!</div>
              
              <ul className="space-y-3 mb-8 text-sm flex-1 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>50 summaries per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>All document types</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Summary caching</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Unlimited with own API key</span>
                </li>
              </ul>

              <a 
                href="https://chrome.google.com/webstore/detail/termsdigest" 
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-medium mt-auto text-white"
              >
                Upgrade to Pro
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl p-8 flex flex-col animate-on-scroll delay-200 bg-white dark:glass-card shadow-lg dark:shadow-none border border-gray-100 dark:border-white/10">
              <div className="text-sm mb-2 text-gray-500 dark:text-gray-400">Enterprise</div>
              <div className="text-4xl font-light mb-1 text-gray-900 dark:text-white">Custom</div>
              <div className="text-sm mb-6 text-gray-500">Contact us</div>
              
              <ul className="space-y-3 mb-8 text-sm flex-1 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>5,000+ summaries/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Team management</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>SSO integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Custom deployment</span>
                </li>
              </ul>

              <Link 
                href="/support"
                className="block w-full text-center py-3 rounded-xl border transition-colors font-medium mt-auto border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Globe */}
      <GlobeFeatureSection />

      {/* Footer with Flickering Grid */}
      <FlickeringFooter />
    </main>
  );
}

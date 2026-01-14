"use client";

import Link from "next/link";
import ScrollAnimations from "@/components/ScrollAnimations";

export default function Home() {
  return (
    <main className="min-h-screen">
      <ScrollAnimations />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span className="font-bold text-lg">T&C Summarizer</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link>
            <Link href="/support" className="text-gray-400 hover:text-white transition-colors text-sm">Support</Link>
            <a 
              href="https://chrome.google.com/webstore/detail/tc-summarizer" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Install Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Now with AI-powered summaries
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Stop Blindly Accepting{" "}
              <span className="gradient-text">Terms & Conditions</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              Hover over any legal link and get an instant summary. 
              Understand what you&apos;re agreeing to - costs, cancellation, data sharing, and hidden gotchas.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://chrome.google.com/webstore/detail/tc-summarizer" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-4 rounded-xl text-lg font-semibold transition-all glow hover:scale-105"
              >
                Add to Chrome - It&apos;s Free
              </a>
              <a 
                href="#demo"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-8 py-4 rounded-xl text-lg font-medium border border-gray-700 hover:border-gray-500 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>▶</span> See it in action
              </a>
            </div>
            
            <p className="text-gray-500 text-sm mt-4">5 free summaries/month • No credit card required</p>
          </div>

          {/* Demo Preview */}
          <div className="mt-16 relative animate-on-scroll" id="demo">
            <div className="glass-card rounded-2xl p-1 max-w-4xl mx-auto glow">
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-gray-400 text-sm">example.com/checkout</span>
                  </div>
                </div>
                <div className="p-8 relative min-h-[300px]">
                  <div className="text-gray-300 mb-4">
                    <p className="mb-2">Complete your purchase</p>
                    <p className="text-sm text-gray-500">By continuing, you agree to our{" "}
                      <span className="text-blue-400 underline cursor-pointer relative group">
                        Terms of Service
                        <span className="absolute -right-2 -top-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                      </span>
                    </p>
                  </div>
                  
                  {/* Simulated popover */}
                  <div className="absolute right-4 top-20 w-96 glass-card rounded-xl p-5 float">
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <span className="font-semibold text-sm">Example Terms Summary</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full border border-green-500/30 whitespace-nowrap">high</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
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
                        <span className="text-red-400">Arbitration clause - cannot sue in court</span>
                      </div>
                    </div>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Three simple steps to never miss a hidden clause again</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card rounded-2xl p-8 hover:border-blue-500/50 transition-colors animate-on-scroll">
              <div className="text-4xl mb-4">🖱️</div>
              <h3 className="text-xl font-semibold mb-2">Hover</h3>
              <p className="text-gray-400">Simply hover over any Terms, Privacy Policy, or legal link on any website.</p>
            </div>
            <div className="glass-card rounded-2xl p-8 hover:border-blue-500/50 transition-colors animate-on-scroll delay-100">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-semibold mb-2">AI Summarizes</h3>
              <p className="text-gray-400">Our AI instantly reads and analyzes the full document, extracting key information.</p>
            </div>
            <div className="glass-card rounded-2xl p-8 hover:border-blue-500/50 transition-colors animate-on-scroll delay-200">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2">Decide Informed</h3>
              <p className="text-gray-400">See costs, cancellation terms, data usage, and red flags before you agree.</p>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 glass-card rounded-xl animate-on-scroll">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="font-semibold mb-1">Instant Analysis</h3>
                <p className="text-gray-400 text-sm">Get summaries in seconds, not minutes. Our AI processes legal text blazingly fast.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 glass-card rounded-xl animate-on-scroll delay-100">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="font-semibold mb-1">Privacy First</h3>
                <p className="text-gray-400 text-sm">We never store the pages you visit. Your browsing stays completely private.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 glass-card rounded-xl animate-on-scroll delay-200">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="font-semibold mb-1">Smart Detection</h3>
                <p className="text-gray-400 text-sm">Automatically detects legal links — Terms, Privacy, EULA, Refund policies, and more.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 glass-card rounded-xl animate-on-scroll delay-300">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-semibold mb-1">Plain English</h3>
                <p className="text-gray-400 text-sm">No legal jargon. Every summary is written in clear, easy-to-understand language.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card rounded-2xl p-8 flex flex-col animate-on-scroll">
              <div className="text-sm text-gray-400 mb-2">Free</div>
              <div className="text-4xl font-bold mb-1">£0</div>
              <div className="text-gray-500 text-sm mb-6">Forever</div>
              
              <ul className="space-y-3 mb-8 text-sm flex-1">
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
                <li className="flex items-center gap-2 text-gray-500">
                  <span className="text-gray-600">✕</span>
                  <span>Unlimited with own API key</span>
                </li>
              </ul>

              <a 
                href="https://chrome.google.com/webstore/detail/tc-summarizer" 
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors font-medium mt-auto"
              >
                Get Started Free
              </a>
            </div>

            {/* Pro Plan */}
            <div className="glass-card rounded-2xl p-8 border-blue-500/50 relative flex flex-col animate-on-scroll delay-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-semibold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
              
              <div className="text-sm text-blue-400 mb-2">Pro</div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-bold">£4.99</span>
                <span className="text-gray-500 line-through text-lg">£9.99</span>
              </div>
              <div className="text-gray-500 text-sm mb-1">per year</div>
              <div className="text-green-400 text-xs mb-6">50% OFF — Launch Special!</div>
              
              <ul className="space-y-3 mb-8 text-sm flex-1">
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
                href="https://chrome.google.com/webstore/detail/tc-summarizer" 
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-semibold mt-auto"
              >
                Upgrade to Pro
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="glass-card rounded-2xl p-8 flex flex-col animate-on-scroll delay-200">
              <div className="text-sm text-gray-400 mb-2">Enterprise</div>
              <div className="text-4xl font-bold mb-1">Custom</div>
              <div className="text-gray-500 text-sm mb-6">Contact us</div>
              
              <ul className="space-y-3 mb-8 text-sm flex-1">
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
                className="block w-full text-center py-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors font-medium mt-auto"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 relative overflow-hidden animate-scale">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to understand what you&apos;re signing?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Join thousands of users who stopped blindly accepting legal terms.
            </p>
            <a 
              href="https://chrome.google.com/webstore/detail/tc-summarizer" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-4 rounded-xl text-lg font-semibold transition-all glow hover:scale-105"
            >
              Install T&C Summarizer — Free
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-semibold">T&C Summarizer</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            </div>
            
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} T&C Summarizer. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

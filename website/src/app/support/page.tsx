import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Support - TermsDigest",
  description: "Get help with TermsDigest. FAQs, troubleshooting, and contact information.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="TermsDigest" width={32} height={32} className="w-8 h-8" />
            <span className="font-bold text-lg">TermsDigest</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
            <p className="text-gray-400 text-lg">Find answers to common questions or get in touch with our team.</p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <a 
              href="mailto:support@termsdigest.com" 
              className="glass-card rounded-2xl p-6 text-center hover:border-blue-500/50 transition-colors group"
            >
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-semibold mb-2 group-hover:text-blue-400 transition-colors">Email Support</h3>
              <p className="text-gray-400 text-sm">support@termsdigest.com</p>
              <p className="text-gray-500 text-xs mt-2">Response within 24 hours</p>
            </a>

            <a 
              href="https://github.com/mik3ola/tc-summarizer/issues" 
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-6 text-center hover:border-blue-500/50 transition-colors group"
            >
              <div className="text-4xl mb-4">🐛</div>
              <h3 className="font-semibold mb-2 group-hover:text-blue-400 transition-colors">Report a Bug</h3>
              <p className="text-gray-400 text-sm">GitHub Issues</p>
              <p className="text-gray-500 text-xs mt-2">Open source feedback</p>
            </a>

            <a 
              href="mailto:enterprise@termsdigest.com" 
              className="glass-card rounded-2xl p-6 text-center hover:border-blue-500/50 transition-colors group"
            >
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="font-semibold mb-2 group-hover:text-blue-400 transition-colors">Enterprise</h3>
              <p className="text-gray-400 text-sm">enterprise@termsdigest.com</p>
              <p className="text-gray-500 text-xs mt-2">Custom plans & SSO</p>
            </a>
          </div>

          {/* FAQs */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              {[
                {
                  q: "How do I install TermsDigest?",
                  a: "Visit the Chrome Web Store and click \"Add to Chrome\". The extension will be installed automatically and is ready to use immediately."
                },
                {
                  q: "Why isn't the summary showing for a certain website?",
                  a: "Some websites block automated access or load content dynamically. If a summary doesn't appear, try clicking \"Open link directly\" to view the original page. For modal/popup terms, try clicking the link first to load the content."
                },
                {
                  q: "How accurate are the summaries?",
                  a: "Our AI provides helpful overviews, but summaries are NOT legal advice. We show a confidence level (high/medium/low) with each summary. Always read important documents carefully or consult a legal professional for critical decisions."
                },
                {
                  q: "What counts as a \"summary\" towards my quota?",
                  a: "Each unique page you summarize counts as one summary. Cached summaries (pages you've already summarized) don't count against your quota. Cache lasts 30 days."
                },
                {
                  q: "Can I use my own OpenAI API key?",
                  a: "Yes! In the extension settings, you can add your own OpenAI API key for unlimited summaries. You'll pay OpenAI directly."
                },
                {
                  q: "How do I upgrade to Pro?",
                  a: "Click \"Upgrade to Pro\" in the extension settings or on our pricing page. You'll be redirected to a secure Stripe checkout. After payment, refresh the extension to see your Pro status."
                },
                {
                  q: "How do I cancel my subscription?",
                  a: "You can cancel anytime from your Stripe customer portal. Access it via the extension settings or contact support. Your Pro benefits continue until the end of your billing period."
                },
                {
                  q: "Is my browsing data safe?",
                  a: "Yes. We don't store the pages you visit or the content you summarize. Only your account info and usage counts are stored. See our Privacy Policy for full details."
                },
                {
                  q: "Does the extension work on all websites?",
                  a: "The extension works on most websites but cannot access certain restricted pages like Chrome settings pages, the Chrome Web Store, or pages blocked by Content Security Policy."
                },
                {
                  q: "I got an \"Extension context invalidated\" error",
                  a: "This happens when the extension updates while you have a page open. Simply refresh the page (Ctrl+R or Cmd+R) and try again."
                },
              ].map((faq, i) => (
                <details key={i} className="glass-card rounded-xl group">
                  <summary className="cursor-pointer px-6 py-4 font-medium flex items-center justify-between list-none">
                    <span>{faq.q}</span>
                    <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-6 pb-4 text-gray-400">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Troubleshooting</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Extension not working at all?</h3>
                <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
                  <li>Make sure the extension is enabled in Chrome (chrome://extensions)</li>
                  <li>Try refreshing the page</li>
                  <li>Check if &quot;Auto-hover&quot; is enabled in settings</li>
                  <li>Try uninstalling and reinstalling the extension</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Summary not appearing on hover?</h3>
                <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
                  <li>Ensure the link text contains legal keywords (e.g., &quot;Terms&quot;, &quot;Privacy&quot;)</li>
                  <li>Try hovering for at least 1 second</li>
                  <li>Check the hover delay setting in options</li>
                  <li>Some dynamically-loaded content may need to be clicked first</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Authentication issues?</h3>
                <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
                  <li>Try logging out and back in</li>
                  <li>Clear extension data from Chrome settings</li>
                  <li>Check your email for verification if you just signed up</li>
                  <li>Ensure you&apos;re using the correct email/password</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Still need help */}
          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">Still need help?</p>
            <a 
              href="mailto:support@termsdigest.com"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-3 rounded-xl font-semibold transition-all"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="TermsDigest" width={24} height={24} className="w-6 h-6" />
              <span className="font-semibold">TermsDigest</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} TermsDigest. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

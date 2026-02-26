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
              href="https://wa.me/1234567890" 
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-6 text-center hover:border-green-500/50 transition-colors group"
            >
              <div className="mb-4 flex justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#25D366"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-2 group-hover:text-green-400 transition-colors">WhatsApp Support</h3>
              <p className="text-gray-400 text-sm">Chat with us</p>
              <p className="text-gray-500 text-xs mt-2">Quick response</p>
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
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-3 rounded font-semibold transition-all"
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
            <div className="flex items-center gap-6 text-sm text-gray-500">
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

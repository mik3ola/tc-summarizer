import Link from "next/link";

export const metadata = {
  title: "Terms of Service - TermsDigest",
  description: "Terms and conditions for using TermsDigest.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span className="font-bold text-lg">TermsDigest</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link>
            <Link href="/support" className="text-gray-400 hover:text-white transition-colors text-sm">Support</Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last updated: January 2026</p>

          <div className="prose prose-invert prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By installing or using TermsDigest (&quot;the Extension&quot;, &quot;the Service&quot;), you agree 
                to be bound by these Terms of Service. If you disagree with any part of these terms, 
                you may not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-gray-300 leading-relaxed">
                TermsDigest is a browser extension that provides AI-generated summaries of legal 
                documents such as Terms of Service, Privacy Policies, and similar legal text. The 
                summaries are for informational purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Disclaimer</h2>
              <div className="glass-card rounded-xl p-4 border-yellow-500/50">
                <p className="text-yellow-200 leading-relaxed">
                  <strong>⚠️ Important:</strong> TermsDigest provides AI-generated summaries for 
                  convenience only. These summaries are NOT legal advice and should NOT be relied 
                  upon as a substitute for reading the full legal document or consulting with a 
                  qualified legal professional. We do not guarantee completeness of any summary.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. User Accounts</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To access certain features, you may need to create an account. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorised access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Free and Paid Plans</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We offer both free and paid subscription plans:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>Free Plan:</strong> 5 summaries per month, limited features</li>
                <li><strong>Pro Plan:</strong> 50 summaries per month, all features, priority support</li>
                <li><strong>Enterprise:</strong> Custom plans for organisations</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Usage limits reset on the first of each calendar month (UTC).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Billing and Cancellation</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                For paid plans:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Subscriptions are billed annually</li>
                <li>You may cancel at any time from your account settings</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
                <li>No refunds for partial subscription periods</li>
                <li>We reserve the right to change prices with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Acceptable Use</h2>
              <p className="text-gray-300 leading-relaxed mb-4">You agree NOT to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to reverse engineer, decompile, or hack the Service</li>
                <li>Use automated systems to abuse the Service</li>
                <li>Share your account credentials with others</li>
                <li>Circumvent usage limits or rate limiting</li>
                <li>Redistribute or resell summaries commercially</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
              <p className="text-gray-300 leading-relaxed">
                The Service, including its original content, features, and functionality, is owned 
                by TermsDigest and is protected by international copyright, trademark, and other 
                intellectual property laws. Generated summaries are provided for your personal use 
                and may not be commercially redistributed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                To the maximum extent permitted by law, TermsDigest shall not be liable for any 
                indirect, incidental, special, consequential, or punitive damages, including loss 
                of profits, data, or other intangible losses, resulting from your use of or inability 
                to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Service Availability</h2>
              <p className="text-gray-300 leading-relaxed">
                We strive to provide reliable service but do not guarantee 100% uptime. We may 
                modify, suspend, or discontinue the Service at any time without notice. We are 
                not liable for any modification, suspension, or discontinuation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice or 
                liability, for any reason, including breach of these Terms. Upon termination, 
                your right to use the Service will cease immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
              <p className="text-gray-300 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of 
                England and Wales, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these terms at any time. We will provide notice of 
                significant changes via email or through the Service. Your continued use after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed">
                For questions about these Terms, contact us at:{" "}
                <a href="mailto:legal@termsdigest.com" className="text-blue-400 hover:underline">
                  legal@termsdigest.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
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

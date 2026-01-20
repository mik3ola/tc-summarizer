import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy - TermsDigest",
  description: "How TermsDigest handles your data and protects your privacy.",
};

export default function PrivacyPage() {
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
            <Link href="/support" className="text-gray-400 hover:text-white transition-colors text-sm">Support</Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: January 2026</p>

          <div className="prose prose-invert prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-gray-300 leading-relaxed">
                TermsDigest (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a Chrome extension that helps users understand 
                legal documents by providing AI-generated summaries. We are committed to protecting your 
                privacy and being transparent about our data practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">What We Collect</h2>
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-4">
                  <h3 className="font-semibold text-green-400 mb-2">✓ What we DO collect:</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-1">
                    <li>Your email address (for account creation and login)</li>
                    <li>Subscription status (free or paid)</li>
                    <li>Aggregated usage counts (number of summaries per month)</li>
                  </ul>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <h3 className="font-semibold text-red-400 mb-2">✕ What we do NOT collect:</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-1">
                    <li>Your browsing history</li>
                    <li>The content of pages you visit</li>
                    <li>Personal documents or files</li>
                    <li>Cookies from other sites</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How Summaries Work</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you hover over a legal link, the extension:
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-2">
                <li>Fetches the content of the linked page directly from your browser</li>
                <li>Extracts the text content</li>
                <li>Sends the text to our secure server for AI processing</li>
                <li>Returns the summary to display in the popup</li>
              </ol>
              <p className="text-gray-300 leading-relaxed mt-4">
                <strong>Important:</strong> The text is processed in real-time and is <strong>not stored</strong> 
                on our servers. We do not build profiles of your browsing activity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Storage</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use Supabase (hosted in the EU) to store:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>User accounts (email, hashed password)</li>
                <li>Subscription information (plan, status)</li>
                <li>Monthly usage counters (reset each month)</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Cached summaries are stored locally in your browser and never sent to our servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <p className="text-gray-300 leading-relaxed mb-4">We use the following third-party services:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>OpenAI:</strong> For AI text summarization. Text is processed according to OpenAI&apos;s API terms.</li>
                <li><strong>Supabase:</strong> For authentication and database (EU region).</li>
                <li><strong>Stripe:</strong> For payment processing. We do not store your card details.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-4">Under GDPR and UK GDPR, you have the right to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                To exercise these rights, contact us at{" "}
                <a href="mailto:privacy@termsdigest.com" className="text-blue-400 hover:underline">
                  privacy@termsdigest.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-gray-300 leading-relaxed">
                Account data is retained while your account is active. Usage counters are reset monthly 
                and previous months&apos; data is deleted. When you delete your account, all associated 
                data is permanently removed within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Security</h2>
              <p className="text-gray-300 leading-relaxed">
                We use industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mt-2">
                <li>HTTPS encryption for all data in transit</li>
                <li>Encrypted database storage</li>
                <li>JWT tokens for authentication</li>
                <li>Row-level security policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                TermsDigest is not intended for children under 13. We do not knowingly collect 
                personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this policy from time to time. We will notify you of significant changes 
                via email or through the extension. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-gray-300 leading-relaxed">
                For privacy-related questions or concerns, contact us at:{" "}
                <a href="mailto:privacy@termsdigest.com" className="text-blue-400 hover:underline">
                  privacy@termsdigest.com
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

import PageLayout from "@/components/PageLayout";
import ProseLayout from "@/components/ProseLayout";

export const metadata = {
  title: "Privacy Policy - TermsDigest",
  description: "How TermsDigest handles your data and protects your privacy.",
};

export default function PrivacyPage() {
  return (
    <PageLayout>
      <ProseLayout title="Privacy Policy" subtitle="Last updated: January 2026">

        <section>
          <h2>Overview</h2>
          <p>
            TermsDigest (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a Chrome extension that helps users understand
            legal documents by providing AI-generated summaries. We are committed to protecting your
            privacy and being transparent about our data practices.
          </p>
        </section>

        <section>
          <h2>What We Collect</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-5 bg-muted/10">
              <h3 className="text-sm font-semibold text-green-400 mb-3">What we DO collect</h3>
              <ul className="list-disc list-inside">
                <li>Your email address (for account creation and login)</li>
                <li>Subscription status (free or paid)</li>
                <li>Aggregated usage counts (number of summaries per month)</li>
              </ul>
            </div>
            <div className="rounded-xl border p-5 bg-muted/10">
              <h3 className="text-sm font-semibold text-red-400 mb-3">What we do NOT collect</h3>
              <ul className="list-disc list-inside">
                <li>Your browsing history</li>
                <li>The content of pages you visit</li>
                <li>Personal documents or files</li>
                <li>Cookies from other sites</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2>How Summaries Work</h2>
          <p>When you hover over a legal link, the extension:</p>
          <ol className="list-decimal list-inside">
            <li>Fetches the content of the linked page directly from your browser</li>
            <li>Extracts the text content</li>
            <li>Sends the text to our secure server for AI processing</li>
            <li>Returns the summary to display in the popup</li>
          </ol>
          <p>
            <strong>Important:</strong> The text is processed in real-time and is <strong>not stored</strong> on
            our servers. We do not build profiles of your browsing activity.
          </p>
        </section>

        <section>
          <h2>Data Storage</h2>
          <p>We use Supabase (hosted in the EU) to store:</p>
          <ul className="list-disc list-inside">
            <li>User accounts (email, hashed password)</li>
            <li>Subscription information (plan, status)</li>
            <li>Monthly usage counters (reset each billing period)</li>
          </ul>
          <p>Cached summaries are stored locally in your browser and never sent to our servers.</p>
        </section>

        <section>
          <h2>Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside">
            <li><strong>OpenAI:</strong> For AI text summarisation. Text is processed according to OpenAI&apos;s API terms.</li>
            <li><strong>Supabase:</strong> For authentication and database (EU region).</li>
            <li><strong>Stripe:</strong> For payment processing. We do not store your card details.</li>
          </ul>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>Under GDPR and UK GDPR, you have the right to:</p>
          <ul className="list-disc list-inside">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>
            To exercise these rights, contact us at{" "}
            <a href="mailto:support@termsdigest.com">support@termsdigest.com</a>.
          </p>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>
            Account data is retained while your account is active. Usage counters reset each billing
            period and previous period data is deleted. When you delete your account, all associated
            data is permanently removed within 30 days.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>We use industry-standard security measures including:</p>
          <ul className="list-disc list-inside">
            <li>HTTPS encryption for all data in transit</li>
            <li>Encrypted database storage</li>
            <li>JWT tokens for authentication</li>
            <li>Row-level security policies</li>
          </ul>
        </section>

        <section>
          <h2>Children&apos;s Privacy</h2>
          <p>
            TermsDigest is not intended for children under 13. We do not knowingly collect
            personal information from children.
          </p>
        </section>

        <section>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes
            via email or through the extension. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            For privacy-related questions or concerns, contact us at{" "}
            <a href="mailto:support@termsdigest.com">support@termsdigest.com</a>.
          </p>
        </section>

      </ProseLayout>
    </PageLayout>
  );
}

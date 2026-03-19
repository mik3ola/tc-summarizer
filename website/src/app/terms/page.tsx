import PageLayout from "@/components/PageLayout";
import ProseLayout from "@/components/ProseLayout";

export const metadata = {
  title: "Terms of Service - TermsDigest",
  description: "Terms and conditions for using TermsDigest.",
};

export default function TermsPage() {
  return (
    <PageLayout>
      <ProseLayout title="Terms of Service" subtitle="Last updated: January 2026">

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By installing or using TermsDigest (&quot;the Extension&quot;, &quot;the Service&quot;), you agree
            to be bound by these Terms of Service. If you disagree with any part of these terms,
            you may not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            TermsDigest is a browser extension that provides AI-generated summaries of legal
            documents such as Terms of Service, Privacy Policies, and similar legal text. The
            summaries are for informational purposes only.
          </p>
        </section>

        <section>
          <h2>3. Disclaimer</h2>
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
            <p className="text-sm text-yellow-200 leading-relaxed">
              <strong>⚠️ Important:</strong> TermsDigest provides AI-generated summaries for
              convenience only. These summaries are <strong>not legal advice</strong> and should not be
              relied upon as a substitute for reading the full legal document or consulting a qualified
              legal professional. We do not guarantee the completeness of any summary.
            </p>
          </div>
        </section>

        <section>
          <h2>4. User Accounts</h2>
          <p>To access certain features, you may need to create an account. You are responsible for:</p>
          <ul className="list-disc list-inside">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorised access</li>
          </ul>
        </section>

        <section>
          <h2>5. Free and Paid Plans</h2>
          <p>We offer both free and paid subscription plans:</p>
          <ul className="list-disc list-inside">
            <li><strong>Free Plan:</strong> 5 summaries per month</li>
            <li><strong>Pro Plan:</strong> 50 summaries per month, priority support, bring your own API key</li>
            <li><strong>Enterprise:</strong> Custom plans for organisations</li>
          </ul>
          <p>
            Usage limits reset at the start of each new 30-day billing period anchored to your
            account creation or upgrade date.
          </p>
        </section>

        <section>
          <h2>6. Billing and Cancellation</h2>
          <p>For paid plans:</p>
          <ul className="list-disc list-inside">
            <li>Subscriptions are billed annually</li>
            <li>You may cancel at any time from within the extension settings</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
            <li>No refunds for partial subscription periods</li>
            <li>We reserve the right to change prices with 30 days notice</li>
          </ul>
        </section>

        <section>
          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside">
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to reverse engineer, decompile, or hack the Service</li>
            <li>Use automated systems to abuse the Service</li>
            <li>Share your account credentials with others</li>
            <li>Circumvent usage limits or rate limiting</li>
            <li>Redistribute or resell summaries commercially</li>
          </ul>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>
            The Service, including its original content, features, and functionality, is owned
            by Screenx Ltd and is protected by international copyright, trademark, and other
            intellectual property laws. Generated summaries are provided for your personal use
            and may not be commercially redistributed.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Screenx Ltd shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss
            of profits, data, or other intangible losses, resulting from your use of or inability
            to use the Service.
          </p>
        </section>

        <section>
          <h2>10. Service Availability</h2>
          <p>
            We strive to provide reliable service but do not guarantee 100% uptime. We may
            modify, suspend, or discontinue the Service at any time without notice. We are
            not liable for any modification, suspension, or discontinuation.
          </p>
        </section>

        <section>
          <h2>11. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or
            liability, for any reason, including breach of these Terms. Upon termination,
            your right to use the Service will cease immediately.
          </p>
        </section>

        <section>
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of
            England and Wales, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>13. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will provide notice of
            significant changes via email or through the Service. Your continued use after
            changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2>14. Contact Us</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:support@termsdigest.com">support@termsdigest.com</a>.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            TermsDigest is a product of Screenx Ltd — Registered in England &amp; Wales, Company No. 13283827.
          </p>
        </section>

      </ProseLayout>
    </PageLayout>
  );
}

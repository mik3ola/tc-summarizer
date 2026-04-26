import Link from "next/link";
import PageLayout from "@/components/PageLayout";

export const metadata = {
  title: "Support - TermsDigest",
  description: "Get help with TermsDigest. FAQs, troubleshooting, and contact information.",
};

const faqs = [
  {
    q: "How do I install TermsDigest?",
    a: 'Visit the Chrome Web Store and click "Add to Chrome". The extension will be installed automatically and is ready to use immediately.',
  },
  {
    q: "Why isn't the summary showing for a certain website?",
    a: 'Some websites block automated access or load content dynamically. If a summary doesn\'t appear, try clicking "Open link directly" to view the original page. For modal/popup terms, try clicking the link first to load the content.',
  },
  {
    q: "How accurate are the summaries?",
    a: "Our AI provides helpful overviews, but summaries are NOT legal advice. We show a confidence level (high/medium/low) with each summary. Always read important documents carefully or consult a legal professional for critical decisions.",
  },
  {
    q: 'What counts as a "summary" towards my quota?',
    a: "Each unique page you summarize counts as one summary. Cached summaries (pages you've already summarized) don't count against your quota. Cache lasts 30 days.",
  },
  {
    q: "Can I use my own OpenAI API key?",
    a: "Yes! In the extension settings, you can add your own OpenAI API key for unlimited summaries. You'll pay OpenAI directly at cost price.",
  },
  {
    q: "How do I upgrade to Pro?",
    a: 'Click "Upgrade to Pro" in the extension settings or on our pricing page. You\'ll be redirected to a secure Stripe checkout. After payment, refresh the extension to see your Pro status.',
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime from within the extension. Open the extension, go to the Account section in Options, and click 'Cancel subscription'. Your Pro benefits continue until the end of your current billing period, after which you'll automatically move to the free plan.",
  },
  {
    q: "Is my browsing data safe?",
    a: "Yes. We don't store the pages you visit or the content you summarize. Only your account info and usage counts are stored. See our Privacy Policy for full details.",
  },
  {
    q: "Does the extension work on all websites?",
    a: "The extension works on most websites but cannot access certain restricted pages like Chrome settings pages, the Chrome Web Store, or pages blocked by Content Security Policy.",
  },
  {
    q: 'I got an "Extension context invalidated" error',
    a: "This happens when the extension updates while you have a page open. Simply refresh the page (Ctrl+R or Cmd+R) and try again.",
  },
];

const troubleshooting = [
  {
    title: "Extension not working at all?",
    steps: [
      "Make sure the extension is enabled in Chrome (chrome://extensions)",
      "Try refreshing the page",
      'Check if "Auto-hover" is enabled in settings',
      "Try uninstalling and reinstalling the extension",
    ],
  },
  {
    title: "Summary not appearing on hover?",
    steps: [
      'Ensure the link text contains legal keywords (e.g., "Terms", "Privacy")',
      "Try hovering for at least 1 second",
      "Check the hover delay setting in options",
      "Some dynamically-loaded content may need to be clicked first",
    ],
  },
  {
    title: "Authentication issues?",
    steps: [
      "Try logging out and back in",
      "Clear extension data from Chrome settings",
      "Check your email for verification if you just signed up",
      "Ensure you're using the correct email and password",
    ],
  },
];

export default function SupportPage() {
  return (
    <PageLayout>
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-16 animate-on-scroll">
            <p className="text-sm font-medium uppercase tracking-widest mb-3 text-blue-400">Support</p>
            <h1 className="font-display text-3xl md:text-4xl font-light tracking-tight mb-4">
              How can we help?
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Find answers to common questions or get in touch with our team.
            </p>
          </div>

          {/* Contact cards */}
          <div className="grid sm:grid-cols-3 gap-5 mb-16 animate-on-scroll">
            <a
              href="mailto:support@termsdigest.com"
              className="flex flex-col items-center text-center rounded-2xl border p-6 bg-muted/10 hover:border-blue-500/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-blue-400 transition-colors">Email Support</h3>
              <p className="text-muted-foreground text-xs">support@termsdigest.com</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Response within 24 hours</p>
            </a>

            <div
              className="flex flex-col items-center text-center rounded-2xl border p-6 bg-muted/5 border-dashed border-muted-foreground/25 opacity-80 cursor-not-allowed select-none"
              aria-disabled="true"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400/50 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm mb-1 text-muted-foreground">WhatsApp</h3>
              <p className="text-muted-foreground/70 text-xs">Coming soon</p>
              <p className="text-muted-foreground/50 text-xs mt-1">Use email for now</p>
            </div>

            <a
              href="mailto:enterprise@termsdigest.com"
              className="flex flex-col items-center text-center rounded-2xl border p-6 bg-muted/10 hover:border-purple-500/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-purple-400 transition-colors">Enterprise</h3>
              <p className="text-muted-foreground text-xs">enterprise@termsdigest.com</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Custom plans & SSO</p>
            </a>
          </div>

          {/* FAQs */}
          <div className="mb-16 animate-on-scroll">
            <h2 className="font-display text-2xl font-light tracking-tight mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details key={i} className="group rounded-xl border bg-muted/10 hover:border-muted-foreground/30 transition-colors">
                  <summary className="cursor-pointer px-5 py-4 text-sm font-medium flex items-center justify-between list-none gap-4">
                    <span>{faq.q}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="mb-16 animate-on-scroll">
            <h2 className="font-display text-2xl font-light tracking-tight mb-8 text-center">
              Troubleshooting
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {troubleshooting.map(({ title, steps }) => (
                <div key={title} className="rounded-xl border p-5 bg-muted/10">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">{title}</h3>
                  <ol className="space-y-2">
                    {steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center animate-on-scroll">
            <p className="text-sm text-muted-foreground mb-5">Still need help?</p>
            <a
              href="mailto:support@termsdigest.com"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-3 rounded text-sm font-semibold transition-all text-white"
            >
              Contact Support
            </a>
            <p className="text-xs text-muted-foreground/60 mt-4">
              Or visit our{" "}
              <Link href="/#pricing" className="text-blue-400 hover:underline">pricing page</Link>
              {" "}to compare plans.
            </p>
          </div>
        </div>
    </PageLayout>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Welcome to Pro! - T&C Summarizer",
  description: "Your upgrade to T&C Summarizer Pro was successful.",
};

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        {/* Success animation */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center pulse-glow">
            <span className="text-5xl">✓</span>
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-green-500/20 rounded-full animate-ping"></div>
        </div>

        <h1 className="text-4xl font-bold mb-4">
          Welcome to <span className="gradient-text">Pro</span>!
        </h1>
        
        <p className="text-gray-400 text-lg mb-8">
          Your payment was successful. You now have access to 50 summaries per month 
          and all Pro features.
        </p>

        <div className="glass-card rounded-2xl p-6 mb-8 text-left">
          <h2 className="font-semibold mb-4 text-center">What&apos;s included:</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">50 summaries per month</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">All document types supported</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">Intelligent caching</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">Priority support</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-gray-300">Use your own API key for unlimited</span>
            </li>
          </ul>
        </div>

        <div className="glass-card rounded-xl p-4 mb-8 bg-blue-500/10 border-blue-500/30">
          <p className="text-blue-300 text-sm">
            <strong>Next step:</strong> Go back to the extension and click &quot;Refresh status&quot; 
            to activate your Pro subscription.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors font-medium"
          >
            Back to Home
          </Link>
          <Link 
            href="/support"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-semibold"
          >
            Get Help
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          A receipt has been sent to your email address.
        </p>
      </div>
    </main>
  );
}

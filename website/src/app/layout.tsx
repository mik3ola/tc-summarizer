import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "TermsDigest - Understand Legal Pages in Seconds",
  description: "AI-powered Chrome extension that summarizes Terms & Conditions, Privacy Policies, and other legal pages. Stop blindly accepting terms you don't understand.",
  keywords: ["terms and conditions", "privacy policy", "legal summarizer", "AI", "Chrome extension", "TLDR"],
  authors: [{ name: "TermsDigest" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "TermsDigest - Understand Legal Pages in Seconds",
    description: "AI-powered Chrome extension that summarizes Terms & Conditions, Privacy Policies, and other legal pages.",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "TermsDigest",
    description: "AI-powered Chrome extension that summarizes Terms & Conditions and Privacy Policies.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

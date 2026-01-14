import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T&C Summarizer - Understand Legal Pages in Seconds",
  description: "AI-powered Chrome extension that summarizes Terms & Conditions, Privacy Policies, and other legal pages. Stop blindly accepting terms you don't understand.",
  keywords: ["terms and conditions", "privacy policy", "legal summarizer", "AI", "Chrome extension", "TLDR"],
  authors: [{ name: "T&C Summarizer" }],
  openGraph: {
    title: "T&C Summarizer - Understand Legal Pages in Seconds",
    description: "AI-powered Chrome extension that summarizes Terms & Conditions, Privacy Policies, and other legal pages.",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "T&C Summarizer",
    description: "AI-powered Chrome extension that summarizes Terms & Conditions and Privacy Policies.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

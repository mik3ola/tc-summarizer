import Navbar from "@/components/Navbar";
import FlickeringFooter from "@/components/ui/flickering-footer";
import ScrollAnimations from "@/components/ScrollAnimations";

interface PageLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared layout for all content pages (Privacy, Terms, Support, etc.)
 * Provides: floating Navbar, consistent top padding, FlickeringFooter.
 */
export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <main className="min-h-screen">
      <ScrollAnimations />
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        {children}
      </div>
      <FlickeringFooter />
    </main>
  );
}

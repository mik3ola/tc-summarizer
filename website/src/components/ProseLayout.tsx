interface ProseLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Consistent wrapper for long-form content pages (Privacy, Terms, etc.)
 * Enforces heading hierarchy, body font sizes, spacing and colour tokens
 * that match the home and support pages.
 */
export default function ProseLayout({ title, subtitle, children }: ProseLayoutProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Page hero */}
      <div className="mb-12 animate-on-scroll">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-3">
          TermsDigest
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-light tracking-tight mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Prose content — all children receive these inherited styles */}
      <div className="space-y-10 animate-on-scroll [&_section]:space-y-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:pt-2 [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ul]:space-y-1.5 [&_ol]:text-sm [&_ol]:text-muted-foreground [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_a]:text-blue-400 [&_a]:hover:underline [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}

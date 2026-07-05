
import Link from 'next/link';
import { Brain } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      {/* Mobile logo */}
      <Link href="/dashboard" className="md:hidden flex items-center gap-2">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-primary flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-primary-foreground" aria-hidden="true" />
        </div>
        <span className="text-base font-semibold text-foreground">
          Neural<span className="text-primary">JEE</span>
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User actions */}
      <div className="flex items-center gap-4">
        <Link
          href="/review"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          id="header-review-link"
        >
          Review Queue
        </Link>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
          TU
        </div>
      </div>
    </header>
  );
}

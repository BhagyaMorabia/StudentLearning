import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="h-14 border-b bg-card/50 flex items-center justify-between px-6 shrink-0">
      {/* Mobile logo */}
      <Link href="/dashboard" className="md:hidden font-black text-lg">
        Neural<span className="text-primary">JEE</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/review"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          id="header-review-link"
        >
          Review Queue
        </Link>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </header>
  );
}

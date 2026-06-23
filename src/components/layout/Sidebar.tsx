'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/learn', label: 'Learn', icon: '📚' },
  { href: '/review', label: 'Review', icon: '🔁' },
  { href: '/doubt', label: 'Doubt Solver', icon: '💬' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-card/50 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b">
        <span className="font-black text-xl tracking-tight">
          Neural<span className="text-primary">JEE</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        JEE {new Date().getFullYear()}
      </div>
    </aside>
  );
}

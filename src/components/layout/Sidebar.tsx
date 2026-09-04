'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/learn', label: 'Learn', icon: 'school' },
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/review', label: 'Review', icon: 'history_edu' },
  { href: '/doubt', label: 'Doubt Solver', icon: 'psychology_alt' },
];

const footerNav = [
  { href: '#', label: 'Settings', icon: 'settings' },
  { href: '#', label: 'Support', icon: 'help_center' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const baseRoute = '/' + (pathname.split('/').filter(Boolean)[0] ?? '');
  const widthClass =
    baseRoute === '/dashboard'
      ? 'sidebar-w-dashboard'
      : baseRoute === '/learn'
        ? 'sidebar-w-curriculum'
        : '';

  return (
    <>
      <nav
        className={cn(
          'h-screen fixed left-0 top-0 hidden md:flex flex-col border-r border-surface-stroke bg-surface-base z-50',
          'w-60',
          widthClass
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="px-5 py-6">
            <Link href="/learn" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                <span className="material-symbols-outlined text-white text-[18px] filled">
                  neurology
                </span>
              </div>
              <div>
                <h1 className="font-[Geist] text-[17px] font-bold text-text-primary leading-tight tracking-[-0.015em]">
                  NeuralJEE
                </h1>
                <p className="font-[JetBrains_Mono] text-[10px] text-text-secondary leading-tight mt-0.5 tracking-[0.18em] uppercase">
                  Elite Rank Track
                </p>
              </div>
            </Link>
          </div>

          <div className="px-5 pb-3 pt-2">
            <div className="flex items-center gap-1.5 px-3">
              <span className="w-1 h-1 rounded-full bg-primary/70" />
              <h2 className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.18em] uppercase text-text-secondary">
                Table of Contents
              </h2>
            </div>
          </div>

          <ul className="flex-1 space-y-0.5 px-3 pb-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href} className="relative">
                  {isActive && (
                    <span
                      className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-sm bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      aria-hidden="true"
                    />
                  )}
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                      isActive
                        ? 'bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-container-lowest'
                    )}
                  >
                    <span
                      className={cn(
                        'material-symbols-outlined text-[20px] shrink-0',
                        isActive ? 'filled' : ''
                      )}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={cn(
                        'text-[14px]',
                        isActive ? 'font-semibold tracking-[-0.005em]' : 'font-medium'
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="px-3 py-3 mt-auto">
            <ul className="space-y-0.5 mb-3">
              {footerNav.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-container-lowest transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.icon}
                    </span>
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="pt-2 border-t border-surface-stroke/70 mx-2" />

            <div className="pt-3 px-2">
              <Link
                href="/review"
                className="group flex items-center justify-center w-full bg-primary hover:bg-[#2563EB] text-primary-foreground text-[13px] font-semibold py-2.5 px-4 rounded-md tracking-[-0.005em] shadow-[0_0_15px_rgba(59,130,246,0.18)] hover:shadow-[0_0_22px_rgba(59,130,246,0.28)] transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[18px] filled mr-2 group-hover:translate-x-[-1px] transition-transform">
                  auto_awesome
                </span>
                Start Review Queue
              </Link>

              <p className="text-[10px] text-text-secondary/60 font-[JetBrains_Mono] text-center mt-3 tracking-wide">
                v2.0 · Spaced Repetition
              </p>
            </div>
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 w-full z-50 md:hidden border-t border-surface-stroke bg-surface-base/95 backdrop-blur-[20px] flex justify-around items-center h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center w-16 h-14 rounded-md transition-all duration-200',
                isActive ? 'text-primary' : 'text-text-secondary active:bg-surface-container-high'
              )}
            >
              {isActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-primary pulse-dot" />
              )}
              <span className={cn('material-symbols-outlined text-[22px] mb-0.5', isActive ? 'filled' : '')}>
                {item.icon}
              </span>
              <span className={cn('font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.15em]', isActive ? 'font-bold' : '')}>
                {item.label === 'Doubt Solver' ? 'Solver' : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

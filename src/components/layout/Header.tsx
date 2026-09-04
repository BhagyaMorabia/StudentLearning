'use client';

import { usePathname } from 'next/navigation';
import { Kbd } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  '/learn': 'Curriculum',
  '/dashboard': 'Dashboard',
  '/review': 'Review Queue',
  '/doubt': 'Doubt Solver',
};

const CONTEXT_HINTS: Record<string, { title: string; sub?: string }> = {
  '/learn': { title: 'Physics', sub: 'JEE Main + Advanced Syllabus' },
  '/dashboard': { title: 'Neural Core', sub: 'Mastery Topography Live' },
  '/review': { title: 'FSRS Engine', sub: 'Due Review Queue' },
  '/doubt': { title: 'Neural Solver', sub: 'Socratic · Stepwise · LaTeX' },
};

export default function Header() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const baseRoute = '/' + (segments[0] ?? '');
  const baseLabel = ROUTE_LABELS[baseRoute] ?? '';
  const context = CONTEXT_HINTS[baseRoute];

  return (
    <header
      className={cn(
        'sticky top-0 w-full z-40 h-14 border-b border-surface-stroke',
        'bg-surface-base/80 backdrop-blur-[20px] backdrop-saturate-150'
      )}
    >
      <div className="flex items-center h-full px-5 md:px-7 gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <h2 className="font-[Geist] text-[16px] font-bold text-primary md:hidden">
            NeuralJEE
          </h2>

          <nav className="hidden md:flex items-center gap-2 min-w-0">
            {baseLabel && (
              <>
                <span className="font-[JetBrains_Mono] text-[11px] font-bold tracking-[0.18em] uppercase text-text-secondary">
                  {baseLabel}
                </span>
                {context && (
                  <>
                    <span className="material-symbols-outlined text-[14px] text-text-secondary/70 shrink-0">
                      chevron_right
                    </span>
                    <span className="font-[Geist] text-[13px] font-semibold text-text-primary truncate tracking-[-0.005em]">
                      {context.title}
                    </span>
                    {context.sub && (
                      <>
                        <span className="material-symbols-outlined text-[14px] text-text-secondary/70 shrink-0">
                          chevron_right
                        </span>
                        <span className="text-[12px] text-text-secondary truncate">
                          {context.sub}
                        </span>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2 h-9 px-3 w-72 lg:w-80 rounded-md bg-surface-elevated border border-surface-stroke hover:border-outline-variant/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200 group cursor-text">
            <span className="material-symbols-outlined text-[18px] text-text-secondary group-hover:text-on-surface transition-colors">
              search
            </span>
            <span className="text-[12px] text-text-secondary/70 font-medium flex-1 select-none">
              Search syllabus, formulas, PYQs…
            </span>
            <div className="flex items-center gap-1 opacity-70">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </div>
          </div>

          <button
            type="button"
            aria-label="Search"
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="relative h-9 w-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-all duration-200 group"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-surface-base pulse-dot" />
          </button>

          <button
            type="button"
            aria-label="Account"
            className="relative h-9 w-9 rounded-full bg-surface-container border border-surface-stroke flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all duration-200 overflow-hidden shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}

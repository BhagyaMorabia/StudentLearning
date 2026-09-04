'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActiveQuizOnly = /^\/learn\/[^/]+\/quiz(?!\/?results).*$/.test(pathname);
  const isQuizResults = /^\/learn\/[^/]+\/quiz\/results/.test(pathname);
  const isStudyRoute = /^\/learn\/[^/]+$/.test(pathname);
  const baseRoute = '/' + (pathname.split('/').filter(Boolean)[0] ?? '');

  const layoutWidthClass =
    baseRoute === '/dashboard'
      ? 'layout-w-dashboard'
      : baseRoute === '/learn' && !isActiveQuizOnly
        ? 'layout-w-curriculum'
        : '';

  if (isActiveQuizOnly && !isQuizResults) {
    return (
      <div className="bg-surface-base text-text-primary antialiased min-h-screen flex flex-col items-center">
        <main
          id="main-content"
          className="w-full flex-1 flex flex-col min-w-0"
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-surface-base text-text-primary antialiased min-h-screen flex">
      <Sidebar />
      <main
        id="main-content"
        className={cn(
          'desktop-main-layout pb-20 md:pb-0 min-h-screen flex flex-col min-w-0',
          layoutWidthClass
        )}
      >
        {!isStudyRoute && !isQuizResults && <Header />}
        {isQuizResults && <Header />}
        <div className="flex-1 w-full flex flex-col min-h-0">{children}</div>
      </main>
    </div>
  );
}

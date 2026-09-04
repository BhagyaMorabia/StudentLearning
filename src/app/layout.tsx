import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'NeuralJEE — AI-Powered JEE Preparation',
    template: '%s | NeuralJEE',
  },
  description:
    'Master JEE Mains & Advanced with AI-powered adaptive learning. Verified content, spaced repetition, and intelligent doubt solving.',
  keywords: [
    'JEE preparation',
    'JEE Mains',
    'JEE Advanced',
    'adaptive learning',
    'IIT',
    'Physics Chemistry Mathematics',
    'spaced repetition',
  ],
  authors: [{ name: 'NeuralJEE' }],
  openGraph: {
    type: 'website',
    siteName: 'NeuralJEE',
    title: 'NeuralJEE — AI-Powered JEE Preparation',
    description: 'Master JEE with verified AI content, adaptive quizzes, and smart spaced repetition.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout global stylesheet is correct in App Router; next/font cannot handle Material Symbols variable icon font axes (FILL/wght) from CDN */}
          <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;900&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font -- Material Symbols requires CDN for variable FILL/wght axes; next/font lacks icon-font axis support */}
          <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        </head>
        <body className="antialiased bg-surface-base text-text-primary min-h-screen" suppressHydrationWarning>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {children}
        </body>
    </html>
  );
}

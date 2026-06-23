import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dGVzdC1jbGVyay1rZXktOTk5LmNsZXJrLmFjY291bnRzLmRldiQ'}>
      <html lang="en" className={`${inter.variable} dark`}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        </head>
        <body className="antialiased font-sans">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
            Skip to main content
          </a>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

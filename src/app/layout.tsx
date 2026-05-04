import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MasteryAI — Adaptive Learning Platform",
  description: "Master any subject with AI-powered adaptive learning. Diagrams, quizzes, and smart remediation that focuses on your weak areas until you achieve full mastery.",
  keywords: ["JEE preparation", "adaptive learning", "mastery", "heights and distances", "trigonometry"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}

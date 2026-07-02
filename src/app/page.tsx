"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  Target,
  ArrowRight,
  Zap,
  BarChart3,
  Shield,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background" id="main-content">
      {/* ===== NAV ===== */}
      <nav className="sticky top-0 left-0 right-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md" role="navigation" aria-label="Main navigation">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-7xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                Neural<span className="text-primary">JEE</span>
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link href="/sign-up">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="w-full pt-32 pb-24 flex justify-center">
        <div className="w-full max-w-4xl px-6 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-tight">
              Master Every Concept
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI identifies your weak spots and drills them until you hit 85%+ mastery.
              Diagrams, formulas, and JEE-level quizzes — all adaptive.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/sign-up">
              <Button variant="primary" size="lg" className="w-full sm:w-auto text-base h-14 px-8">
                Start Learning Now
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base h-14 px-8">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 w-full flex justify-center bg-muted/30">
        <div className="w-full max-w-7xl px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Four steps to mastery
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              How the adaptive engine ensures you actually understand the concepts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              {
                icon: BookOpen,
                title: "Learn",
                desc: "Study each subtopic with rich explanations, interactive diagrams, and LaTeX formulas.",
              },
              {
                icon: Zap,
                title: "Quiz",
                desc: "Take adaptive quizzes with JEE-style MCQs, numerical types, and negative marking.",
              },
              {
                icon: BarChart3,
                title: "Analyze",
                desc: "AI breaks down your performance per subtopic — see exactly where you're strong and weak.",
              },
              {
                icon: Target,
                title: "Master",
                desc: "Re-learn only weak topics, re-test until every subtopic hits 85%+ accuracy.",
              },
            ].map((step, i) => (
              <Card key={step.title} className="flex flex-col p-8 space-y-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <span className="text-4xl font-black text-muted/30 select-none block">0{i + 1}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-24 w-full flex justify-center">
        <div className="w-full max-w-7xl px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Built for real results
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Everything you need to conquer the JEE.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Brain, title: "Adaptive AI", desc: "Difficulty adjusts based on your streak — 3 correct in a row and it gets harder." },
              { icon: Target, title: "Negative Marking", desc: "JEE-style +4/-1 scoring so you learn to handle exam pressure." },
              { icon: BarChart3, title: "Mastery Heatmap", desc: "Visual breakdown of every subtopic — green, yellow, or red at a glance." },
              { icon: Clock, title: "Timed Questions", desc: "Per-question timer tracks how long you take — flags potential guessing." },
              { icon: Shield, title: "Wrong Answer Book", desc: "Every mistake is saved. Re-drill your weak questions until resolved." },
              { icon: CheckCircle2, title: "Mastery Loop", desc: "85% threshold per subtopic. Below that? Re-learn and re-test automatically." },
            ].map((feat) => (
              <Card key={feat.title} className="flex flex-col p-8 space-y-4 hover:border-primary/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                  <feat.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 w-full flex justify-center border-t border-border/50 bg-muted/20">
        <div className="w-full max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">NeuralJEE</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NeuralJEE · Built for mastery-based learning
          </p>
        </div>
      </footer>
    </div>
  );
}

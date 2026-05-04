"use client";

import React from "react";
import Link from "next/link";
import { subjects, chapters, questions, subtopics } from "@/lib/data";
import {
  BookOpen,
  Brain,
  Target,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Zap,
  BarChart3,
  Shield,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const primarySubjectId = subjects.find((subject) => subject.id === "physics-11")?.id ?? subjects[0]?.id ?? "math-11";

  return (
    <div className="min-h-screen noise" id="main-content">
      {/* ===== NAV ===== */}
      <nav className="glass sticky top-0 left-0 right-0 z-50 w-full" role="navigation" aria-label="Main navigation">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-7xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Brain className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Mastery<span className="text-indigo-400">AI</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Dashboard
              </Link>
              <Link
                href={`/learn/${primarySubjectId}`}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative w-full pt-40 pb-28 overflow-hidden grid-pattern">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="relative z-10 w-full flex justify-center">
          <div className="w-full max-w-5xl px-6 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-[var(--text-secondary)] mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
            <span>Adaptive AI Learning Engine</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          {/* Headline */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-tight mb-8">
            <span className="gradient-text">Master</span>
            <br />
            <span className="text-white">Every Concept</span>
          </h1>

          {/* Subhead */}
          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            AI identifies your <span className="text-white font-medium">weak spots</span> and
            drills them until you hit{" "}
            <span className="text-emerald-400 font-semibold">85%+ mastery</span>.
            Diagrams, formulas, and JEE-level quizzes — all adaptive.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href={`/learn/${primarySubjectId}`}
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-2xl transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
            >
              Start Learning Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-[var(--text-secondary)] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl transition-all"
            >
              View Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 text-center">
            {[
              { value: String(subtopics.length), label: "Subtopics", icon: BookOpen },
              { value: String(questions.length), label: "JEE Questions", icon: Target },
              { value: "85%", label: "Mastery Target", icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <stat.icon className="w-4 h-4 text-indigo-400 mb-1" />
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--surface-0)] to-transparent" />
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative py-28 overflow-hidden w-full flex justify-center">
        <div className="w-full max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Four steps to <span className="gradient-text">mastery</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              {
                icon: BookOpen,
                title: "Learn",
                desc: "Study each subtopic with rich explanations, interactive diagrams, and LaTeX formulas",
                color: "from-blue-500/20 to-blue-600/5",
                iconColor: "text-blue-400",
                borderColor: "hover:border-blue-500/30",
              },
              {
                icon: Zap,
                title: "Quiz",
                desc: "Take adaptive quizzes with JEE-style MCQs, numerical types, and negative marking",
                color: "from-amber-500/20 to-amber-600/5",
                iconColor: "text-amber-400",
                borderColor: "hover:border-amber-500/30",
              },
              {
                icon: BarChart3,
                title: "Analyze",
                desc: "AI breaks down your performance per subtopic — see exactly where you're strong and weak",
                color: "from-purple-500/20 to-purple-600/5",
                iconColor: "text-purple-400",
                borderColor: "hover:border-purple-500/30",
              },
              {
                icon: Target,
                title: "Master",
                desc: "Re-learn only weak topics, re-test until every subtopic hits 85%+ accuracy",
                color: "from-emerald-500/20 to-emerald-600/5",
                iconColor: "text-emerald-400",
                borderColor: "hover:border-emerald-500/30",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className={`card card-interactive ${step.borderColor} group`}
              >
                <div className="shimmer-line" />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-[var(--text-tertiary)]">0{i + 1}</span>
                    <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative py-28 w-full flex justify-center">
        <div className="w-full max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-3">Why MasteryAI</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Built for <span className="gradient-text-warm">real results</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Adaptive AI", desc: "Difficulty adjusts based on your streak — 3 correct in a row and it gets harder", color: "text-indigo-400" },
              { icon: Target, title: "Negative Marking", desc: "JEE-style +4/-1 scoring so you learn to handle exam pressure", color: "text-red-400" },
              { icon: BarChart3, title: "Mastery Heatmap", desc: "Visual breakdown of every subtopic — green, yellow, or red at a glance", color: "text-emerald-400" },
              { icon: Clock, title: "Timed Questions", desc: "Per-question timer tracks how long you take — flags potential guessing", color: "text-amber-400" },
              { icon: Shield, title: "Wrong Answer Book", desc: "Every mistake is saved. Re-drill your weak questions until resolved", color: "text-purple-400" },
              { icon: CheckCircle2, title: "Mastery Loop", desc: "85% threshold per subtopic. Below that? Re-learn and re-test automatically", color: "text-blue-400" },
            ].map((feat) => (
              <div key={feat.title} className="card group hover:border-white/10">
                <div className="relative z-10">
                  <feat.icon className={`w-7 h-7 ${feat.color} mb-4`} />
                  <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SUBJECT CARD ===== */}
      <section className="relative py-28 w-full flex justify-center">
        <div className="w-full max-w-3xl px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">Ready?</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Start learning now
            </h2>
            <p className="text-[var(--text-secondary)]">Select a subject to begin your mastery journey</p>
          </div>

          {subjects.map((subject) => {
            const subjectChapters = chapters.filter((c) => c.subjectId === subject.id);
            return (
              <Link key={subject.id} href={`/learn/${subject.id}`}>
                <div className="card card-interactive group p-8 max-w-lg mx-auto">
                  <div className="shimmer-line" />
                  <div className="relative z-10 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{subject.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Class {subject.grade}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        {subjectChapters.length} chapter{subjectChapters.length !== 1 ? "s" : ""} · {subjectChapters.map((chapter) => chapter.name).join(", ")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.04] py-10 w-full flex justify-center">
        <div className="w-full max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/60">MasteryAI</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            © 2026 MasteryAI · Built for mastery-based learning
          </p>
        </div>
      </footer>
    </div>
  );
}

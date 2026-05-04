"use client";

import React from "react";
import Link from "next/link";
import { Button, Card, Badge, Progress } from "@/components/ui";
import { MasteryHeatmap } from "@/components/dashboard/MasteryHeatmap";
import { useAppStore } from "@/lib/store";
import { subjects, chapters, getSubtopicsByChapter, questions } from "@/lib/data";
import { getChapterMasteryPercentage } from "@/lib/mastery";

export default function DashboardPage() {
  const masteryScores = useAppStore((s) => s.masteryScores);
  const wrongAnswers = useAppStore((s) => s.wrongAnswers);
  const learningPaths = useAppStore((s) => s.learningPaths);
  const resetChapterMastery = useAppStore((s) => s.resetChapterMastery);

  const allScores = Object.values(masteryScores);
  const masteredCount = allScores.filter((s) => s.masteryStatus === "mastered").length;
  const weakCount = allScores.filter((s) => s.masteryStatus === "weak").length;
  const learningCount = allScores.filter((s) => s.masteryStatus === "learning").length;
  const unresolvedWrong = wrongAnswers.filter((w) => !w.isResolved).length;
  const primarySubjectId = subjects.find((subject) => subject.id === "physics-11")?.id ?? subjects[0]?.id ?? "math-11";

  return (
    <div className="min-h-screen" id="main-content">
      {/* Nav */}
      <nav className="glass sticky top-0 z-50 border-b border-[var(--surface-border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-xl font-bold gradient-text">MasteryAI</span>
          </Link>
          <span className="text-sm font-medium text-[var(--text-primary)]">Dashboard</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)]">Your Progress</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Mastered", value: masteredCount, icon: "✅", color: "text-emerald-400" },
            { label: "Learning", value: learningCount, icon: "📖", color: "text-amber-400" },
            { label: "Weak", value: weakCount, icon: "🎯", color: "text-red-400" },
            { label: "Wrong Answers", value: unresolvedWrong, icon: "❌", color: "text-purple-400" },
          ].map((stat) => (
            <Card key={stat.label}>
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Per-chapter mastery */}
        {chapters.map((chapter) => {
          const subtopicList = getSubtopicsByChapter(chapter.id);
          const subject = subjects.find((s) => s.id === chapter.subjectId);
          const pct = getChapterMasteryPercentage(allScores, subtopicList.map((s) => s.id));

          return (
            <div key={chapter.id} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{chapter.name}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">{subject?.name} · Class {subject?.grade}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm("Reset all mastery data for this chapter?")) {
                      resetChapterMastery(chapter.id, subtopicList.map((s) => s.id));
                    }
                  }}>
                    Reset
                  </Button>
                  <Link href={`/learn/${chapter.subjectId}/${chapter.id}`}>
                    <Button variant="secondary" size="sm">Study →</Button>
                  </Link>
                </div>
              </div>

              <MasteryHeatmap subtopics={subtopicList} masteryScores={masteryScores} />
            </div>
          );
        })}

        {/* Wrong Answer Book */}
        {wrongAnswers.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">📕 Wrong Answer Book</h2>
            <div className="space-y-3">
              {wrongAnswers.filter((w) => !w.isResolved).slice(0, 10).map((wa) => {
                const q = questions.find((qu) => qu.id === wa.questionId);
                if (!q) return null;
                return (
                  <Card key={wa.questionId} className="border-red-500/20">
                    <p className="text-sm text-[var(--text-primary)] mb-2">{q.questionText.slice(0, 120)}...</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-red-400">Your answer: {wa.wrongAnswer}</span>
                      <span className="text-emerald-400">Correct: {wa.correctAnswer}</span>
                      <span className="text-[var(--text-tertiary)]">Wrong {wa.attemptCount}x</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {allScores.length === 0 && (
          <Card className="text-center py-16">
            <span className="text-5xl mb-4 block">🚀</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No progress yet</h2>
            <p className="text-[var(--text-secondary)] mb-6">Start learning a chapter to see your mastery data here</p>
            <Link href={`/learn/${primarySubjectId}`}>
              <Button variant="primary" size="lg">Start Learning</Button>
            </Link>
          </Card>
        )}
      </main>
    </div>
  );
}

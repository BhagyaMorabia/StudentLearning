"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, Badge, Progress } from "@/components/ui";
import { subjects, chapters, getSubtopicsByChapter } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { getChapterMasteryPercentage } from "@/lib/mastery";
import { Brain, ChevronRight, Clock, BookOpen } from "lucide-react";

export default function SubjectPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const subject = subjects.find((s) => s.id === subjectId);
  const subjectChapters = chapters.filter((c) => c.subjectId === subjectId);
  const masteryScores = useAppStore((s) => s.masteryScores);

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Subject not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen noise" id="main-content">
      {/* Nav */}
      <nav className="glass sticky top-0 left-0 right-0 z-50 w-full">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-7xl px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-white">Mastery<span className="text-indigo-400">AI</span></span>
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-[var(--text-secondary)]">{subject.name}</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="w-full flex justify-center py-12">
        <div className="w-full max-w-3xl px-6">
        {/* Header */}
        <div className="mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">{subject.name}</h1>
          <p className="text-[var(--text-secondary)] text-lg">Class {subject.grade} · {subject.description}</p>
        </div>

        {/* Chapters */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-6">Chapters</h2>
          {subjectChapters.map((chapter) => {
            const subtopicList = getSubtopicsByChapter(chapter.id);
            const subtopicIds = subtopicList.map((s) => s.id);
            const pct = getChapterMasteryPercentage(Object.values(masteryScores), subtopicIds);

            return (
              <Link key={chapter.id} href={`/learn/${subjectId}/${chapter.id}`}>
                <Card interactive glow={pct >= 85 ? "success" : pct > 0 ? "warning" : "brand"} className="mb-4 group">
                  <div className="shimmer-line" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-indigo-300 transition-colors">{chapter.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{chapter.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{subtopicList.length} subtopics</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{chapter.estimatedHours}h</span>
                      </div>
                      {pct > 0 && (
                        <>
                          <Progress value={pct} size="sm" variant={pct >= 85 ? "success" : "brand"} className="w-28" />
                          <Badge variant={pct >= 85 ? "mastered" : pct >= 50 ? "learning" : "weak"}>
                            {pct}%
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
        </div>
      </main>
    </div>
  );
}

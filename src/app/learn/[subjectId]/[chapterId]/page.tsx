"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { subjects, chapters, getSubtopicsByChapter, getQuestionsByChapter, subtopicNameMap } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { MasteryHeatmap } from "@/components/dashboard/MasteryHeatmap";
import { AITeacherChat } from "@/components/learning/AITeacherChat";
import { ContentRenderer, MermaidDiagram, FormulaCard, KeyPoints } from "@/components/learning/ContentRenderer";
import { cn, getMasteryLabel } from "@/lib/utils";
import type { Subtopic } from "@/lib/types";
import { Brain, Zap, BookOpen, ChevronLeft, ChevronRight, BarChart3, AlertTriangle, Sparkles, Loader2, MessageCircle } from "lucide-react";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const subject = subjects.find((s) => s.id === subjectId);
  const chapter = chapters.find((c) => c.id === chapterId);
  const subtopicList = getSubtopicsByChapter(chapterId);

  const [activeTab, setActiveTab] = useState<"learn" | "mastery">("learn");
  const [activeSubtopic, setActiveSubtopic] = useState<Subtopic | null>(subtopicList[0] || null);

  const masteryScores = useAppStore((s) => s.masteryScores);
  const learningPaths = useAppStore((s) => s.learningPaths);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [aiLessons, setAiLessons] = useState<Record<string, string>>({});
  const [openTutorForSubtopicId, setOpenTutorForSubtopicId] = useState<string | null>(null);

  const startQuiz = useAppStore((s) => s.startQuiz);

  if (!subject || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Chapter not found</p>
      </div>
    );
  }

  const learningPath = learningPaths[chapterId];
  const hasWeakTopics = learningPath?.weakSubtopicIds?.length > 0;
  const activeIndex = activeSubtopic ? subtopicList.indexOf(activeSubtopic) : -1;

  function handleStartQuiz(type: "mastery_test" | "remediation") {
    let qs = getQuestionsByChapter(chapterId);
    if (type === "remediation" && learningPath?.weakSubtopicIds) {
      const weakSet = new Set(learningPath.weakSubtopicIds);
      qs = qs.filter((q) => weakSet.has(q.subtopicId));
    }
    if (qs.length === 0) return;
    startQuiz(chapterId, qs, type);
    router.push(`/quiz/${chapterId}`);
  }

  const handleGenerateLesson = async () => {
    if (!activeSubtopic) return;
    setIsGeneratingLesson(true);
    try {
      const response = await fetch("/api/teach-subtopic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtopicName: activeSubtopic.name,
          currentMarkdown: activeSubtopic.contentMarkdown,
          weaknessLevel: masteryScores[activeSubtopic.id]?.masteryStatus || "learning",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setAiLessons(prev => ({ ...prev, [activeSubtopic.id]: data.text }));
    } catch (err) {
      alert("Failed to generate AI lesson. Make sure GROQ_API_KEY is in .env.local.");
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  return (
    <div className="min-h-screen noise" id="main-content">
      {/* Nav */}
      <nav className="glass sticky top-0 left-0 right-0 z-50 w-full">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-7xl px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>
              <span className="text-white/20">/</span>
              <Link href={`/learn/${subjectId}`} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                {subject.name}
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-white font-medium">{chapter.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => handleStartQuiz("mastery_test")}>
                <Zap className="w-3.5 h-3.5" />
                Take Quiz
              </Button>
              {hasWeakTopics && (
                <Button variant="danger" size="sm" onClick={() => handleStartQuiz("remediation")}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Fix Weak Topics
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-7xl px-6">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] p-1 rounded-2xl w-fit border border-white/[0.06]" role="tablist">
          {([
            { id: "learn" as const, label: "Learn", icon: BookOpen },
            { id: "mastery" as const, label: "Mastery", icon: BarChart3 },
          ]).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "mastery" ? (
          <MasteryHeatmap subtopics={subtopicList} masteryScores={masteryScores} />
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-8">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-1.5 w-full" role="navigation" aria-label="Subtopics">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-4 px-3">
                Subtopics
              </h3>
              {subtopicList.map((st, i) => {
                const mastery = masteryScores[st.id];
                const status = mastery?.masteryStatus || "not_started";
                const isActive = activeSubtopic?.id === st.id;

                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveSubtopic(st)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 group cursor-pointer",
                      isActive
                        ? "bg-indigo-500/10 border border-indigo-500/20"
                        : "hover:bg-white/[0.04] border border-transparent"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-white/[0.06] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate transition-colors",
                        isActive ? "text-white" : "text-[var(--text-secondary)] group-hover:text-white"
                      )}>
                        {st.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">~{st.estimatedMinutes} min</p>
                    </div>
                    {status !== "not_started" && (
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        status === "mastered" && "bg-emerald-400",
                        status === "learning" && "bg-amber-400",
                        status === "weak" && "bg-red-400",
                      )} title={getMasteryLabel(status)} />
                    )}
                  </button>
                );
              })}
            </aside>

            {/* Main content */}
            {activeSubtopic && (
              <article className="min-w-0">
                <Card className="mb-8 !p-8">
                  {/* Title row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                    <div>
                      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
                        Subtopic {activeIndex + 1} of {subtopicList.length}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {activeSubtopic.name}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={(masteryScores[activeSubtopic.id]?.masteryStatus || "not_started") as "mastered" | "learning" | "weak" | "not_started"}>
                        {getMasteryLabel(masteryScores[activeSubtopic.id]?.masteryStatus || "not_started")}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                        onClick={() => setOpenTutorForSubtopicId((current) => current === activeSubtopic.id ? null : activeSubtopic.id)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {openTutorForSubtopicId === activeSubtopic.id ? "Hide AI Tutor" : "Talk to AI Tutor"}
                      </Button>
                      {!aiLessons[activeSubtopic.id] && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30"
                          onClick={handleGenerateLesson}
                          disabled={isGeneratingLesson}
                        >
                          {isGeneratingLesson ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          {isGeneratingLesson ? "Generating..." : "AI: Teach Me From Scratch"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Markdown content */}
                  {aiLessons[activeSubtopic.id] ? (
                    <div className="mb-6 p-6 bg-gradient-to-br from-purple-900/10 to-[var(--surface-2)] rounded-2xl border border-purple-500/20">
                      <h3 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Personalized AI Lesson
                      </h3>
                      <ContentRenderer content={aiLessons[activeSubtopic.id]} />
                    </div>
                  ) : (
                    <ContentRenderer content={activeSubtopic.contentMarkdown} />
                  )}

                  {/* Diagram */}
                  {activeSubtopic.diagramMermaid && (
                    <div className="mt-8 p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                      <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Concept Diagram
                      </h3>
                      <MermaidDiagram chart={activeSubtopic.diagramMermaid} />
                    </div>
                  )}

                  {/* Flowchart */}
                  {activeSubtopic.flowchartMermaid && (
                    <div className="mt-6 p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                      <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Problem-Solving Flowchart
                      </h3>
                      <MermaidDiagram chart={activeSubtopic.flowchartMermaid} />
                    </div>
                  )}

                  {/* Formulas */}
                  {activeSubtopic.formulasLatex.length > 0 && (
                    <FormulaCard formulas={activeSubtopic.formulasLatex} />
                  )}

                  {/* Key Points */}
                  {activeSubtopic.keyPoints.length > 0 && (
                    <KeyPoints points={activeSubtopic.keyPoints} />
                  )}

                  {/* Common Mistakes */}
                  {activeSubtopic.commonMistakes.length > 0 && (
                    <KeyPoints
                      points={activeSubtopic.commonMistakes}
                      title="Common Mistakes"
                      icon={<AlertTriangle className="w-4 h-4" />}
                      variant="warning"
                    />
                  )}

                  <div className="mt-8 p-5 bg-gradient-to-br from-blue-950/20 via-transparent to-transparent rounded-2xl border border-blue-500/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Continue This Part With AI
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                          Learn this subtopic from scratch in tiny parts. Type yes when you are ready for the next part, or ask anything right here.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30 flex-shrink-0"
                        onClick={() => setOpenTutorForSubtopicId((current) => current === activeSubtopic.id ? null : activeSubtopic.id)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {openTutorForSubtopicId === activeSubtopic.id ? "Close Tutor" : "Open Tutor"}
                      </Button>
                    </div>
                  </div>

                  {openTutorForSubtopicId === activeSubtopic.id && (
                    <div className="mt-6">
                      <AITeacherChat
                        key={activeSubtopic.id}
                        subtopicName={activeSubtopic.name}
                        markdownContent={activeSubtopic.contentMarkdown}
                        weaknessLevel={masteryScores[activeSubtopic.id]?.masteryStatus || "learning"}
                        onClose={() => setOpenTutorForSubtopicId(null)}
                      />
                    </div>
                  )}
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  {activeIndex > 0 ? (
                    <Button variant="secondary" onClick={() => setActiveSubtopic(subtopicList[activeIndex - 1])}>
                      <ChevronLeft className="w-4 h-4" />
                      {subtopicList[activeIndex - 1].name}
                    </Button>
                  ) : <div />}
                  {activeIndex < subtopicList.length - 1 ? (
                    <Button variant="primary" onClick={() => setActiveSubtopic(subtopicList[activeIndex + 1])}>
                      {subtopicList[activeIndex + 1].name}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="success" onClick={() => handleStartQuiz("mastery_test")}>
                      <Zap className="w-4 h-4" />
                      Take Quiz
                    </Button>
                  )}
                </div>
              </article>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

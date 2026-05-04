"use client";

import React, { useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Badge, Progress } from "@/components/ui";
import { QuestionCard, QuizTimer, QuestionNav } from "@/components/quiz/QuizComponents";
import { useAppStore } from "@/lib/store";
import { chapters, subtopicNameMap } from "@/lib/data";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const chapter = chapters.find((c) => c.id === chapterId);
  const chapterLearnHref = chapter ? `/learn/${chapter.subjectId}/${chapterId}` : "/learn/physics-11";

  const activeQuiz = useAppStore((s) => s.activeQuiz);
  const answerQuestion = useAppStore((s) => s.answerQuestion);
  const skipQuestion = useAppStore((s) => s.skipQuestion);
  const completeQuiz = useAppStore((s) => s.completeQuiz);
  const nextQuestion = useAppStore((s) => s.nextQuestion);
  const previousQuestion = useAppStore((s) => s.previousQuestion);
  const goToQuestion = useAppStore((s) => s.goToQuestion);

  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const questionStartTime = useRef(Date.now());
  const quizStartTime = useRef(Date.now());

  const getTimeTaken = useCallback(() => {
    const elapsed = Math.floor((Date.now() - questionStartTime.current) / 1000);
    questionStartTime.current = Date.now();
    return elapsed;
  }, []);

  if (!activeQuiz || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">No active quiz session</p>
          <Link href={chapterLearnHref}>
            <Button variant="primary">Back to Chapter</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQQ = activeQuiz.questions[activeQuiz.currentIndex];
  const answered = activeQuiz.questions.map((q) => q.userAnswer);
  const answeredCount = activeQuiz.questions.filter((q) => q.userAnswer || q.isSkipped).length;

  function handleAnswer(answer: string) {
    const time = getTimeTaken();
    answerQuestion(answer, time);
    setShowResult(true);
  }

  function handleSkip() {
    const time = getTimeTaken();
    skipQuestion(time);
    handleNext();
  }

  function handleNext() {
    setShowResult(false);
    questionStartTime.current = Date.now();
    nextQuestion();
  }

  function handlePrevious() {
    setShowResult(false);
    questionStartTime.current = Date.now();
    previousQuestion();
  }

  function handleNavigate(index: number) {
    setShowResult(!!activeQuiz?.questions[index]?.userAnswer);
    questionStartTime.current = Date.now();
    goToQuestion(index);
  }

  function handleSubmitQuiz() {
    const results = completeQuiz(subtopicNameMap);
    setQuizCompleted(true);
  }

  // ==================== RESULTS VIEW ====================
  if (quizCompleted && activeQuiz.isCompleted) {
    const lastResults = useAppStore.getState().lastResults;
    if (!lastResults) return null;

    return (
      <div className="min-h-screen" id="main-content">
        <nav className="glass sticky top-0 z-50 border-b border-[var(--surface-border)] w-full">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <span className="font-bold gradient-text">MasteryAI</span>
              </Link>
              <span className="text-sm text-[var(--text-secondary)]">Quiz Results</span>
            </div>
          </div>
        </nav>

        <main className="w-full flex justify-center py-12">
          <div className="w-full max-w-4xl px-6">
          {/* Score card */}
          <Card className="text-center mb-8">
            <div className="text-6xl mb-4">
              {lastResults.percentage >= 85 ? "🏆" : lastResults.percentage >= 50 ? "📈" : "💪"}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              <span className={lastResults.percentage >= 85 ? "text-emerald-400" : lastResults.percentage >= 50 ? "text-amber-400" : "text-red-400"}>
                {Math.round(lastResults.percentage)}%
              </span>
            </h1>
            <p className="text-[var(--text-secondary)] mb-4">
              {lastResults.correctAnswers}/{lastResults.totalQuestions} correct · Score: {lastResults.totalScore}/{lastResults.maxScore}
            </p>
            <Progress
              value={lastResults.percentage}
              variant={lastResults.percentage >= 85 ? "success" : lastResults.percentage >= 50 ? "warning" : "danger"}
              size="lg"
              className="max-w-md mx-auto"
            />
          </Card>

          {/* Subtopic breakdown */}
          <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Subtopic Breakdown</h2>
          <div className="space-y-3 mb-8">
            {lastResults.subtopicResults.map((sr) => (
              <Card key={sr.subtopicId} className={sr.status === "weak" ? "border-red-500/30" : sr.status === "mastered" ? "border-emerald-500/30" : ""}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{sr.subtopicName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{sr.correctAnswers}/{sr.totalQuestions} correct</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg">{Math.round(sr.score)}%</span>
                    <Badge variant={sr.status as "mastered" | "learning" | "weak"}>{sr.status === "mastered" ? "✓ Mastered" : sr.status === "weak" ? "✗ Weak" : "Learning"}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={chapterLearnHref}>
              <Button variant="secondary" size="lg">← Back to Chapter</Button>
            </Link>
            {lastResults.weakSubtopics.length > 0 && (
              <Link href={chapterLearnHref}>
                <Button variant="danger" size="lg">
                  🎯 Review {lastResults.weakSubtopics.length} Weak Topic{lastResults.weakSubtopics.length > 1 ? "s" : ""}
                </Button>
              </Link>
            )}
            <Link href="/dashboard">
              <Button variant="primary" size="lg">View Dashboard</Button>
            </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUIZ VIEW ====================
  return (
    <div className="min-h-screen" id="main-content">
      <nav className="glass sticky top-0 z-50 border-b border-[var(--surface-border)] w-full">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-4xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
              </Link>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{chapter.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {activeQuiz.sessionType === "remediation" ? "Remediation Quiz" : "Mastery Test"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <QuizTimer startTime={quizStartTime.current} />
              <span className="text-xs text-[var(--text-tertiary)]">{answeredCount}/{activeQuiz.questions.length} answered</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full flex justify-center py-8">
        <div className="w-full max-w-4xl px-6">
        {/* Question navigation dots */}
        <div className="mb-8">
          <QuestionNav
            total={activeQuiz.questions.length}
            current={activeQuiz.currentIndex}
            quizQuestions={activeQuiz.questions}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Current question */}
        <QuestionCard
          question={currentQQ.question}
          questionNumber={activeQuiz.currentIndex + 1}
          totalQuestions={activeQuiz.questions.length}
          selectedAnswer={currentQQ.userAnswer}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          onNext={handleNext}
          onPrevious={handlePrevious}
          showResult={showResult}
          isFirst={activeQuiz.currentIndex === 0}
          isLast={activeQuiz.currentIndex === activeQuiz.questions.length - 1}
          onSubmitQuiz={handleSubmitQuiz}
          timeTaken={0}
        />
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import type { Question, QuestionOption, QuizQuestion } from "@/lib/types";
import { Button, Card } from "@/components/ui";
import { ContentRenderer } from "@/components/learning/ContentRenderer";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

// ==================== MCQ OPTION ====================
interface OptionProps {
  option: QuestionOption;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled: boolean;
  showResult?: boolean;
  correctAnswer?: string;
}

function QuizOption({ option, selected, onSelect, disabled, showResult, correctAnswer }: OptionProps) {
  const isCorrect = option.id === correctAnswer;
  const isWrong = selected && !isCorrect && showResult;

  let borderClass = "border-[var(--surface-border)] hover:border-[var(--surface-border-hover)]";
  if (selected && !showResult) borderClass = "border-indigo-500 bg-indigo-500/10";
  if (showResult && isCorrect) borderClass = "border-emerald-500 bg-emerald-500/10";
  if (isWrong) borderClass = "border-red-500 bg-red-500/10";

  return (
    <button
      onClick={() => !disabled && onSelect(option.id)}
      disabled={disabled}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3",
        borderClass,
        !disabled && "cursor-pointer hover:bg-[var(--surface-2)]",
        disabled && "cursor-not-allowed"
      )}
      aria-pressed={selected}
      role="radio"
    >
      <span className={cn(
        "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors",
        selected && !showResult && "bg-indigo-600 border-indigo-600 text-white",
        showResult && isCorrect && "bg-emerald-600 border-emerald-600 text-white",
        isWrong && "bg-red-600 border-red-600 text-white",
        !selected && !showResult && "border-[var(--surface-border)] text-[var(--text-tertiary)]"
      )}>
        {option.id.toUpperCase()}
      </span>
      <span className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
        <ContentRenderer content={option.text} />
      </span>
      {showResult && isCorrect && <span className="text-emerald-400 text-lg">✓</span>}
      {isWrong && <span className="text-red-400 text-lg">✗</span>}
    </button>
  );
}

// ==================== QUESTION CARD ====================
interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer?: string;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  showResult: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSubmitQuiz: () => void;
  timeTaken: number;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswer,
  onSkip,
  onNext,
  onPrevious,
  showResult,
  isFirst,
  isLast,
  onSubmitQuiz,
  timeTaken,
}: QuestionCardProps) {
  const [aiState, setAiState] = useState<{
    questionId: string;
    explanation: string | null;
    isAnalyzing: boolean;
    error: string | null;
  }>({
    questionId: question.id,
    explanation: null,
    isAnalyzing: false,
    error: null,
  });

  const currentAiState = aiState.questionId === question.id
    ? aiState
    : { questionId: question.id, explanation: null, isAnalyzing: false, error: null };

  const difficultyLabels = ["", "Easy", "Moderate", "JEE Main", "JEE Advanced", "Olympiad"];
  const difficultyColors = ["", "text-emerald-400", "text-blue-400", "text-amber-400", "text-red-400", "text-purple-400"];

  const handleAnalyzeMistake = async () => {
    if (!selectedAnswer) return;
    setAiState({
      questionId: question.id,
      explanation: null,
      isAnalyzing: true,
      error: null,
    });

    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: question.questionText,
          options: question.options || [],
          userAnswerId: selectedAnswer,
          correctAnswerId: question.correctAnswer,
          explanationMarkdown: question.explanationMarkdown,
        }),
      });

      const data: { text?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to analyze mistake");
      
      setAiState({
        questionId: question.id,
        explanation: data.text || "No response generated.",
        isAnalyzing: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please check your GROQ_API_KEY.";
      setAiState({
        questionId: question.id,
        explanation: null,
        isAnalyzing: false,
        error: message,
      });
    } finally {
      setAiState((current) => current.questionId === question.id ? { ...current, isAnalyzing: false } : current);
    }
  };

  const isWrongAnswer = showResult && selectedAnswer && selectedAnswer !== question.correctAnswer;
  const aiExplanation = currentAiState.explanation;
  const isAnalyzing = currentAiState.isAnalyzing;
  const aiError = currentAiState.error;

  return (
    <Card className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--text-tertiary)]">
            Q{questionNumber}/{totalQuestions}
          </span>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-3)]", difficultyColors[question.difficulty])}>
            {difficultyLabels[question.difficulty]}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {question.questionType === "mcq_single" ? "MCQ" : question.questionType === "numerical" ? "Numerical" : question.questionType.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="text-emerald-400">+{question.positiveMarks}</span>
          {question.negativeMarks > 0 && (
            <span className="text-red-400">-{question.negativeMarks}</span>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-6">
        <ContentRenderer content={question.questionText} />
      </div>

      {/* Options (MCQ) */}
      {question.options && (
        <div className="space-y-3 mb-6" role="radiogroup" aria-label="Answer options">
          {question.options.map((opt) => (
            <QuizOption
              key={opt.id}
              option={opt}
              selected={selectedAnswer === opt.id}
              onSelect={onAnswer}
              disabled={showResult}
              showResult={showResult}
              correctAnswer={question.correctAnswer}
            />
          ))}
        </div>
      )}

      {/* Numerical Input */}
      {(question.questionType === "numerical" || question.questionType === "integer_type") && (
        <div className="mb-6">
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Your Answer:</label>
          <input
            type="number"
            value={selectedAnswer || ""}
            onChange={(e) => !showResult && onAnswer(e.target.value)}
            disabled={showResult}
            className="w-full max-w-xs bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none transition-colors"
            placeholder="Enter your answer..."
            aria-label="Numerical answer input"
          />
          {showResult && (
            <div className={cn(
              "mt-3 p-3 rounded-lg border",
              selectedAnswer == question.correctAnswer 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}>
              <div className="font-semibold mb-1">
                {selectedAnswer == question.correctAnswer ? "✓ Correct!" : "✗ Incorrect"}
              </div>
              <div className="text-sm">
                <span className="text-[var(--text-secondary)]">The correct answer is: </span>
                <span className="font-bold">{question.correctAnswer}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explanation (shown after answering) */}
      {showResult && question.explanationMarkdown && (
        <div className="mb-6 p-4 bg-gradient-to-br from-emerald-950/30 to-[var(--surface-2)] rounded-xl border border-emerald-500/20">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <span>📖</span> Standard Explanation
          </h4>
          <ContentRenderer content={question.explanationMarkdown} />
        </div>
      )}

      {/* AI Remediation for Wrong Answers */}
      {isWrongAnswer && (
        <div className="mb-6 p-5 bg-gradient-to-br from-purple-900/20 to-[var(--surface-2)] rounded-xl border border-purple-500/30">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Tutor Analysis
            </h4>
            {!aiExplanation && !isAnalyzing && (
              <Button variant="secondary" size="sm" className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30" onClick={handleAnalyzeMistake}>
                Analyze my mistake
              </Button>
            )}
          </div>
          
          {isAnalyzing && (
            <div className="flex items-center gap-3 text-[var(--text-tertiary)] text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              AI is reviewing your thought process...
            </div>
          )}

          {aiError && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {aiError}
            </p>
          )}

          {aiExplanation && (
            <div className="text-sm text-[var(--text-primary)] leading-relaxed prose-sm prose-invert max-w-none prose-p:my-2 prose-strong:text-purple-300">
              <ContentRenderer content={aiExplanation} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)]">
        <Button variant="ghost" size="sm" onClick={onPrevious} disabled={isFirst}>
          ← Previous
        </Button>

        <div className="flex items-center gap-2">
          {!showResult && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
          )}
          {isLast ? (
            <Button variant="success" size="md" onClick={onSubmitQuiz}>
              Submit Quiz
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onNext}>
              Next →
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ==================== QUIZ TIMER ====================
interface QuizTimerProps {
  startTime: number;
  className?: string;
}

export function QuizTimer({ startTime, className }: QuizTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className={cn("flex items-center gap-1.5 text-sm font-mono text-[var(--text-tertiary)]", className)}>
      <span>⏱</span>
      <span>{mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}</span>
    </div>
  );
}

// ==================== QUESTION NAV DOTS ====================
interface QuestionNavProps {
  total: number;
  current: number;
  quizQuestions: QuizQuestion[];
  onNavigate: (index: number) => void;
}

export function QuestionNav({ total, current, quizQuestions, onNavigate }: QuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center" role="navigation" aria-label="Question navigation">
      {Array.from({ length: total }, (_, i) => {
        const qq = quizQuestions[i];
        const answered = qq.userAnswer !== null && qq.userAnswer !== undefined;
        const isCurrent = i === current;
        
        let bgColor = "bg-[var(--surface-3)] text-[var(--text-tertiary)] border-[var(--surface-border)]";
        if (isCurrent) {
          bgColor = "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-[var(--surface-1)]";
        } else if (answered) {
          if (qq.isCorrect) {
            bgColor = "bg-emerald-600/20 text-emerald-400 border-emerald-500/30";
          } else {
            bgColor = "bg-red-600/20 text-red-400 border-red-500/30";
          }
        }

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border",
              bgColor
            )}
            aria-label={`Question ${i + 1}${answered ? (qq.isCorrect ? " (correct)" : " (wrong)") : ""}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

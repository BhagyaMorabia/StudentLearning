'use client';

import Link from 'next/link';

interface QuizResult {
  masteryScore: number;
  status: string;
  accuracy: number;
  totalAttempted: number;
  totalCorrect: number;
  weakConceptTags: string[];
  nextReviewAt: string;
  questionResults: Array<{ questionId: string; isCorrect: boolean; timeSpentMs: number }>;
}

interface Props {
  result: QuizResult;
  subtopicId: string;
  onRetry: () => void;
}

export default function MasteryResult({ result, subtopicId, onRetry }: Props) {
  const scoreColor =
    result.masteryScore >= 85
      ? 'text-green-500'
      : result.masteryScore >= 60
      ? 'text-amber-500'
      : 'text-red-500';

  const statusLabel: Record<string, string> = {
    MASTERED: '🎯 Mastered',
    NEEDS_REVIEW: '📖 Needs Review',
    WEAK: '⚠️ Needs Practice',
  };

  const nextReview = result.nextReviewAt
    ? new Date(result.nextReviewAt).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Score hero */}
      <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
        <div className={`text-7xl font-black ${scoreColor}`}>
          {result.masteryScore}
        </div>
        <div className="text-xl font-semibold">
          {statusLabel[result.status] ?? result.status}
        </div>
        <div className="flex justify-center gap-8 text-sm text-muted-foreground">
          <span>{result.totalCorrect} / {result.totalAttempted} correct</span>
          <span>{Math.round(result.accuracy * 100)}% accuracy</span>
        </div>
      </div>

      {/* Per-question results */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Question Results</h2>
        <div className="grid grid-cols-5 gap-2">
          {result.questionResults.map((q, i) => (
            <div
              key={q.questionId}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold ${
                q.isCorrect
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              }`}
              title={`Q${i + 1}: ${q.isCorrect ? 'Correct' : 'Wrong'} (${(q.timeSpentMs / 1000).toFixed(0)}s)`}
            >
              {q.isCorrect ? '✓' : '✗'}
            </div>
          ))}
        </div>
      </div>

      {/* Weak concept tags */}
      {result.weakConceptTags.length > 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Weak Areas Detected</h2>
          <div className="flex flex-wrap gap-2">
            {result.weakConceptTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full bg-destructive/10 text-destructive border border-destructive/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next review date */}
      {nextReview && (
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 text-sm text-center">
          <span className="text-muted-foreground">Next review scheduled: </span>
          <span className="font-semibold text-primary">{nextReview}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          id="retry-quiz-btn"
        >
          Try Again
        </button>
        <Link
          href={`/learn/${subtopicId}`}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium text-center hover:bg-primary/90 transition-colors"
          id="back-to-learn-btn"
        >
          Back to Learning
        </Link>
        <Link
          href="/review"
          className="flex-1 py-3 border rounded-xl text-sm font-medium text-center hover:bg-muted transition-colors"
          id="review-queue-btn"
        >
          Review Queue
        </Link>
      </div>
    </div>
  );
}

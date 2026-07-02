'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { Target, BookOpen, TriangleAlert, Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
      ? 'text-[var(--mastery-mastered)]'
      : result.masteryScore >= 60
      ? 'text-[var(--mastery-learning)]'
      : 'text-[var(--mastery-weak)]';

  const statusConfig: Record<string, { label: string; icon: LucideIcon; variant: 'mastered' | 'learning' | 'weak' }> = {
    MASTERED: { label: 'Mastered', icon: Target, variant: 'mastered' },
    NEEDS_REVIEW: { label: 'Needs Review', icon: BookOpen, variant: 'learning' },
    WEAK: { label: 'Needs Practice', icon: TriangleAlert, variant: 'weak' },
  };

  const config = statusConfig[result.status] ?? statusConfig.WEAK;
  const StatusIcon = config.icon;

  const nextReview = result.nextReviewAt
    ? new Date(result.nextReviewAt).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Score hero */}
      <Card className="text-center p-8 space-y-4">
        <div className={`text-4xl font-bold tracking-tight ${scoreColor}`}>
          {Math.round(result.masteryScore)}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Badge variant={config.variant} className="px-3 py-1">
            <StatusIcon className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {config.label}
          </Badge>
        </div>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground mt-4">
          <span>{result.totalCorrect} / {result.totalAttempted} correct</span>
          <span>{Math.round(result.accuracy * 100)}% accuracy</span>
        </div>
      </Card>

      {/* Per-question results */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Question Results</h2>
        <div className="grid grid-cols-5 gap-2">
          {result.questionResults.map((q, i) => (
            <div
              key={q.questionId}
              className={`aspect-square rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-bold transition-colors ${
                q.isCorrect
                  ? 'bg-mastery-mastered/10 text-mastery-mastered border border-mastery-mastered/20'
                  : 'bg-mastery-weak/10 text-mastery-weak border border-mastery-weak/20'
              }`}
              title={`Q${i + 1}: ${q.isCorrect ? 'Correct' : 'Wrong'} (${(q.timeSpentMs / 1000).toFixed(0)}s)`}
            >
              {q.isCorrect ? <Check className="w-5 h-5" aria-hidden="true" /> : <X className="w-5 h-5" aria-hidden="true" />}
              <span className="sr-only">Question {i + 1} {q.isCorrect ? 'Correct' : 'Wrong'}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Weak concept tags */}
      {result.weakConceptTags.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-mastery-weak" aria-hidden="true" />
            Weak Areas Detected
          </h2>
          <div className="flex flex-wrap gap-2">
            {result.weakConceptTags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded-[var(--radius-sm)] bg-mastery-weak/10 text-mastery-weak border border-mastery-weak/20 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Next review date */}
      {nextReview && (
        <div className="rounded-[var(--radius-lg)] border bg-accent/5 border-accent/20 p-4 text-sm text-center">
          <span className="text-muted-foreground">Next review scheduled: </span>
          <span className="font-semibold text-foreground">{nextReview}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="secondary" onClick={onRetry} className="flex-1" id="retry-quiz-btn">
          Try Again
        </Button>
        <Link href={`/learn/${subtopicId}`} className="flex-1" tabIndex={-1}>
          <Button variant="primary" className="w-full" id="back-to-learn-btn">
            Back to Learning
          </Button>
        </Link>
        <Link href="/review" className="flex-1" tabIndex={-1}>
          <Button variant="secondary" className="w-full" id="review-queue-btn">
            Review Queue
          </Button>
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, ErrorState, EmptyState, Skeleton } from '@/components/ui';
import type { ClientQuestion } from '@/lib/ai/schemas';
import QuizPresenter from './QuizPresenter';

interface Props {
  subtopicId?: string;
  chapterId?: string;
  quizTitle: string;
  onComplete: (result: QuizResult) => void;
}

export interface QuizResult {
  masteryScore: number;
  status: string;
  accuracy: number;
  totalAttempted: number;
  totalCorrect: number;
  weakConceptTags: string[];
  highConfidenceTags: string[];
  nextReviewAt: string;
  processingStatus?: 'PENDING_MASTERY' | 'PROCESSED';
  questionResults: Array<{
    questionId: string;
    isCorrect: boolean;
    timeSpentMs: number;
    failureMode: string;
    questionText: string;
    questionType: string;
    options: unknown;
    correctAnswer: unknown;
    selectedAnswer: unknown;
    solutionSteps: unknown;
    concept?: string;
    confidence?: 'high' | 'low' | 'medium';
  }>;
}

interface Answer {
  questionId: string;
  selectedAnswer: unknown;
  timeSpentMs: number;
  optionSwitchCount: number;
}

export default function QuizContainer({ subtopicId, chapterId, quizTitle, onComplete }: Props) {
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtopicId]);

  async function fetchQuestions() {
    setIsLoading(true);
    setError(null);
    setAnswers([]);
    setCurrentIndex(0);
    submissionIdRef.current = crypto.randomUUID();
    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopicId, chapterId }),
      });
      if (!res.ok) {
        let detail: string = res.statusText;
        try {
          const errPayload = await res.json();
          detail = (errPayload?.error as string) || (errPayload?.detail as string) || detail;
        } catch {
          try {
            detail = await res.text() || detail;
          } catch { /* noop */ }
        }
        throw new Error(`Failed to load quiz (HTTP ${res.status}): ${detail}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Failed to load quiz');
      setQuestions(data.data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNext(answerData: {
    selectedAnswer: unknown;
    timeSpentMs: number;
    optionSwitchCount: number;
  }) {
    const q = questions[currentIndex];
    if (!q) return;

    const answer: Answer = {
      questionId: q.id,
      selectedAnswer: answerData.selectedAnswer,
      timeSpentMs: answerData.timeSpentMs,
      optionSwitchCount: answerData.optionSwitchCount,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      await submitQuiz(newAnswers);
    }
  }

  async function submitQuiz(allAnswers: Answer[]) {
    setIsSubmitting(true);
    submissionIdRef.current ??= crypto.randomUUID();
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: submissionIdRef.current,
          subtopicId,
          chapterId,
          answers: allAnswers,
        }),
      });
      if (!res.ok) {
        let detail: string = res.statusText;
        try {
          const errPayload = await res.json();
          detail = (errPayload?.error as string) || (errPayload?.detail as string) || detail;
        } catch {
          try {
            detail = await res.text() || detail;
          } catch { /* noop */ }
        }
        throw new Error(`Quiz submission failed (HTTP ${res.status}): ${detail}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Submission failed');
      const conceptById = new Map(
        questions.map((q) => [q.id, q.conceptsTested?.[0] ?? null]),
      );
      onComplete({
        ...data.data,
        questionResults: data.data.questionResults.map((qr: QuizResult['questionResults'][number]) => ({
          ...qr,
          concept: conceptById.get(qr.questionId) ?? undefined,
        })),
      });
    } catch (err) {
      setError(String(err));
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Card className="space-y-4">
          <Skeleton className="h-20" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchQuestions} />;
  }

  if (questions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="quiz"
          title="No questions available"
          description="There are no quiz questions ready for this subtopic yet."
          action={
            <Button variant="secondary" onClick={fetchQuestions}>
              Refresh
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <QuizPresenter
      key={questions[currentIndex].id}
      question={questions[currentIndex]}
      currentIndex={currentIndex}
      totalQuestions={questions.length}
      isSubmitting={isSubmitting}
      subtopicId={subtopicId ?? chapterId ?? ''}
      quizTitle={quizTitle}
      onNext={handleNext}
    />
  );
}

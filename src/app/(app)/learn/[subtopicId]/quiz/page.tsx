'use client';

import { useState } from 'react';
import QuizPanel from '@/components/quiz/QuizPanel';
import MasteryResult from '@/components/quiz/MasteryResult';
import { use } from 'react';

interface Props {
  params: Promise<{ subtopicId: string }>;
}

export default function QuizPage({ params }: Props) {
  const { subtopicId } = use(params);
  const [quizResult, setQuizResult] = useState<{
    masteryScore: number;
    status: string;
    accuracy: number;
    totalAttempted: number;
    totalCorrect: number;
    weakConceptTags: string[];
    nextReviewAt: string;
    questionResults: Array<{ questionId: string; isCorrect: boolean; timeSpentMs: number }>;
  } | null>(null);

  if (quizResult) {
    return (
      <div className="max-w-3xl mx-auto">
        <MasteryResult
          result={quizResult}
          subtopicId={subtopicId}
          onRetry={() => setQuizResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <QuizPanel
        subtopicId={subtopicId}
        onComplete={setQuizResult}
      />
    </div>
  );
}

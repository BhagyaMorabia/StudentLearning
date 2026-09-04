'use client';

import { useState } from 'react';
import QuizContainer from '@/components/quiz/QuizContainer';
import type { QuizResult } from '@/components/quiz/QuizContainer';
import MasteryResult from '@/components/quiz/MasteryResult';

interface Props {
  subtopicId?: string;
  chapterId?: string;
  quizTitle: string;
}

export default function QuizSession({ subtopicId, chapterId, quizTitle }: Props) {
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  if (quizResult) {
    return (
      <MasteryResult
        result={quizResult}
        subtopicId={subtopicId}
        chapterId={chapterId}
        quizTitle={quizTitle}
        onRetry={() => setQuizResult(null)}
      />
    );
  }

  return (
    <QuizContainer
      subtopicId={subtopicId}
      chapterId={chapterId}
      quizTitle={quizTitle}
      onComplete={setQuizResult}
    />
  );
}

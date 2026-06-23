'use client';

import { useState, useEffect, useRef } from 'react';
import MathRenderer from '@/components/learn/MathRenderer';
import type { ClientQuestion } from '@/lib/ai/schemas';

interface Props {
  subtopicId: string;
  onComplete: (result: QuizSubmitResult) => void;
}

interface QuizSubmitResult {
  masteryScore: number;
  status: string;
  accuracy: number;
  totalAttempted: number;
  totalCorrect: number;
  weakConceptTags: string[];
  nextReviewAt: string;
  questionResults: Array<{ questionId: string; isCorrect: boolean; timeSpentMs: number }>;
}

interface Answer {
  questionId: string;
  selectedAnswer: unknown;
  timeSpentMs: number;
}

export default function QuizPanel({ subtopicId, onComplete }: Props) {
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<unknown>(null);
  const [selectedMSQ, setSelectedMSQ] = useState<string[]>([]);
  const [integerInput, setIntegerInput] = useState('');
  const [numericalInput, setNumericalInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    fetchQuestions();
  }, [subtopicId]);

  useEffect(() => {
    // Reset per-question state when moving to next question
    setSelectedAnswer(null);
    setSelectedMSQ([]);
    setIntegerInput('');
    setNumericalInput('');
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  async function fetchQuestions() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopicId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Failed to load quiz');
      setQuestions(data.data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  function getSelectedAnswerForQuestion(): unknown {
    const q = questions[currentIndex];
    if (!q) return null;
    switch (q.questionType) {
      case 'MCQ': return selectedAnswer;
      case 'MSQ': return selectedMSQ;
      case 'INTEGER': return integerInput;
      case 'NUMERICAL': return numericalInput;
      default: return null;
    }
  }

  function isAnswerProvided(): boolean {
    const q = questions[currentIndex];
    if (!q) return false;
    switch (q.questionType) {
      case 'MCQ': return selectedAnswer !== null;
      case 'MSQ': return selectedMSQ.length > 0;
      case 'INTEGER': return integerInput.trim() !== '';
      case 'NUMERICAL': return numericalInput.trim() !== '';
      default: return false;
    }
  }

  async function handleNext() {
    const q = questions[currentIndex];
    if (!q) return;

    const timeSpentMs = Date.now() - questionStartTime.current;
    const answer: Answer = {
      questionId: q.id,
      selectedAnswer: getSelectedAnswerForQuestion(),
      timeSpentMs,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // All questions answered — submit
      await submitQuiz(newAnswers);
    }
  }

  async function submitQuiz(allAnswers: Answer[]) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopicId, answers: allAnswers }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Submission failed');
      onComplete(data.data);
    } catch (err) {
      setError(String(err));
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <button onClick={fetchQuestions} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
          Try Again
        </button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const question = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{question.questionType}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="text-sm font-medium text-muted-foreground">
          Difficulty: {'★'.repeat(question.difficultyLevel)}{'☆'.repeat(5 - question.difficultyLevel)}
        </div>

        <MathRenderer content={question.questionText} />

        {/* MCQ options */}
        {question.questionType === 'MCQ' && question.options && (
          <div className="space-y-2">
            {question.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedAnswer(opt.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left text-sm transition-colors ${
                  selectedAnswer === opt.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                id={`option-${opt.id}`}
              >
                <span className="font-mono font-bold text-primary">{opt.id}</span>
                <MathRenderer content={opt.text} />
              </button>
            ))}
          </div>
        )}

        {/* MSQ options */}
        {question.questionType === 'MSQ' && question.options && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select all correct options</p>
            {question.options.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer text-sm transition-colors ${
                  selectedMSQ.includes(opt.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMSQ.includes(opt.id)}
                  onChange={(e) => {
                    setSelectedMSQ((prev) =>
                      e.target.checked
                        ? [...prev, opt.id]
                        : prev.filter((id) => id !== opt.id),
                    );
                  }}
                  className="w-4 h-4 accent-primary"
                  id={`msq-${opt.id}`}
                />
                <span className="font-mono font-bold text-primary">{opt.id}</span>
                <MathRenderer content={opt.text} />
              </label>
            ))}
          </div>
        )}

        {/* INTEGER input */}
        {question.questionType === 'INTEGER' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Enter an integer answer</p>
            <input
              type="number"
              step="1"
              value={integerInput}
              onChange={(e) => setIntegerInput(e.target.value)}
              placeholder="Enter integer..."
              className="w-full p-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              id="integer-input"
            />
          </div>
        )}

        {/* NUMERICAL input */}
        {question.questionType === 'NUMERICAL' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Enter numerical answer (decimal allowed)</p>
            <input
              type="number"
              step="any"
              value={numericalInput}
              onChange={(e) => setNumericalInput(e.target.value)}
              placeholder="Enter value..."
              className="w-full p-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              id="numerical-input"
            />
          </div>
        )}
      </div>

      {/* Next / Submit button */}
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!isAnswerProvided() || isSubmitting}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          id="quiz-next-btn"
        >
          {isSubmitting
            ? 'Submitting...'
            : currentIndex < questions.length - 1
            ? 'Next →'
            : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}

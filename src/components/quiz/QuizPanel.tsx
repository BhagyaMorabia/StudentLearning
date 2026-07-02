'use client';

import { useState, useEffect, useRef } from 'react';
import MathRenderer from '@/components/learn/MathRenderer';
import { Card, Button, Input, ErrorState, EmptyState, Skeleton, Progress } from '@/components/ui';
import { FileQuestion } from 'lucide-react';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          icon={FileQuestion}
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

  const question = questions[currentIndex];
  // Calculate difficulty dots
  const maxDifficulty = 5;
  const dots = [];
  for (let i = 0; i < maxDifficulty; i++) {
    dots.push(
      <span
        key={i}
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          i < question.difficultyLevel ? 'bg-accent' : 'bg-muted-foreground/30'
        }`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div>
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-[var(--radius-sm)] bg-muted border border-border">
            {question.questionType}
          </span>
        </div>
        <Progress value={currentIndex} max={questions.length} />
      </div>

      {/* Question card */}
      <Card className="space-y-6">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Difficulty</span>
          <div className="flex gap-1" aria-label={`Difficulty level ${question.difficultyLevel} out of 5`}>
            {dots}
          </div>
        </div>

        <MathRenderer content={question.questionText} />

        {/* MCQ options */}
        {question.questionType === 'MCQ' && question.options && (
          <div className="space-y-2" role="radiogroup" aria-label="Multiple choice options">
            {question.options.map((opt) => {
              const isSelected = selectedAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedAnswer(opt.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-[var(--radius-sm)] border text-left text-sm transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border hover:border-accent/50 hover:bg-muted'
                  }`}
                  id={`option-${opt.id}`}
                >
                  <span className={`font-mono font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-sm text-xs ${isSelected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {opt.id}
                  </span>
                  <MathRenderer content={opt.text} className="flex-1" />
                </button>
              );
            })}
          </div>
        )}

        {/* MSQ options */}
        {question.questionType === 'MSQ' && question.options && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Select all correct options</p>
            {question.options.map((opt) => {
              const isSelected = selectedMSQ.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-4 rounded-[var(--radius-sm)] border cursor-pointer text-sm transition-all duration-150 ease-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card ${
                    isSelected
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border hover:border-accent/50 hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      setSelectedMSQ((prev) =>
                        e.target.checked
                          ? [...prev, opt.id]
                          : prev.filter((id) => id !== opt.id),
                      );
                    }}
                    className="w-4 h-4 accent-accent"
                    id={`msq-${opt.id}`}
                    aria-label={`Option ${opt.id}`}
                  />
                  <span className={`font-mono font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-sm text-xs ${isSelected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {opt.id}
                  </span>
                  <MathRenderer content={opt.text} className="flex-1" />
                </label>
              );
            })}
          </div>
        )}

        {/* INTEGER input */}
        {question.questionType === 'INTEGER' && (
          <div className="space-y-2">
            <label htmlFor="integer-input" className="text-xs font-medium text-muted-foreground block">
              Enter an integer answer
            </label>
            <Input
              id="integer-input"
              type="number"
              step="1"
              value={integerInput}
              onChange={(e) => setIntegerInput(e.target.value)}
              placeholder="Enter integer..."
            />
          </div>
        )}

        {/* NUMERICAL input */}
        {question.questionType === 'NUMERICAL' && (
          <div className="space-y-2">
            <label htmlFor="numerical-input" className="text-xs font-medium text-muted-foreground block">
              Enter numerical answer (decimal allowed)
            </label>
            <Input
              id="numerical-input"
              type="number"
              step="any"
              value={numericalInput}
              onChange={(e) => setNumericalInput(e.target.value)}
              placeholder="Enter value..."
            />
          </div>
        )}
      </Card>

      {/* Next / Submit button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleNext}
          disabled={!isAnswerProvided() || isSubmitting}
          id="quiz-next-btn"
        >
          {isSubmitting
            ? 'Submitting...'
            : currentIndex < questions.length - 1
            ? 'Next →'
            : 'Submit Quiz'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import MathRenderer from '@/components/learn/MathRenderer';
import type { ClientQuestion } from '@/lib/ai/schemas';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuizPresenterProps {
  question: ClientQuestion;
  currentIndex: number;
  totalQuestions: number;
  isSubmitting: boolean;
  subtopicId: string;
  quizTitle?: string;
  timeBudgetPerQuestionSec?: number;
  onNext: (answer: {
    selectedAnswer: unknown;
    timeSpentMs: number;
    optionSwitchCount: number;
  }) => void;
}

export default function QuizPresenter({
  question,
  currentIndex,
  totalQuestions,
  isSubmitting,
  subtopicId,
  quizTitle = 'Practice Quiz',
  timeBudgetPerQuestionSec = 180,
  onNext,
}: QuizPresenterProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedMSQ, setSelectedMSQ] = useState<string[]>([]);
  const [integerInput, setIntegerInput] = useState('');
  const [numericalInput, setNumericalInput] = useState('');
  const [optionSwitchCount, setOptionSwitchCount] = useState(0);
  const questionStartTime = useRef<number>(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setElapsedSec(0);
    questionStartTime.current = Date.now();
    const started = Date.now();
    const timer = setInterval(() => {
      const currentElapsedMs = Date.now() - started;
      setElapsedSec(Math.floor(currentElapsedMs / 1000));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  function selectMcqOption(optionId: string) {
    setSelectedAnswer((previous) => {
      if (previous !== null && previous !== optionId) {
        setOptionSwitchCount((count) => count + 1);
      }
      return optionId;
    });
  }

  function toggleMsqOption(optionId: string, checked: boolean) {
    setSelectedMSQ((previous) => {
      if (previous.length > 0) {
        setOptionSwitchCount((count) => count + 1);
      }
      return checked
        ? [...previous, optionId]
        : previous.filter((id) => id !== optionId);
    });
  }

  function getSelectedAnswerForQuestion(): unknown {
    switch (question.questionType) {
      case 'MCQ':
        return selectedAnswer;
      case 'MSQ':
        return selectedMSQ;
      case 'INTEGER':
        return integerInput;
      case 'NUMERICAL':
        return numericalInput;
      default:
        return null;
    }
  }

  function isAnswerProvided(): boolean {
    switch (question.questionType) {
      case 'MCQ':
        return selectedAnswer !== null;
      case 'MSQ':
        return selectedMSQ.length > 0;
      case 'INTEGER':
        return integerInput.trim() !== '';
      case 'NUMERICAL':
        return numericalInput.trim() !== '';
      default:
        return false;
    }
  }

  function handleNextClick() {
    const elapsed = Date.now() - questionStartTime.current;
    const timeSpentMs = Math.min(600_000, Math.max(1, elapsed));
    onNext({
      selectedAnswer: getSelectedAnswerForQuestion(),
      timeSpentMs,
      optionSwitchCount,
    });
  }

  const maxDifficulty = 5;
  const stars = [];
  for (let i = 0; i < maxDifficulty; i++) {
    stars.push(
      <span
        key={i}
        className={cn(
          'material-symbols-outlined text-[16px]',
          i < question.difficultyLevel ? 'text-status-review' : 'text-surface-stroke'
        )}
        style={{
          fontVariationSettings:
            i < question.difficultyLevel ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        star
      </span>
    );
  }

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = elapsedSec >= timeBudgetPerQuestionSec * 0.8 && elapsedSec < timeBudgetPerQuestionSec;
  const isCritical = elapsedSec >= timeBudgetPerQuestionSec;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="w-full max-w-[720px] mx-auto flex flex-col relative z-10 pt-8 md:pt-10 pb-16 px-5 md:px-0 min-h-screen">
      <header className="w-full mb-7 md:mb-8 flex flex-col gap-4">
        <div className="flex justify-between items-center w-full gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/learn/${subtopicId}`}
              className="text-text-secondary hover:text-text-primary transition-colors p-2 -ml-2 rounded-md flex items-center justify-center hover:bg-surface-elevated shrink-0"
              aria-label="Close quiz"
            >
              <span className="material-symbols-outlined">close</span>
            </Link>
            <h1 className="font-[Geist] text-[17px] md:text-[18px] font-bold text-text-primary truncate tracking-[-0.008em]">
              {quizTitle}
            </h1>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 font-[JetBrains_Mono]',
              isCritical
                ? 'bg-destructive/15 border-destructive/40 text-destructive shadow-[0_0_14px_rgba(239,68,68,0.25)] animate-pulse'
                : isUrgent
                  ? 'bg-status-weak/10 border-status-weak/30 text-status-weak shadow-[0_0_12px_rgba(239,68,68,0.18)]'
                  : 'bg-surface-elevated border-surface-stroke text-on-surface'
            )}
          >
            <span
              className={cn(
                'material-symbols-outlined text-[17px]',
                isCritical ? 'text-destructive' : isUrgent ? 'text-status-weak' : 'text-primary'
              )}
            >
              timer
            </span>
            <span
              className={cn(
                'text-[13px] font-bold tracking-wide',
                isCritical ? 'text-destructive' : isUrgent ? 'text-status-weak' : 'text-on-surface'
              )}
            >
              {timerText}
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between items-center text-text-secondary font-[JetBrains_Mono] text-[11.5px]">
            <span className="tracking-[0.1em]">
              Q {(currentIndex + 1).toString().padStart(2, '0')} / {totalQuestions.toString().padStart(2, '0')}
            </span>
            <span className="font-bold tracking-wide text-on-surface/80">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-stroke/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.35)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2.5 mb-5 md:mb-6 flex-wrap">
        <span className="bg-surface-elevated border border-surface-stroke text-on-surface-variant font-[JetBrains_Mono] text-[11.5px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-sm">
          {question.questionType}
        </span>
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span className="font-[JetBrains_Mono] text-[11.5px] tracking-[0.05em]">
            Difficulty:
          </span>
          <div className="flex items-center">{stars}</div>
        </div>
      </div>

      <div className="bg-surface-elevated border border-surface-stroke rounded-lg p-5 md:p-7 mb-7 md:mb-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <MathRenderer
          content={question.questionText}
          className="font-[Inter] text-[16px] text-text-primary leading-[28px]"
        />
      </div>

      <div className="flex flex-col gap-3 md:gap-4 mb-8 md:mb-10">
        {question.questionType === 'MCQ' && question.options && (
          <>
            {question.options.map((opt) => {
              const isSelected = selectedAnswer === opt.id;
              return (
                <label
                  key={opt.id}
                  className={cn(
                    'group relative flex items-start p-4 md:p-4.5 border rounded-lg cursor-pointer transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]',
                    isSelected
                      ? 'border-primary/70 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(59,130,246,0.12),inset_0_1px_0_rgba(59,130,246,0.06)]'
                      : 'border-surface-stroke bg-surface-base hover:bg-surface-elevated hover:border-primary/35'
                  )}
                >
                  <input
                    className="sr-only peer"
                    name="mcq_option"
                    type="radio"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => selectMcqOption(opt.id)}
                  />
                  <div
                    className={cn(
                      'absolute inset-0 rounded-lg pointer-events-none border-2 transition-colors',
                      isSelected ? 'border-primary' : 'border-transparent'
                    )}
                  ></div>
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-md border font-[JetBrains_Mono] text-[12px] mr-4 mt-0.5 shrink-0 transition-all duration-200 font-bold tracking-wide',
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'border-surface-stroke bg-surface-elevated text-text-secondary group-hover:border-outline-variant/60'
                    )}
                  >
                    {opt.id}
                  </div>
                  <div className="flex-1 pt-0.5 min-w-0">
                    <MathRenderer
                      content={opt.text}
                      className={cn(
                        'font-[Inter] text-[15px] md:text-[16px] leading-[26px] transition-colors',
                        isSelected ? 'text-primary' : 'text-text-primary'
                      )}
                    />
                  </div>
                </label>
              );
            })}
          </>
        )}

        {question.questionType === 'MSQ' && question.options && (
          <>
            <p className="text-[11.5px] font-[JetBrains_Mono] tracking-[0.12em] uppercase text-text-secondary mb-1.5 ml-1">
              Select all correct options
            </p>
            {question.options.map((opt) => {
              const isSelected = selectedMSQ.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={cn(
                    'group relative flex items-start p-4 md:p-4.5 border rounded-lg cursor-pointer transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]',
                    isSelected
                      ? 'border-primary/70 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(59,130,246,0.12),inset_0_1px_0_rgba(59,130,246,0.06)]'
                      : 'border-surface-stroke bg-surface-base hover:bg-surface-elevated hover:border-primary/35'
                  )}
                >
                  <input
                    className="sr-only peer"
                    name="msq_option"
                    type="checkbox"
                    value={opt.id}
                    checked={isSelected}
                    onChange={(e) => toggleMsqOption(opt.id, e.target.checked)}
                  />
                  <div
                    className={cn(
                      'absolute inset-0 rounded-lg pointer-events-none border-2 transition-colors',
                      isSelected ? 'border-primary' : 'border-transparent'
                    )}
                  ></div>
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-md border font-[JetBrains_Mono] text-[12px] mr-4 mt-0.5 shrink-0 transition-all duration-200 font-bold tracking-wide',
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'border-surface-stroke bg-surface-elevated text-text-secondary group-hover:border-outline-variant/60'
                    )}
                  >
                    {opt.id}
                  </div>
                  <div className="flex-1 pt-0.5 min-w-0">
                    <MathRenderer
                      content={opt.text}
                      className={cn(
                        'font-[Inter] text-[15px] md:text-[16px] leading-[26px] transition-colors',
                        isSelected ? 'text-primary' : 'text-text-primary'
                      )}
                    />
                  </div>
                </label>
              );
            })}
          </>
        )}

        {(question.questionType === 'INTEGER' || question.questionType === 'NUMERICAL') && (
          <div className="space-y-2.5">
            <label className="text-[11.5px] font-[JetBrains_Mono] tracking-[0.1em] uppercase text-text-secondary block ml-1">
              {question.questionType === 'INTEGER'
                ? 'Enter an integer answer'
                : 'Enter numerical answer (decimal allowed)'}
            </label>
            <input
              type="number"
              step={question.questionType === 'INTEGER' ? '1' : 'any'}
              value={
                question.questionType === 'INTEGER' ? integerInput : numericalInput
              }
              onChange={(e) =>
                question.questionType === 'INTEGER'
                  ? setIntegerInput(e.target.value)
                  : setNumericalInput(e.target.value)
              }
              placeholder="Enter value…"
              className="w-full bg-surface-elevated border border-surface-stroke text-text-primary text-[16px] font-[Inter] rounded-lg p-4 md:p-4.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-all duration-200"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end mt-auto pt-7 md:pt-8 border-t border-surface-stroke/80">
        <button
          className={cn(
            'font-[Geist] text-[15.5px] font-semibold py-3 px-7 md:px-8 rounded-lg flex items-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
            !isAnswerProvided() || isSubmitting
              ? 'bg-surface-elevated text-text-secondary cursor-not-allowed shadow-none'
              : 'bg-primary hover:bg-[#2563EB] text-white shadow-[0_0_18px_rgba(59,130,246,0.25)] hover:shadow-[0_0_26px_rgba(59,130,246,0.4)]'
          )}
          onClick={handleNextClick}
          disabled={!isAnswerProvided() || isSubmitting}
        >
          {isSubmitting
            ? 'Submitting…'
            : currentIndex < totalQuestions - 1
              ? 'Next Question'
              : 'Submit Quiz'}
          {!isSubmitting && (
            <span className="material-symbols-outlined text-[20px] filled">
              arrow_forward
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

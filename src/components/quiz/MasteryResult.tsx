'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import type { QuizResult } from './QuizContainer';
import MathRenderer from '../learn/MathRenderer';

interface Props {
  result: QuizResult;
  subtopicId?: string;
  chapterId?: string;
  quizTitle: string;
  onRetry: () => void;
}

export default function MasteryResult({
  result,
  subtopicId,
  chapterId,
  quizTitle,
  onRetry,
}: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const scoreColor =
    result.masteryScore >= 85
      ? 'text-status-mastered'
      : result.masteryScore >= 60
        ? 'text-status-review'
        : 'text-status-weak';

  const statusConfig: Record<
    string,
    {
      label: string;
      bgBadge: string;
      textBadge: string;
      borderBadge: string;
      dot: string;
      ring: string;
    }
  > = {
    MASTERED: {
      label: 'MASTERED',
      bgBadge: 'bg-status-mastered/10',
      textBadge: 'text-status-mastered',
      borderBadge: 'border-status-mastered/25',
      dot: 'bg-status-mastered',
      ring: 'shadow-[0_0_14px_rgba(16,185,129,0.22)]',
    },
    NEEDS_REVIEW: {
      label: 'NEEDS REVIEW',
      bgBadge: 'bg-status-review/10',
      textBadge: 'text-status-review',
      borderBadge: 'border-status-review/25',
      dot: 'bg-status-review',
      ring: 'shadow-[0_0_14px_rgba(245,158,11,0.22)]',
    },
    WEAK: {
      label: 'NEEDS PRACTICE',
      bgBadge: 'bg-status-weak/10',
      textBadge: 'text-status-weak',
      borderBadge: 'border-status-weak/25',
      dot: 'bg-status-weak',
      ring: 'shadow-[0_0_14px_rgba(239,68,68,0.22)]',
    },
  };

  const config = statusConfig[result.status] ?? statusConfig.WEAK;

  const nextReview = result.nextReviewAt
    ? new Date(result.nextReviewAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      })
    : 'Not Scheduled';

  const totalTimeSecs =
    result.questionResults.reduce((acc, q) => acc + q.timeSpentMs, 0) / 1000;
  const totalMins = Math.floor(totalTimeSecs / 60);
  const totalSecsRemaining = Math.floor(totalTimeSecs % 60);

  const conceptWeaknessSeverity: Record<string, 'critical' | 'warning' | 'note'> = {};
  for (const tag of result.weakConceptTags ?? []) {
    conceptWeaknessSeverity[tag] = 'critical';
  }
  for (const tag of result.highConfidenceTags ?? []) {
    conceptWeaknessSeverity[tag] = 'note';
  }

  return (
    <div className="flex-1 w-full max-w-[720px] mx-auto py-8 md:py-12 space-y-7 md:space-y-8 px-5 md:px-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-text-secondary font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.22em] uppercase">
          <span className={cn('w-1.5 h-1.5 rounded-full pulse-dot', config.dot)} />
          Coach&apos;s Debrief Log
        </div>
        <h2 className="font-[Geist] text-headline-md font-semibold text-text-primary tracking-[-0.015em]">
          {quizTitle} Diagnostics
        </h2>
      </div>

      <div className="p-5 md:p-6 bg-surface-elevated border border-surface-stroke rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex-1 min-w-0">
          <div className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.22em] uppercase text-text-secondary/80 mb-2">
            Mastery Index
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              className={cn(
                'font-[Geist] text-display-lg font-bold tracking-[-0.025em] leading-none',
                scoreColor
              )}
            >
              {Math.round(result.masteryScore)}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm border',
                config.bgBadge,
                config.textBadge,
                config.borderBadge,
                config.ring
              )}
            >
              <span className={cn('w-1 h-1 rounded-full', config.dot)} />
              {config.label}
            </span>
          </div>
        </div>

        <div className="hidden md:block w-px h-16 bg-surface-stroke/80" />

        <div className="flex gap-8 md:gap-10 flex-wrap md:flex-nowrap">
          <div className="min-w-0">
            <div className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-text-secondary/80 mb-1.5">
              Accuracy
            </div>
            <div className="font-[JetBrains_Mono] text-[20px] md:text-[22px] font-bold text-text-primary tracking-[-0.01em]">
              {Math.round(result.accuracy * 100)}%
            </div>
            <div className="font-[JetBrains_Mono] text-[10.5px] tracking-wider text-text-secondary/60 mt-1">
              {result.totalCorrect}/{result.totalAttempted} Correct
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-text-secondary/80 mb-1.5">
              Repetition
            </div>
            <div className="font-[JetBrains_Mono] text-[20px] md:text-[22px] font-bold text-text-primary tracking-[-0.01em]">
              {nextReview}
            </div>
            <div className="font-[JetBrains_Mono] text-[10.5px] tracking-wider text-text-secondary/60 mt-1">
              Next Scheduled
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <div className="md:col-span-1 bg-surface-elevated border border-surface-stroke rounded-xl p-5 flex flex-col gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-status-weak/10 border border-status-weak/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-status-weak text-[18px] filled">
                trending_down
              </span>
            </span>
            <h3 className="font-[Geist] text-headline-sm font-semibold text-text-primary tracking-[-0.01em]">
              Focal Weaknesses
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(result.weakConceptTags ?? []).length > 0 ? (
              result.weakConceptTags.map((tag) => {
                const tier = conceptWeaknessSeverity[tag] ?? 'warning';
                const styles =
                  tier === 'critical'
                    ? 'bg-status-weak/10 text-status-weak border border-dashed border-status-weak/50'
                    : tier === 'warning'
                      ? 'bg-surface-base text-status-review border border-dashed border-status-review/50'
                      : 'bg-surface-base text-text-primary border border-solid border-surface-stroke';
                return (
                  <span
                    key={tag}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[13px] font-medium font-[Inter]',
                      styles
                    )}
                  >
                    {tag}
                  </span>
                );
              })
            ) : (
              <span className="text-text-secondary/85 text-[13px] font-[Inter] leading-relaxed">
                No critical weaknesses detected.
              </span>
            )}
            {(result.highConfidenceTags ?? []).length > 0 && (
              <div className="w-full pt-1">
                <div className="text-[10px] font-[JetBrains_Mono] font-bold tracking-[0.18em] uppercase text-text-secondary/60 mb-2 pl-0.5">
                  Confident
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.highConfidenceTags.map((tag) => (
                    <span
                      key={`hc-${tag}`}
                      className="px-2.5 py-1 rounded-sm bg-status-mastered/8 text-status-mastered border border-solid border-status-mastered/25 text-[12px] font-medium font-[JetBrains_Mono] tracking-wide"
                    >
                      + {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-surface-elevated border border-surface-stroke rounded-xl overflow-hidden flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="p-4 md:px-5 border-b border-surface-stroke bg-surface-container-lowest flex justify-between items-center gap-3 flex-wrap">
            <h3 className="font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.22em] uppercase text-text-secondary/80">
              Execution Trace
            </h3>
            <span className="font-[JetBrains_Mono] text-[10.5px] tracking-[0.12em] text-text-secondary/65">
              Total Time: {totalMins}m {totalSecsRemaining.toString().padStart(2, '0')}s
            </span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[420px]">
              <thead>
                <tr className="border-b border-surface-stroke text-text-secondary font-[JetBrains_Mono] text-[10.5px] tracking-[0.1em] uppercase bg-surface-base/40">
                  <th className="py-3 px-4 md:px-5 w-14 text-center">#</th>
                  <th className="py-3 px-4 md:px-5">Concept</th>
                  <th className="py-3 px-4 md:px-5 text-right">Time</th>
                  <th className="py-3 px-4 md:px-5 w-20 text-center">Stat</th>
                </tr>
              </thead>
              <tbody className="font-[Inter] text-[13.5px]">
                {result.questionResults.map((q, i) => {
                  const qTimeSec = Math.floor(q.timeSpentMs / 1000);
                  const qMins = Math.floor(qTimeSec / 60);
                  const qSecs = qTimeSec % 60;
                  const slow = qTimeSec > 120;
                  return (
                    <React.Fragment key={q.questionId}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === q.questionId ? null : q.questionId)}
                        className={cn(
                          'border-b border-surface-stroke/50 transition-colors cursor-pointer',
                          !q.isCorrect
                            ? 'bg-status-weak/[0.04] hover:bg-status-weak/[0.07]'
                            : 'hover:bg-surface-container-highest/40'
                        )}
                      >
                        <td className="py-3 px-4 md:px-5 text-center font-[JetBrains_Mono] text-text-secondary/85 font-bold tracking-wide">
                          {(i + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4 md:px-5 text-text-primary">
                          <div className="flex items-center gap-2">
                            <span>{q.concept || `Question ${(i + 1).toString().padStart(2, '0')}`}</span>
                            {slow && q.isCorrect && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-status-review/10 text-status-review text-[10px] font-[JetBrains_Mono] font-bold tracking-wider border border-status-review/15">
                                SLOW
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={cn(
                            'py-3 px-4 md:px-5 text-right font-[JetBrains_Mono] font-semibold tracking-wide',
                            !q.isCorrect
                              ? 'text-status-weak'
                              : slow
                                ? 'text-status-review'
                                : 'text-text-secondary'
                          )}
                        >
                          {qMins}:{qSecs.toString().padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4 md:px-5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {q.isCorrect ? (
                              <span className="material-symbols-outlined text-status-mastered text-[19px] filled">
                                check_circle
                              </span>
                            ) : (
                              <span className="material-symbols-outlined text-status-weak text-[19px] filled">
                                cancel
                              </span>
                            )}
                            <span className={cn(
                              "material-symbols-outlined text-[20px] text-text-secondary transition-transform duration-200",
                              expandedRow === q.questionId ? "rotate-180" : ""
                            )}>
                              expand_more
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === q.questionId && (
                        <tr>
                          <td colSpan={4} className="p-0 border-b border-surface-stroke/50">
                            <DetailedReviewCard questionData={q} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2.5 pt-6 mt-7 md:mt-8 border-t border-surface-stroke border-dashed">
        <Link
          href={chapterId ? `/learn` : `/learn/${subtopicId}`}
          className="w-full sm:w-auto px-5 py-2.5 text-text-primary font-[Inter] text-[13.5px] font-medium hover:text-text-secondary transition-colors text-center sm:text-left rounded-md hover:bg-surface-elevated"
        >
          Back to Learning
        </Link>
        <button
          type="button"
          onClick={onRetry}
          className="w-full sm:w-auto px-5 py-2.5 text-text-primary font-[Inter] text-[13.5px] font-medium border border-surface-stroke rounded-md bg-transparent hover:bg-surface-container-low hover:border-outline-variant/60 transition-all duration-200 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          Try Again
        </button>
        <Link
          href="/review"
          className="w-full sm:w-auto px-5 py-2.5 text-white font-[Inter] text-[13.5px] font-medium bg-primary rounded-md hover:bg-[#2563EB] transition-all duration-200 shadow-[0_0_16px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_rgba(59,130,246,0.38)] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          <span className="material-symbols-outlined text-[18px] filled">queue_play_next</span>
          Review Queue
        </Link>
      </div>
    </div>
  );
}

function DetailedReviewCard({ questionData }: { questionData: any }) {
  const isMcqMsq = questionData.questionType === 'MCQ' || questionData.questionType === 'MSQ';

  const diagnosticsMap: Record<string, { title: string, desc: string }> = {
    'MODE_1_PREREQUISITE': { title: 'Prerequisite Trap', desc: 'You fell for a distractor option designed to catch missing foundational knowledge. Review the basic concepts that build up to this.' },
    'MODE_2_MISCONCEPTION': { title: 'Core Misconception', desc: 'You made a common logical error or fell for a well-known trap in the application of the formula.' },
    'MODE_3_CALCULATION': { title: 'Careless Calculation', desc: 'You likely understood the concept but made a sign error, unit conversion mistake, or basic arithmetic error.' },
    'MODE_4_SPEED_ACCURACY': { title: 'Speed vs Accuracy', desc: 'You answered too quickly and missed a crucial detail in the question text.' },
    'MODE_5_MEMORY_DECAY': { title: 'Memory Decay', desc: 'You forgot a core formula or value that you previously knew.' },
    'MODE_6_GUESSING': { title: 'Random Guessing', desc: 'Your answer pattern suggests you were guessing or completely stuck.' },
    'NONE': { title: 'Normal Error', desc: 'You got this wrong, but no specific cognitive failure mode was detected.' }
  };

  const diag = diagnosticsMap[questionData.failureMode] || diagnosticsMap['NONE'];

  return (
    <div className="p-5 md:p-6 bg-surface-container-lowest/50 text-text-primary text-[14px] font-[Inter] space-y-6">
      {/* Question Text */}
      <div className="space-y-3">
        <div className="font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.18em] uppercase text-text-secondary/70">
          Question
        </div>
        <div className="text-[15px] leading-relaxed">
          <MathRenderer content={questionData.questionText} />
        </div>
      </div>

      {/* Options (MCQ/MSQ) */}
      {isMcqMsq && Array.isArray(questionData.options) && (
        <div className="space-y-3">
          <div className="font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.18em] uppercase text-text-secondary/70">
            Options
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {questionData.options.map((opt: any, idx: number) => {
              // Determine if this was the selected answer
              let isSelected = false;
              if (questionData.questionType === 'MCQ') {
                isSelected = questionData.selectedAnswer?.value === opt.id;
              } else if (questionData.questionType === 'MSQ') {
                isSelected = Array.isArray(questionData.selectedAnswer?.values) && questionData.selectedAnswer.values.includes(opt.id);
              }

              // Determine if this is a correct answer
              let isCorrectAnswer = false;
              if (questionData.questionType === 'MCQ') {
                isCorrectAnswer = questionData.correctAnswer?.value === opt.id;
              } else if (questionData.questionType === 'MSQ') {
                isCorrectAnswer = Array.isArray(questionData.correctAnswer?.values) && questionData.correctAnswer.values.includes(opt.id);
              }

              const borderClass = isSelected 
                ? (isCorrectAnswer ? 'border-status-mastered/50 bg-status-mastered/10' : 'border-status-weak/50 bg-status-weak/10')
                : (isCorrectAnswer ? 'border-status-mastered/50 bg-status-mastered/5' : 'border-surface-stroke bg-surface-base');

              return (
                <div key={opt.id} className={cn("p-3 rounded-lg border", borderClass, "flex gap-3")}>
                  <div className="mt-0.5">
                    {isSelected && !isCorrectAnswer && <span className="material-symbols-outlined text-status-weak text-[18px]">cancel</span>}
                    {isSelected && isCorrectAnswer && <span className="material-symbols-outlined text-status-mastered text-[18px]">check_circle</span>}
                    {!isSelected && isCorrectAnswer && <span className="material-symbols-outlined text-status-mastered text-[18px]">check</span>}
                    {!isSelected && !isCorrectAnswer && <span className="w-[18px] h-[18px] inline-block border border-text-secondary/30 rounded-full" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MathRenderer content={opt.text} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Integer / Numerical */}
      {!isMcqMsq && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-3 rounded-lg border border-surface-stroke bg-surface-base">
            <div className="font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.18em] uppercase text-text-secondary/70">Your Answer</div>
            <div className={cn("text-lg font-[JetBrains_Mono]", questionData.isCorrect ? "text-status-mastered" : "text-status-weak")}>
              {questionData.selectedAnswer?.value ?? 'Skipped'}
            </div>
          </div>
          <div className="space-y-2 p-3 rounded-lg border border-status-mastered/30 bg-status-mastered/5">
            <div className="font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.18em] uppercase text-text-secondary/70">Correct Answer</div>
            <div className="text-lg font-[JetBrains_Mono] text-text-primary">
              {questionData.correctAnswer?.value}
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics */}
      {questionData.failureMode !== 'NONE' && (
        <div className="p-4 bg-[#FFF4E5]/10 border border-[#F59E0B]/30 rounded-lg flex gap-4">
          <div className="mt-0.5 text-[#F59E0B]">
            <span className="material-symbols-outlined filled text-[22px]">psychology_alt</span>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-1">{diag.title}</h4>
            <p className="text-text-secondary text-[13px] leading-relaxed">{diag.desc}</p>
          </div>
        </div>
      )}

      {/* Solution Steps */}
      {Array.isArray(questionData.solutionSteps) && questionData.solutionSteps.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-surface-stroke border-dashed">
          <div className="font-[JetBrains_Mono] text-[10.5px] font-bold tracking-[0.18em] uppercase text-text-secondary/70">
            Step-by-step Solution
          </div>
          <div className="space-y-3">
            {questionData.solutionSteps.map((step: any, idx: number) => (
              <div key={idx} className="flex gap-4">
                <div className="font-[JetBrains_Mono] font-bold text-text-secondary/50 pt-0.5">
                  {(idx + 1).toString().padStart(2, '0')}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-[14px] text-text-primary/90">
                    <MathRenderer content={step.explanation} />
                  </div>
                  {step.math && step.math !== '...' && step.math.trim() !== '' && (
                    <div className="p-3 bg-surface-base rounded-md border border-surface-stroke overflow-x-auto text-[14px]">
                      <MathRenderer content={`$$${step.math}$$`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

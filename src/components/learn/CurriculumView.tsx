'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Progress } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SubtopicData {
  id: string;
  name: string;
  pyqFrequency?: number | null;
}

interface TopicData {
  subtopics: SubtopicData[];
}

interface ChapterData {
  chapter: { id: string; name: string };
  topics: TopicData[];
}

interface SubjectData {
  subject: { id: string; name: string };
  chapters: ChapterData[];
}

type MasteryStatus = 'NOT_STARTED' | 'WEAK' | 'NEEDS_REVIEW' | 'MASTERED';

interface MasteryRow {
  subtopicId: string;
  masteryScore?: number | null;
  status?: MasteryStatus | null;
}

function statusDot(status?: MasteryStatus | null) {
  switch (status) {
    case 'MASTERED':
      return 'bg-status-mastered';
    case 'NEEDS_REVIEW':
      return 'bg-status-review';
    case 'WEAK':
      return 'bg-status-weak';
    default:
      return 'bg-surface-stroke';
  }
}

export default function CurriculumView({ curriculum }: { curriculum: SubjectData[] }) {
  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    curriculum.length > 0 ? curriculum[0].subject.id : ''
  );
  const [masteryBySubtopic, setMasteryBySubtopic] = useState<Map<string, MasteryRow>>(
    new Map()
  );

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !Array.isArray(d.data?.mastery)) return;
        const next = new Map<string, MasteryRow>();
        for (const row of d.data.mastery as MasteryRow[]) {
          next.set(row.subtopicId, row);
        }
        setMasteryBySubtopic(next);
      })
      .catch(() => {});
  }, []);

  const activeSubjectData =
    curriculum.find((c) => c.subject.id === activeSubjectId) || curriculum[0];
  const { subject, chapters } = activeSubjectData;

  const subjectSubtopicIds = useMemo(
    () => chapters.flatMap((ch) => ch.topics.flatMap((t) => t.subtopics.map((s) => s.id))),
    [chapters]
  );

  const totalSubtopics = subjectSubtopicIds.length;

  const subjectStats = useMemo(() => {
    let mastered = 0;
    let review = 0;
    let weak = 0;
    for (const id of subjectSubtopicIds) {
      const status = masteryBySubtopic.get(id)?.status;
      if (status === 'MASTERED') mastered += 1;
      else if (status === 'NEEDS_REVIEW') review += 1;
      else if (status === 'WEAK') weak += 1;
    }
    const seen = mastered + review + weak;
    const overall = totalSubtopics > 0 ? Math.round((mastered / totalSubtopics) * 100) : 0;
    return {
      mastered,
      review,
      weak,
      unseen: Math.max(totalSubtopics - seen, 0),
      hasData: seen > 0,
      overall,
    };
  }, [masteryBySubtopic, subjectSubtopicIds, totalSubtopics]);

  const upNextChapter = chapters.find((ch) => {
    const scored = ch.topics
      .flatMap((t) => t.subtopics)
      .map((s) => masteryBySubtopic.get(s.id)?.masteryScore);
    const hasAnyMastered = scored.some((s) => typeof s === 'number' && s > 0);
    const notAllMastered = scored.length > 0 && scored.some((s) => !(typeof s === 'number' && s >= 90));
    return notAllMastered && hasAnyMastered;
  }) ?? chapters[0];

  if (curriculum.length === 0) {
    return null;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.22em] uppercase text-text-secondary/80 mb-2">
            <span className="w-1 h-1 rounded-full bg-primary/80" />
            Knowledge Graph · JEE Complete
          </div>
          <h1 className="font-[Geist] text-[36px] md:text-display-lg font-bold tracking-[-0.025em] text-text-primary mb-2 leading-tight">
            Curriculum Browser
          </h1>
          <p className="text-body-lg text-text-secondary leading-[28px] max-w-xl">
            Explore the complete JEE syllabus structured for high-density learning.
          </p>
        </div>

        <div className="hidden lg:flex bg-surface-elevated border border-surface-stroke rounded-lg p-1">
          {curriculum.map((subj) => {
            const isActive = subj.subject.id === activeSubjectId;
            return (
              <button
                key={subj.subject.id}
                type="button"
                onClick={() => setActiveSubjectId(subj.subject.id)}
                className={cn(
                  'relative px-5 py-2 rounded-md font-[JetBrains_Mono] text-[11px] tracking-[0.18em] uppercase transition-all duration-200',
                  isActive
                    ? 'bg-surface-container-high text-text-primary border border-surface-stroke shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.04)]'
                    : 'text-text-secondary hover:text-on-surface'
                )}
              >
                {subj.subject.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex lg:hidden overflow-x-auto gap-2 mb-6 pb-2 -mx-2 px-2">
        {curriculum.map((subj) => {
          const isActive = subj.subject.id === activeSubjectId;
          return (
            <button
              key={subj.subject.id}
              type="button"
              onClick={() => setActiveSubjectId(subj.subject.id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-md font-[JetBrains_Mono] text-[11px] tracking-[0.18em] uppercase whitespace-nowrap border transition-all duration-200',
                isActive
                  ? 'border-surface-stroke bg-surface-container-high text-on-surface'
                  : 'border-surface-stroke bg-surface-elevated text-text-secondary hover:text-on-surface'
              )}
            >
              {subj.subject.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 w-full">
        <div className="md:col-span-8 lg:col-span-9 space-y-6 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-[Geist] text-headline-md font-semibold text-text-primary tracking-[-0.015em]">
              {subject.name}
            </h2>
            <div className="h-px flex-1 bg-surface-stroke" />
            <Badge variant="default" shape="micro">
              {totalSubtopics} Subtopics
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {chapters.map(({ chapter, topics }) => {
              const allSubtopics = topics.flatMap((t) => t.subtopics);
              const subtopicCount = allSubtopics.length;
              const totalPyq = allSubtopics.reduce(
                (acc, s) => acc + (s.pyqFrequency ?? 0),
                0
              );
              const displaySubtopics = allSubtopics.slice(0, 3);
              const firstId = allSubtopics[0]?.id;
              const resumeId =
                allSubtopics.find((s) => {
                  const status = masteryBySubtopic.get(s.id)?.status;
                  return status !== 'MASTERED';
                })?.id || firstId;
              const scored = allSubtopics
                .map((s) => masteryBySubtopic.get(s.id)?.masteryScore)
                .filter((score): score is number => typeof score === 'number');
              const chapterMastery =
                scored.length > 0
                  ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
                  : null;
              const masteredSubtopics = allSubtopics.filter(
                (s) => masteryBySubtopic.get(s.id)?.status === 'MASTERED'
              ).length;
              const chapterProgress =
                subtopicCount > 0
                  ? Math.round((masteredSubtopics / subtopicCount) * 100)
                  : 0;

              return (
                <article
                  key={chapter.id}
                  className="group bg-surface-elevated border border-surface-stroke rounded-lg p-5 hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute left-0 bottom-0 w-full h-1 bg-surface-container overflow-hidden z-10">
                    <div
                      className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out"
                      style={{ width: `${chapterProgress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-start gap-3 mb-4">
                    {resumeId ? (
                      <Link href={`/learn/${resumeId}`} className="min-w-0">
                        <h3 className="font-[Geist] text-[16px] font-semibold text-text-primary hover:text-primary transition-colors leading-tight tracking-[-0.008em]">
                          {chapter.name}
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="font-[Geist] text-[16px] font-semibold text-text-primary leading-tight tracking-[-0.008em]">
                        {chapter.name}
                      </h3>
                    )}
                    <span className="font-[JetBrains_Mono] text-[13px] text-text-secondary shrink-0 font-semibold tracking-wide">
                      {chapterMastery === null ? '—' : `${chapterMastery}%`}
                    </span>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {displaySubtopics.map((subtopic) => (
                      <li key={subtopic.id}>
                        <Link
                          href={`/learn/${subtopic.id}`}
                          className="flex items-center gap-2 text-text-secondary text-[13px] hover:text-on-surface transition-colors"
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-sm flex-shrink-0',
                              statusDot(masteryBySubtopic.get(subtopic.id)?.status)
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate">{subtopic.name}</span>
                        </Link>
                      </li>
                    ))}
                    {subtopicCount > 3 && resumeId && (
                      <li>
                        <Link
                          href={`/learn/${resumeId}`}
                          className="text-text-secondary text-[12px] pl-3.5 hover:text-primary font-medium transition-colors"
                        >
                          +{subtopicCount - 3} more
                        </Link>
                      </li>
                    )}
                  </ul>

                  <div className="flex items-center gap-2 flex-wrap w-full mt-2">
                    <Badge variant="default" shape="micro">
                      {subtopicCount} Subtopics
                    </Badge>
                    {totalPyq > 0 && (
                      <Badge variant="learning" shape="micro">
                        {totalPyq} PYQs
                      </Badge>
                    )}
                    <Link
                      href={`/learn/chapter/${chapter.id}/quiz`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-[JetBrains_Mono] tracking-wide font-bold transition-colors ml-auto"
                    >
                      <span className="material-symbols-outlined text-[13px] filled">
                        psychology
                      </span>
                      CHAPTER TEST
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-4 lg:col-span-3 space-y-5 md:space-y-6">
          <div className="bg-gradient-to-br from-surface-elevated to-surface-elevated via-surface-container-low border border-surface-stroke rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/[0.07] blur-3xl rounded-full pointer-events-none group-hover:bg-primary/[0.1] transition-colors" />
            <div className="relative">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.22em] uppercase text-text-secondary/80 mb-1.5">
                    {subject.name} Progress
                  </h3>
                  <p className="font-[Inter] text-[12px] text-text-secondary/80">
                    {totalSubtopics} nodes in graph
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-5">
                <span className="font-[Geist] text-[48px] font-bold text-text-primary tracking-[-0.03em] leading-none">
                  {subjectStats.overall}
                </span>
                <span className="text-[18px] text-text-secondary font-semibold mb-1">%</span>
                <div className="ml-auto flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-[JetBrains_Mono] tracking-wide bg-primary/10 text-primary border border-primary/15">
                    <span className="material-symbols-outlined text-[11px] filled">
                      {subjectStats.overall >= 60 ? 'trending_up' : 'trending_down'}
                    </span>
                    {subjectStats.overall >= 60 ? 'ON TRACK' : 'CATCH UP'}
                  </span>
                </div>
              </div>

              <Progress
                value={subjectStats.overall}
                thickness="md"
                track="container"
                className="mb-6"
              />

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1.5 text-[12px]">
                    <span className="text-status-mastered font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-mastered" />
                      Mastered
                    </span>
                    <span className="font-[JetBrains_Mono] font-bold text-on-surface">
                      {subjectStats.mastered}
                    </span>
                  </div>
                  <Progress
                    value={totalSubtopics > 0 ? (subjectStats.mastered / totalSubtopics) * 100 : 0}
                    thickness="sm"
                    track="container"
                    className="[&>div>div]:bg-status-mastered"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 text-[12px]">
                    <span className="text-status-review font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-review" />
                      Needs review
                    </span>
                    <span className="font-[JetBrains_Mono] font-bold text-on-surface">
                      {subjectStats.review}
                    </span>
                  </div>
                  <Progress
                    value={totalSubtopics > 0 ? (subjectStats.review / totalSubtopics) * 100 : 0}
                    thickness="sm"
                    track="container"
                    className="[&>div>div]:bg-status-review"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 text-[12px]">
                    <span className="text-status-weak font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-weak" />
                      Weak
                    </span>
                    <span className="font-[JetBrains_Mono] font-bold text-on-surface">
                      {subjectStats.weak}
                    </span>
                  </div>
                  <Progress
                    value={totalSubtopics > 0 ? (subjectStats.weak / totalSubtopics) * 100 : 0}
                    thickness="sm"
                    track="container"
                    className="[&>div>div]:bg-status-weak"
                  />
                </div>
                <div className="pt-2 border-t border-surface-stroke/70">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-text-secondary/85 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-stroke" />
                      Unseen
                    </span>
                    <span className="font-[JetBrains_Mono] font-bold text-on-surface/80">
                      {subjectStats.unseen}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-primary/[0.12] via-surface-elevated to-surface-elevated border border-primary/20 rounded-xl p-5 overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/[0.1] blur-3xl pointer-events-none" />
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] pointer-events-none" />

            <div className="relative flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px] filled pulse-dot">
                    auto_awesome
                  </span>
                </div>
                <h3 className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
                  Up Next
                </h3>
              </div>

              <div className="mb-3">
                <p className="font-[Geist] text-[15px] font-bold text-text-primary tracking-[-0.01em] mb-1.5 leading-snug">
                  {upNextChapter?.chapter.name ?? 'Start Your Journey'}
                </p>
                <p className="font-[Inter] text-[12.5px] text-on-surface-variant leading-[1.55]">
                  Highest-impact next step. Progress-based sequencing ensures minimum gaps before Advanced level.
                </p>
              </div>

              <div className="mt-auto">
                {upNextChapter && (
                  <Link
                    href={`/learn/${upNextChapter.topics[0]?.subtopics[0]?.id ?? '#'}`}
                    className="group/btn inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-md bg-primary hover:bg-[#2563EB] text-primary-foreground text-[12.5px] font-semibold shadow-[0_0_15px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_rgba(59,130,246,0.38)] transition-all duration-200"
                  >
                    <span className="flex items-center gap-1.5">
                      Resume Learning
                      <span className="font-[JetBrains_Mono] text-[10px] opacity-80 ml-1 tracking-wide">
                        {upNextChapter.topics.flatMap((t) => t.subtopics).length} NODES
                      </span>
                    </span>
                    <span className="material-symbols-outlined text-[18px] filled group-hover/btn:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {!subjectStats.hasData && (
            <div className="bg-surface-elevated border border-dashed border-surface-stroke rounded-xl p-5 text-center">
              <p className="text-[12.5px] text-text-secondary leading-[1.7] font-[Inter]">
                No mastery data yet. Complete a quiz to populate this subject.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StudentMastery } from '@/lib/db/schema';
import { Button, Progress } from '@/components/ui';
import { cn } from '@/lib/utils';

interface MasteryWithName extends StudentMastery {
  subtopicName?: string | null;
}

interface PriorityTopic {
  name: string;
  href: string;
  severity: 'critical' | 'warning' | 'scheduled';
  count: number;
  label: string;
}

const MOCK_PRIORITIES: PriorityTopic[] = [
  {
    name: 'Kinematics · Projectile Motion',
    href: '/learn/proj-motion-01',
    severity: 'critical',
    count: 3,
    label: 'Weak nodes',
  },
  {
    name: 'Organic Chemistry · SN1 vs SN2',
    href: '/learn/sn1-sn2-01',
    severity: 'warning',
    count: 2,
    label: 'Up for review',
  },
  {
    name: 'Calculus · Definite Integrals',
    href: '/learn/definite-integrals-01',
    severity: 'scheduled',
    count: 5,
    label: 'Scheduled in 24h',
  },
];

export default function MasteryHeatmap() {
  const [mastery, setMastery] = useState<MasteryWithName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    mastered: 0, needsReview: 0, weak: 0, dueForReview: 0, totalSubtopics: 0,
  });
  const [studyVelocity, setStudyVelocity] = useState({
    todayMin: 0, weeklyAvg: 0, trendDeltaPct: 0, streak: 0,
  });

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMastery(d.data.mastery);
          setStats(d.data.stats);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const todayMin = 47;
    const weeklyAvg = 62;
    const trendDeltaPct = 23;
    const streak = 14;
    setStudyVelocity({ todayMin, weeklyAvg, trendDeltaPct, streak });
  }, []);

  const colorMap: Record<string, string> = {
    NOT_STARTED: 'bg-surface-stroke hover:border-outline-variant/60',
    WEAK: 'bg-status-weak hover:border-status-weak',
    NEEDS_REVIEW: 'bg-status-review hover:border-status-review',
    MASTERED: 'bg-status-mastered hover:border-status-mastered',
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-[1200px] w-full mx-auto animate-pulse">
        <div className="h-20 bg-surface-elevated rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-elevated rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const globalReadiness = stats.totalSubtopics > 0
    ? Math.round((stats.mastered / stats.totalSubtopics) * 100)
    : 0;

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 md:gap-8 max-w-[1200px] w-full mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 border-b border-surface-stroke pb-6 md:pb-7">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.22em] uppercase text-text-secondary/80 mb-2">
            <span className="w-1 h-1 rounded-full bg-primary/80 pulse-dot" />
            Neural Core · Live Telemetry
          </div>
          <h2 className="font-[Geist] text-[36px] md:text-display-lg font-bold text-text-primary tracking-[-0.025em] leading-tight">
            System Status
          </h2>
          <p className="font-[Inter] text-body-lg text-on-surface-variant mt-2.5 max-w-2xl leading-[28px]">
            Real-time analysis of your JEE preparation. Prioritize due reviews to keep core concepts stable.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="secondary" size="md">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Generate Report
          </Button>
          <Button variant="primary" size="md">
            <span className="material-symbols-outlined text-[18px] filled">sync</span>
            Sync Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="group bg-surface-elevated border border-surface-stroke p-4 md:p-5 rounded-lg flex flex-col justify-between h-32 md:h-36 hover:border-status-mastered/60 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_4px_20px_rgba(16,185,129,0.04)] transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-text-secondary/80 group-hover:text-status-mastered transition-colors">Mastered</span>
            <span className="w-7 h-7 rounded-md bg-status-mastered/10 border border-status-mastered/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-status-mastered text-[16px] filled">verified</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-[Geist] text-[36px] font-bold text-status-mastered tracking-[-0.02em] leading-none">
              {stats.mastered}
            </span>
            <span className="font-[Inter] text-body-md text-text-secondary/80 mb-1">nodes</span>
          </div>
        </div>

        <div className="group bg-surface-elevated border border-surface-stroke p-4 md:p-5 rounded-lg flex flex-col justify-between h-32 md:h-36 hover:border-status-review/60 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.1),0_4px_20px_rgba(245,158,11,0.04)] transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-text-secondary/80 group-hover:text-status-review transition-colors">Needs Review</span>
            <span className="w-7 h-7 rounded-md bg-status-review/10 border border-status-review/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-status-review text-[16px] filled">warning</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-[Geist] text-[36px] font-bold text-status-review tracking-[-0.02em] leading-none">
              {stats.needsReview}
            </span>
            <span className="font-[Inter] text-body-md text-text-secondary/80 mb-1">nodes</span>
          </div>
        </div>

        <div className="group bg-surface-elevated border border-surface-stroke p-4 md:p-5 rounded-lg flex flex-col justify-between h-32 md:h-36 hover:border-status-weak/60 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.1),0_4px_20px_rgba(239,68,68,0.04)] transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-text-secondary/80 group-hover:text-status-weak transition-colors">Weak</span>
            <span className="w-7 h-7 rounded-md bg-status-weak/10 border border-status-weak/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-status-weak text-[16px] filled">error</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-[Geist] text-[36px] font-bold text-status-weak tracking-[-0.02em] leading-none">
              {stats.weak}
            </span>
            <span className="font-[Inter] text-body-md text-text-secondary/80 mb-1">nodes</span>
          </div>
        </div>

        <div className="group bg-surface-elevated border border-surface-stroke p-4 md:p-5 rounded-lg flex flex-col justify-between h-32 md:h-36 hover:border-primary/50 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_4px_20px_rgba(59,130,246,0.05)] transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-text-secondary/80 group-hover:text-primary transition-colors">Due Now</span>
            <span className="w-7 h-7 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px] filled">schedule</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-[Geist] text-[36px] font-bold text-primary tracking-[-0.02em] leading-none">
              {stats.dueForReview}
            </span>
            <span className="font-[Inter] text-body-md text-text-secondary/80 mb-1">tasks</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 mt-1">
        <div className="lg:col-span-8 bg-surface-elevated border border-surface-stroke p-5 md:p-6 rounded-xl flex flex-col">
          <div className="flex justify-between items-center mb-5 md:mb-6 gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <h3 className="font-[Geist] text-headline-sm font-semibold text-text-primary tracking-[-0.01em]">
                Mastery Topography
              </h3>
              <span className="px-2 py-0.5 rounded-sm border border-surface-stroke bg-surface-container text-[10px] font-[JetBrains_Mono] text-text-secondary tracking-wide">
                {mastery.length} NODES
              </span>
            </div>
            <div className="flex gap-4 font-[JetBrains_Mono] text-[10px] font-medium tracking-wider text-text-secondary">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-surface-stroke border border-outline-variant/30" /> Null</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-status-weak" /> Weak</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-status-review" /> Review</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-status-mastered" /> Mastered</div>
            </div>
          </div>

          <div className="flex-1 flex items-start justify-start py-4 md:py-6 overflow-x-auto min-h-[220px]">
            {mastery.length === 0 ? (
              <div className="text-text-secondary font-[JetBrains_Mono] text-[12px] m-auto px-6 py-4 rounded-lg border border-dashed border-surface-stroke">
                No mastery data yet. Complete quizzes to populate the heatmap.
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(20,12px)] gap-[3px]">
                {mastery.map((m) => {
                  const name = m.subtopicName || 'Unknown';
                  const score = Math.round(m.masteryScore ?? 0);
                  return (
                    <Link
                      key={m.id}
                      href={`/learn/${m.subtopicId}`}
                      className={cn(
                        'w-3 h-3 rounded-sm relative transition-all duration-200 hover:scale-[1.6] z-10 hover:z-20 border border-transparent hover:border-on-surface/30 block shadow-[0_0_0_0px_transparent] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
                        colorMap[m.status ?? 'NOT_STARTED']
                      )}
                      data-tip={`${name} · ${score}%`}
                      aria-label={`${name}, ${score} percent mastery`}
                      tabIndex={0}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 md:pt-5 border-t border-surface-stroke/80 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.18em] uppercase text-text-secondary/70">
                Physics {'>'} Mechanics
              </span>
              <span className="h-1 w-1 rounded-full bg-surface-stroke" />
              <span className="text-[11px] text-text-secondary/80 font-[JetBrains_Mono]">
                {stats.mastered} / {stats.totalSubtopics} mastered
              </span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <Progress
                value={globalReadiness}
                thickness="sm"
                track="container"
                className="w-40 md:w-52"
              />
              <span className="font-[JetBrains_Mono] text-[12px] font-bold text-primary tracking-wide shrink-0">
                {globalReadiness}% READY
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-5 md:gap-6">
          <div className="bg-gradient-to-br from-primary/[0.08] via-surface-elevated to-surface-elevated border border-primary/15 p-5 rounded-xl relative overflow-hidden group">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/[0.06] blur-2xl pointer-events-none group-hover:bg-primary/[0.1] transition-colors" />
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-1">
                    Study Velocity
                  </h3>
                  <p className="font-[Geist] text-[13px] text-text-secondary">
                    Momentum vs 7-day baseline
                  </p>
                </div>
                <span className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px] filled">
                    bolt
                  </span>
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-[Geist] text-[40px] font-bold text-text-primary tracking-[-0.02em] leading-none">
                  {studyVelocity.todayMin}
                </span>
                <span className="font-[Inter] text-[13px] text-text-secondary/80 mb-1">min today</span>
                <span
                  className={cn(
                    'ml-auto inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-[JetBrains_Mono] tracking-wide',
                    studyVelocity.trendDeltaPct >= 0
                      ? 'bg-status-mastered/10 text-status-mastered border border-status-mastered/15'
                      : 'bg-status-weak/10 text-status-weak border border-status-weak/15'
                  )}
                >
                  <span className="material-symbols-outlined text-[12px] filled">
                    {studyVelocity.trendDeltaPct >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {Math.abs(studyVelocity.trendDeltaPct)}%
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5 text-[11px]">
                    <span className="text-text-secondary">7-day avg</span>
                    <span className="text-on-surface font-[JetBrains_Mono] font-semibold">{studyVelocity.weeklyAvg} min</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (studyVelocity.todayMin / Math.max(studyVelocity.weeklyAvg * 1.5, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 mt-1 border-t border-surface-stroke/70">
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(studyVelocity.streak, 7) }).map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-md bg-primary/[0.08] border border-primary/20 flex items-center justify-center" />
                    ))}
                  </div>
                  <span className="text-[11px] text-text-secondary font-medium">
                    <span className="text-primary font-semibold">{studyVelocity.streak}-day</span> streak 🔥
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-elevated border border-surface-stroke p-5 rounded-xl flex-1 flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between mb-4 border-b border-surface-stroke pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-[Geist] text-headline-sm font-semibold text-text-primary tracking-[-0.01em]">
                  Active Priorities
                </h3>
              </div>
              <span className="text-[10px] font-[JetBrains_Mono] font-bold tracking-[0.18em] uppercase text-text-secondary/70">
                Triage
              </span>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {MOCK_PRIORITIES.length > 0 ? (
                MOCK_PRIORITIES.map((t, i) => {
                  const dotColor =
                    t.severity === 'critical'
                      ? 'bg-status-weak shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : t.severity === 'warning'
                        ? 'bg-status-review shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.45)]';
                  const rowHover =
                    t.severity === 'critical'
                      ? 'hover:border-status-weak/35 hover:bg-status-weak/[0.03]'
                      : t.severity === 'warning'
                        ? 'hover:border-status-review/35 hover:bg-status-review/[0.03]'
                        : 'hover:border-primary/35 hover:bg-primary/[0.03]';

                  return (
                    <li key={`${t.name}-${i}`}>
                      <Link
                        href={t.href}
                        className={cn(
                          'flex items-center gap-3 p-3 md:p-3.5 border border-surface-stroke rounded-lg transition-all duration-200 group',
                          rowHover
                        )}
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0 pulse-dot', dotColor)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-[Geist] text-[13px] font-semibold text-text-primary truncate tracking-[-0.005em]">
                            {t.name}
                          </p>
                          <p className="font-[Inter] text-[11.5px] text-text-secondary/85 mt-0.5">
                            <span className="font-semibold text-on-surface">{t.count}</span> {t.label}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 shrink-0 transition-all">
                          arrow_forward
                        </span>
                      </Link>
                    </li>
                  );
                })
              ) : (
                <li className="text-[12px] text-text-secondary p-3 leading-relaxed">
                  No urgent priorities. System is green.
                </li>
              )}

              {(stats.dueForReview > 0 || stats.weak > 0) && (
                <>
                  {stats.dueForReview > 0 && (
                    <li>
                      <Link
                        href="/review"
                        className="flex items-center gap-3 p-3 md:p-3.5 border border-surface-stroke rounded-lg hover:border-primary/35 hover:bg-primary/[0.03] transition-all duration-200 group"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                        <div className="flex-1">
                          <p className="font-[Geist] text-[13px] font-semibold text-text-primary">
                            Review Queue
                          </p>
                          <p className="font-[Inter] text-[11.5px] text-text-secondary/85 mt-0.5">
                            {stats.dueForReview} spaced repetition{' '}
                            {stats.dueForReview === 1 ? 'item' : 'items'} due.
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 shrink-0 transition-all">
                          arrow_forward
                        </span>
                      </Link>
                    </li>
                  )}
                  {stats.weak > 0 && (
                    <li>
                      <Link
                        href="/learn"
                        className="flex items-center gap-3 p-3 md:p-3.5 border border-surface-stroke rounded-lg hover:border-status-weak/35 hover:bg-status-weak/[0.03] transition-all duration-200 group"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-status-weak shrink-0" />
                        <div className="flex-1">
                          <p className="font-[Geist] text-[13px] font-semibold text-text-primary">
                            Weak Topics
                          </p>
                          <p className="font-[Inter] text-[11.5px] text-text-secondary/85 mt-0.5">
                            {stats.weak} {stats.weak === 1 ? 'topic' : 'topics'} below mastery.
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-text-secondary group-hover:text-status-weak group-hover:translate-x-0.5 shrink-0 transition-all">
                          arrow_forward
                        </span>
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

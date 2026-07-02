'use client';

import { useEffect, useState } from 'react';
import type { StudentMastery } from '@/lib/db/schema';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { BookOpen } from 'lucide-react';

interface MasteryWithName extends StudentMastery {
  subtopicName?: string;
}

export default function MasteryHeatmap() {
  const [mastery, setMastery] = useState<MasteryWithName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    mastered: 0, needsReview: 0, weak: 0, dueForReview: 0, totalSubtopics: 0,
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

  const colorMap: Record<string, string> = {
    NOT_STARTED: 'bg-[var(--mastery-not-started)]/60',
    WEAK: 'bg-[var(--mastery-weak)]/80',
    NEEDS_REVIEW: 'bg-[var(--mastery-learning)]/80',
    MASTERED: 'bg-[var(--mastery-mastered)]/80',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[90px]" />
          ))}
        </div>
        <Skeleton className="h-[140px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mastered', value: stats.mastered, color: 'text-[var(--mastery-mastered)]' },
          { label: 'Needs Review', value: stats.needsReview, color: 'text-[var(--mastery-learning)]' },
          { label: 'Weak', value: stats.weak, color: 'text-[var(--mastery-weak)]' },
          { label: 'Due for Review', value: stats.dueForReview, color: 'text-primary' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Mastery grid */}
      {mastery.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={BookOpen}
            title="No mastery data yet"
            description="Start learning a topic to track your progress and build your heatmap."
          />
        </Card>
      ) : (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground" aria-hidden="true">Topic Mastery Overview</h2>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Topic Mastery Heatmap">
            {mastery.map((m) => (
              <div
                key={m.id}
                role="listitem"
                className={`h-6 w-6 rounded-sm ${colorMap[m.status ?? 'NOT_STARTED']} cursor-default transition-transform hover:scale-110`}
                title={`Score: ${Math.round(m.masteryScore ?? 0)}% — ${m.status}`}
                aria-label={`Topic: ${m.subtopicName || 'Unknown'}, Score: ${Math.round(m.masteryScore ?? 0)}%, Status: ${m.status}`}
              />
            ))}
          </div>
          <div className="flex gap-4 text-[10px] text-muted-foreground mt-2" aria-hidden="true">
            {Object.entries(colorMap).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-[2px] ${color}`} />
                <span>{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

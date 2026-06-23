'use client';

import { useEffect, useState } from 'react';
import type { StudentMastery } from '@/lib/db/schema';

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
    NOT_STARTED: 'bg-muted',
    WEAK: 'bg-red-500/60',
    NEEDS_REVIEW: 'bg-amber-500/60',
    MASTERED: 'bg-green-500/60',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mastered', value: stats.mastered, color: 'text-green-500' },
          { label: 'Needs Review', value: stats.needsReview, color: 'text-amber-500' },
          { label: 'Weak', value: stats.weak, color: 'text-red-500' },
          { label: 'Due for Review', value: stats.dueForReview, color: 'text-blue-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mastery grid */}
      {mastery.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <p className="text-4xl mb-3">📚</p>
          <p>No mastery data yet. Start learning to track your progress!</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Topic Mastery Overview</h2>
          <div className="flex flex-wrap gap-2">
            {mastery.map((m) => (
              <div
                key={m.id}
                className={`h-8 w-8 rounded-md ${colorMap[m.status ?? 'NOT_STARTED']} cursor-pointer hover:scale-110 transition-transform`}
                title={`Score: ${Math.round(m.masteryScore ?? 0)}% — ${m.status}`}
              />
            ))}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            {Object.entries(colorMap).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <div className={`h-3 w-3 rounded-sm ${color}`} />
                <span>{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

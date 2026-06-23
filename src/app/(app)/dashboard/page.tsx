import { Suspense } from 'react';
import MasteryHeatmap from '@/components/dashboard/MasteryHeatmap';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your JEE preparation progress overview — mastery scores, weak topics, and review schedule.',
};

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your mastery across all JEE topics
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <MasteryHeatmap />
      </Suspense>
    </div>
  );
}

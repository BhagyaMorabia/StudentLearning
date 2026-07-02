import { Suspense } from 'react';
import MasteryHeatmap from '@/components/dashboard/MasteryHeatmap';
import { Skeleton } from '@/components/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your JEE preparation progress overview — mastery scores, weak topics, and review schedule.',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">Your Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your mastery across all JEE topics
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <Skeleton className="h-[90px]" />
             <Skeleton className="h-[90px]" />
             <Skeleton className="h-[90px]" />
             <Skeleton className="h-[90px]" />
          </div>
          <Skeleton className="h-[140px]" />
        </div>
      }>
        <MasteryHeatmap />
      </Suspense>
    </div>
  );
}

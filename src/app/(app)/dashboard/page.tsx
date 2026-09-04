import MasteryHeatmap from '@/components/dashboard/MasteryHeatmap';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your JEE preparation progress overview — mastery scores, weak topics, and review schedule.',
};

export default function DashboardPage() {
  return <MasteryHeatmap />;
}

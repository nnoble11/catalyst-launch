import { requireAuth } from '@/lib/auth';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export default async function AnalyticsPage() {
  await requireAuth();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics & Insights</h1>
        <p className="text-sm text-muted-foreground">
          Track your progress, identify patterns, and get AI-powered recommendations.
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}

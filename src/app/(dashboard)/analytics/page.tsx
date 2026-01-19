import { requireAuth } from '@/lib/auth';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export default async function AnalyticsPage() {
  await requireAuth();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics & Insights</h1>
        <p className="text-muted-foreground">
          Track your progress, identify patterns, and get AI-powered recommendations.
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}

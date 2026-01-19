import { createAnalyticsEvent, getAnalyticsEvents, getActivityHeatmap } from '@/lib/db/queries';
import type { AnalyticsEventType } from '@/config/constants';

export async function trackEvent(
  userId: string,
  eventType: AnalyticsEventType | string,
  eventData: Record<string, unknown> = {},
  projectId?: string,
  sessionId?: string
) {
  return createAnalyticsEvent({
    userId,
    projectId,
    eventType,
    eventData,
    sessionId,
  });
}

export async function trackPageView(
  userId: string,
  page: string,
  projectId?: string,
  sessionId?: string
) {
  return trackEvent(userId, 'page_view', { page }, projectId, sessionId);
}

export async function trackFeatureUse(
  userId: string,
  feature: string,
  action: string,
  projectId?: string,
  metadata?: Record<string, unknown>
) {
  return trackEvent(
    userId,
    'feature_use',
    { feature, action, ...metadata },
    projectId
  );
}

export async function trackAiInteraction(
  userId: string,
  interactionType: string,
  projectId?: string,
  metadata?: Record<string, unknown>
) {
  return trackEvent(
    userId,
    'ai_interaction',
    { interactionType, ...metadata },
    projectId
  );
}

export interface AnalyticsSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  dailyActivity: { date: string; count: number }[];
  topFeatures: { feature: string; count: number }[];
  recentEvents: {
    id: string;
    eventType: string;
    eventData: Record<string, unknown>;
    createdAt: Date;
  }[];
}

export async function getAnalyticsSummary(
  userId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
  }
): Promise<AnalyticsSummary> {
  const events = await getAnalyticsEvents(userId, {
    projectId: options?.projectId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    limit: 500,
  });

  // Count events by type
  const eventsByType: Record<string, number> = {};
  for (const event of events) {
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
  }

  // Count feature usage
  const featureUsage: Record<string, number> = {};
  for (const event of events) {
    if (event.eventType === 'feature_use') {
      const feature = (event.eventData as { feature?: string })?.feature || 'unknown';
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;
    }
  }

  const topFeatures = Object.entries(featureUsage)
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get daily activity
  const heatmapData = await getActivityHeatmap(userId, 30);

  return {
    totalEvents: events.length,
    eventsByType,
    dailyActivity: heatmapData,
    topFeatures,
    recentEvents: events.slice(0, 20),
  };
}

export async function getHeatmapData(userId: string, days = 365) {
  return getActivityHeatmap(userId, days);
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getAnalyticsSummary, getHeatmapData, trackEvent } from '@/services/analytics/tracker';
import { generatePredictions, getAiInsights } from '@/services/analytics/predictions';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary';
    const projectId = searchParams.get('projectId') || undefined;
    const days = parseInt(searchParams.get('days') || '30');

    if (view === 'heatmap') {
      const heatmapData = await getHeatmapData(user.id, days);
      return NextResponse.json({ success: true, data: heatmapData });
    }

    if (view === 'predictions') {
      const predictions = await generatePredictions(user.id);
      const insights = await getAiInsights(user.id, predictions);
      return NextResponse.json({
        success: true,
        data: { ...predictions, aiInsights: insights },
      });
    }

    // Default: summary view
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await getAnalyticsSummary(user.id, {
      startDate,
      projectId,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { eventType, eventData, projectId, sessionId } = body;

    if (!eventType) {
      return NextResponse.json(
        { success: false, error: 'eventType is required' },
        { status: 400 }
      );
    }

    const event = await trackEvent(
      user.id,
      eventType,
      eventData || {},
      projectId,
      sessionId
    );

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

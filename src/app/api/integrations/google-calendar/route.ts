import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  saveGoogleCalendarIntegration,
  listCalendarEvents,
  createFocusTimeBlock,
  createMilestoneReminder,
} from '@/services/integrations/google-calendar/client';
import { getIntegrationByProvider, deleteIntegration } from '@/lib/db/queries';
import { v4 as uuidv4 } from 'uuid';

// Get Google Calendar auth URL or connection status
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'auth') {
      const state = uuidv4();
      const authUrl = getGoogleAuthUrl(state);
      return NextResponse.json({ success: true, data: { authUrl, state } });
    }

    if (action === 'events') {
      const timeMin = searchParams.get('timeMin')
        ? new Date(searchParams.get('timeMin')!)
        : new Date();
      const timeMax = searchParams.get('timeMax')
        ? new Date(searchParams.get('timeMax')!)
        : undefined;

      const events = await listCalendarEvents(user.id, { timeMin, timeMax });
      return NextResponse.json({ success: true, data: events });
    }

    // Get connection status
    const integration = await getIntegrationByProvider(user.id, 'google_calendar');

    return NextResponse.json({
      success: true,
      data: {
        connected: !!integration,
        expiresAt: integration?.expiresAt || null,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/google-calendar error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Google Calendar status' },
      { status: 500 }
    );
  }
}

// OAuth callback or create events
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // OAuth callback
    if (body.code) {
      const { accessToken, refreshToken, expiresAt } = await exchangeGoogleCode(body.code);

      await saveGoogleCalendarIntegration(user.id, accessToken, refreshToken, expiresAt);

      return NextResponse.json({
        success: true,
        data: { connected: true },
      });
    }

    // Create focus time block
    if (body.action === 'focus_time') {
      const { title, startTime, durationMinutes, description } = body;

      if (!title || !startTime || !durationMinutes) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const event = await createFocusTimeBlock(
        user.id,
        title,
        new Date(startTime),
        durationMinutes,
        description
      );

      return NextResponse.json({ success: true, data: { event } });
    }

    // Create milestone reminder
    if (body.action === 'milestone_reminder') {
      const { milestoneName, dueDate, projectName } = body;

      if (!milestoneName || !dueDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const event = await createMilestoneReminder(
        user.id,
        milestoneName,
        new Date(dueDate),
        projectName
      );

      return NextResponse.json({ success: true, data: { event } });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/google-calendar error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process Google Calendar request' },
      { status: 500 }
    );
  }
}

// Disconnect
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const integration = await getIntegrationByProvider(user.id, 'google_calendar');
    if (integration) {
      await deleteIntegration(integration.id);
    }

    return NextResponse.json({ success: true, data: { disconnected: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/integrations/google-calendar error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}

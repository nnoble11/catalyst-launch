import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getSlackAuthUrl,
  exchangeSlackCode,
  saveSlackIntegration,
} from '@/services/integrations/slack/client';
import { getIntegrationByProvider, deleteIntegration } from '@/lib/db/queries';
import { v4 as uuidv4 } from 'uuid';

// Get Slack auth URL or connection status
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'auth') {
      const state = uuidv4();
      const authUrl = getSlackAuthUrl(state);
      return NextResponse.json({ success: true, data: { authUrl, state } });
    }

    // Get connection status
    const integration = await getIntegrationByProvider(user.id, 'slack');

    return NextResponse.json({
      success: true,
      data: {
        connected: !!integration,
        metadata: integration?.metadata || null,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/slack error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Slack status' },
      { status: 500 }
    );
  }
}

// OAuth callback
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const { accessToken, teamId, teamName, userId: slackUserId } = await exchangeSlackCode(code);

    await saveSlackIntegration(user.id, accessToken, {
      teamId,
      teamName,
      slackUserId,
    });

    return NextResponse.json({
      success: true,
      data: { connected: true, teamName },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/slack error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect Slack' },
      { status: 500 }
    );
  }
}

// Disconnect
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const integration = await getIntegrationByProvider(user.id, 'slack');
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
    console.error('DELETE /api/integrations/slack error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Slack' },
      { status: 500 }
    );
  }
}

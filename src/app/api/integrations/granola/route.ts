import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getIntegrationByProvider,
  upsertIntegration,
  deleteIntegration,
  getSyncStateByProvider,
} from '@/lib/db/queries';
import granolaIntegration from '@/services/integrations/granola/client';

/**
 * GET /api/integrations/granola
 * Get Granola connection status
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const integration = await getIntegrationByProvider(user.id, 'granola');
    const syncState = integration
      ? await getSyncStateByProvider(user.id, 'granola')
      : null;

    if (!integration) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
        },
      });
    }

    // Get account info
    let accountInfo = null;
    try {
      accountInfo = await granolaIntegration.getAccountInfo({
        accessToken: integration.accessToken,
      });
    } catch {
      // Token might be invalid
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        accountInfo,
        syncState: syncState
          ? {
              status: syncState.status,
              lastSyncAt: syncState.lastSyncAt,
              totalItemsSynced: syncState.totalItemsSynced,
              error: syncState.lastError,
            }
          : null,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/granola error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Granola status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/granola
 * Connect Granola with API key
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Validate the API key
    const isValid = await granolaIntegration.validateApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 400 }
      );
    }

    // Get account info
    const accountInfo = await granolaIntegration.getAccountInfo({
      accessToken: apiKey,
    });

    // Save the integration
    await upsertIntegration({
      userId: user.id,
      provider: 'granola',
      accessToken: apiKey,
      metadata: accountInfo,
    });

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        accountInfo,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/granola error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect Granola' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/granola
 * Disconnect Granola
 */
export async function DELETE() {
  try {
    const user = await requireAuth();
    const integration = await getIntegrationByProvider(user.id, 'granola');

    if (integration) {
      await deleteIntegration(integration.id);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/integrations/granola error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Granola' },
      { status: 500 }
    );
  }
}

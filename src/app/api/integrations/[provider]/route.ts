import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getIntegrationByProvider,
  deleteIntegration,
  getSyncStateByProvider,
} from '@/lib/db/queries';
import { integrationRegistry } from '@/services/integrations';
import { normalizeProviderId } from '@/config/integrations';

/**
 * GET /api/integrations/[provider]
 * Get integration status and details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const user = await requireAuth();
    const { provider: providerSlug } = await params;

    // Normalize URL slug to provider ID
    const provider = normalizeProviderId(providerSlug);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Validate provider
    const definition = integrationRegistry.getDefinition(provider);
    if (!definition) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Get integration status
    const integration = await getIntegrationByProvider(user.id, provider);

    if (!integration) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          definition,
        },
      });
    }

    // Get sync state
    const syncState = await getSyncStateByProvider(user.id, provider);

    // Get account info if connected
    let accountInfo = integration.metadata || {};
    let accountInfoStale = false;
    const integrationInstance = integrationRegistry.get(provider);

    if (integrationInstance) {
      try {
        accountInfo = await integrationInstance.getAccountInfo({
          accessToken: integration.accessToken,
          refreshToken: integration.refreshToken ?? undefined,
          expiresAt: integration.expiresAt ?? undefined,
        });
      } catch (e) {
        // Use cached metadata if fetching fails
        accountInfoStale = true;
        console.error('Failed to fetch account info:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        definition,
        accountInfo,
        accountInfoStale,
        syncState: syncState
          ? {
              status: syncState.status,
              lastSyncAt: syncState.lastSyncAt,
              lastSuccessfulSyncAt: syncState.lastSuccessfulSyncAt,
              totalItemsSynced: syncState.totalItemsSynced,
              errorCount: syncState.errorCount,
              lastError: syncState.lastError,
            }
          : null,
        createdAt: integration.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/[provider] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get integration status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/[provider]
 * Disconnect an integration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const user = await requireAuth();
    const { provider: providerSlug } = await params;

    // Normalize URL slug to provider ID
    const provider = normalizeProviderId(providerSlug);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Get integration
    const integration = await getIntegrationByProvider(user.id, provider);

    if (!integration) {
      return NextResponse.json({
        success: true,
        message: 'Integration not connected',
      });
    }

    // Delete integration (cascades to sync state, ingested items, webhooks)
    await deleteIntegration(integration.id);

    return NextResponse.json({
      success: true,
      message: 'Integration disconnected',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/integrations/[provider] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}

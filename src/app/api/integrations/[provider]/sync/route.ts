import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { integrationSyncService, integrationRegistry } from '@/services/integrations';
import { normalizeProviderId } from '@/config/integrations';

/**
 * POST /api/integrations/[provider]/sync
 * Trigger a sync for an integration
 */
export async function POST(
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

    // Parse options from request body if provided
    let options;
    try {
      const body = await request.json();
      options = {
        fullSync: body.fullSync,
        limit: body.limit,
        since: body.since ? new Date(body.since) : undefined,
      };
    } catch {
      // No body or invalid JSON - use defaults
      options = undefined;
    }

    // Trigger sync
    const result = await integrationSyncService.syncIntegration(
      user.id,
      provider,
      options
    );

    return NextResponse.json({
      success: result.success,
      data: {
        provider: result.provider,
        itemsProcessed: result.itemsProcessed,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
        itemsSkipped: result.itemsSkipped,
        itemsFailed: result.itemsFailed,
        hasMore: result.hasMore,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/[provider]/sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync integration' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/[provider]/sync
 * Get sync status for an integration
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

    const { getSyncStateByProvider } = await import('@/lib/db/queries');
    const syncState = await getSyncStateByProvider(user.id, provider);

    if (!syncState) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: syncState.status,
        lastSyncAt: syncState.lastSyncAt,
        lastSuccessfulSyncAt: syncState.lastSuccessfulSyncAt,
        nextSyncAt: syncState.nextSyncAt,
        totalItemsSynced: syncState.totalItemsSynced,
        errorCount: syncState.errorCount,
        lastError: syncState.lastError,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/[provider]/sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

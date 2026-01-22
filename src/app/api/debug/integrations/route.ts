import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getIntegrationsByUserId,
  getSyncStatesByUserId,
  getIngestedItemsByUserId,
  getIntegrationStats,
} from '@/lib/db/queries';

/**
 * GET /api/debug/integrations
 * Debug endpoint to view integration data (development only in production, always in dev)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || undefined;
    const includeItems = searchParams.get('includeItems') === 'true';
    const itemLimit = parseInt(searchParams.get('itemLimit') || '20', 10);

    // Fetch integrations
    const integrations = await getIntegrationsByUserId(user.id);

    // Fetch sync states
    const syncStates = await getSyncStatesByUserId(user.id);

    // Fetch stats
    const stats = await getIntegrationStats(user.id, provider as 'github' | 'stripe' | 'gmail' | 'notion' | 'slack' | 'google_calendar' | undefined);

    // Optionally fetch ingested items
    let ingestedItems: Awaited<ReturnType<typeof getIngestedItemsByUserId>> = [];
    if (includeItems) {
      ingestedItems = await getIngestedItemsByUserId(user.id, {
        provider: provider as 'github' | 'stripe' | 'gmail' | 'notion' | 'slack' | 'google_calendar' | undefined,
        limit: itemLimit,
      });
    }

    // Build response with sanitized data (remove tokens)
    const sanitizedIntegrations = integrations.map((i) => ({
      id: i.id,
      provider: i.provider,
      metadata: i.metadata,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      hasAccessToken: !!i.accessToken,
      hasRefreshToken: !!i.refreshToken,
      expiresAt: i.expiresAt,
    }));

    const sanitizedSyncStates = syncStates.map((s) => ({
      id: s.id,
      provider: s.provider,
      status: s.status,
      lastSyncAt: s.lastSyncAt,
      lastSuccessfulSyncAt: s.lastSuccessfulSyncAt,
      nextSyncAt: s.nextSyncAt,
      totalItemsSynced: s.totalItemsSynced,
      itemsSyncedThisRun: s.itemsSyncedThisRun,
      errorCount: s.errorCount,
      lastError: s.lastError,
      lastErrorAt: s.lastErrorAt,
    }));

    const sanitizedItems = ingestedItems.map((item) => ({
      id: item.id,
      provider: item.provider,
      itemType: item.itemType,
      title: item.title,
      content: item.content?.substring(0, 200) + (item.content && item.content.length > 200 ? '...' : ''),
      status: item.status,
      sourceUrl: item.sourceUrl,
      createdAt: item.createdAt,
      processedAt: item.processedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        integrations: sanitizedIntegrations,
        syncStates: sanitizedSyncStates,
        stats,
        items: includeItems ? sanitizedItems : 'Use ?includeItems=true to see items',
        itemCount: ingestedItems.length,
        totalIntegrations: integrations.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/debug/integrations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}

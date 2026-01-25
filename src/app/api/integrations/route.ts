import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getIntegrationsByUserId, getSyncStatesByUserId } from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await requireAuth();
    const [integrations, syncStates] = await Promise.all([
      getIntegrationsByUserId(user.id),
      getSyncStatesByUserId(user.id),
    ]);

    // Create a map of sync states by integration ID
    const syncStateMap = new Map(
      syncStates.map((s) => [s.integrationId, s])
    );

    // Don't return sensitive tokens, but include sync state
    const safeIntegrations = integrations.map((i) => {
      const syncState = syncStateMap.get(i.id);
      return {
        id: i.id,
        provider: i.provider,
        metadata: i.metadata,
        createdAt: i.createdAt,
        lastSyncAt: syncState?.lastSyncAt,
        lastSuccessfulSyncAt: syncState?.lastSuccessfulSyncAt,
        syncStatus: syncState?.status,
        syncError: syncState?.lastError,
        totalItemsSynced: syncState?.totalItemsSynced,
      };
    });

    return NextResponse.json({ success: true, data: safeIntegrations });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
